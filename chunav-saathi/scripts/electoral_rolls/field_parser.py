"""Conservative parser for elector-card OCR; unknown values remain null."""

from __future__ import annotations

import re
from typing import Any

from .normalizer import clean_value, field_state, normalize_digits, normalize_gender, parse_integer


LABELS = {
    "elector_name_native": r"(?:Name|Elector(?:'s)? Name|ಹೆಸರು)",
    "relative_name_native": r"(?:Father(?:'s)? Name|Husband(?:'s)? Name|Mother(?:'s)? Name|Relation(?:ship)? Name|ತಂದೆಯ ಹೆಸರು|ಪತಿಯ ಹೆಸರು|ತಾಯಿಯ ಹೆಸರು)",
    "house_number": r"(?:House(?:\s*(?:No|Number))?|H\.?\s*No\.?|ಮನೆ ಸಂಖ್ಯೆ)",
    "age": r"(?:Age|ವಯಸ್ಸು)",
    "gender": r"(?:Gender|Sex|ಲಿಂಗ)",
    "serial_number": r"(?:Serial(?:\s*(?:No|Number))?|Sl\.?\s*No\.?|ಕ್ರಮ ಸಂಖ್ಯೆ)",
}
EPIC_PATTERN = re.compile(r"\b([A-Z]{3}\s*\d{7})\b", re.IGNORECASE)
RELATION_TYPE_PATTERN = re.compile(
    r"(Father(?:'s)? Name|Husband(?:'s)? Name|Mother(?:'s)? Name|ತಂದೆಯ ಹೆಸರು|ಪತಿಯ ಹೆಸರು|ತಾಯಿಯ ಹೆಸರು)",
    re.IGNORECASE,
)


def _label_value(text: str, label_pattern: str) -> tuple[bool, str | None]:
    match = re.search(r"(?:^|\n)\s*" + label_pattern + r"\s*[:：-]?\s*([^\n]*)", text, re.IGNORECASE)
    return (match is not None, clean_value(match.group(1)) if match else None)


def parse_elector_card(
    raw_ocr_text: str,
    *,
    metadata: dict[str, Any],
    source_pdf: str,
    source_pdf_sha256: str,
    source_page: int,
    record_index: int,
    ocr_confidence: float | None,
    extraction_version: str,
) -> dict[str, Any]:
    text = normalize_digits(raw_ocr_text)
    record: dict[str, Any] = {
        "state": metadata.get("state", "Karnataka"),
        "district": metadata.get("district"),
        "assembly_constituency": metadata.get("assembly_constituency"),
        "assembly_constituency_number": metadata.get("assembly_constituency_number"),
        "polling_part_number": metadata.get("polling_part_number"),
        "polling_station_name": metadata.get("polling_station_name"),
        "roll_year": metadata.get("roll_year"),
        "roll_revision": metadata.get("roll_revision"),
        "roll_section": metadata.get("roll_section"),
        "serial_number": None,
        "epic_number": None,
        "elector_name_native": None,
        "elector_name_english": None,
        "relative_name_native": None,
        "relative_name_english": None,
        "relationship_type": None,
        "house_number": None,
        "age": None,
        "gender": None,
        "gender_original": None,
        "source_pdf": source_pdf,
        "source_pdf_sha256": source_pdf_sha256,
        "source_page": source_page,
        "extraction_version": extraction_version,
        "record_index_on_page": record_index,
        "raw_ocr_text": raw_ocr_text,
        "ocr_confidence": ocr_confidence,
        "field_confidence": {},
        "field_status": {},
        "needs_manual_review": True,
    }

    for field, pattern in LABELS.items():
        label_seen, value = _label_value(text, pattern)
        record["field_status"][field] = field_state(label_seen, value, ocr_confidence)
        record["field_confidence"][field] = ocr_confidence if value else None
        if field == "age":
            record[field] = parse_integer(value)
        elif field == "gender":
            record["gender_original"] = value
            record[field] = normalize_gender(value)
        elif field == "serial_number":
            record[field] = parse_integer(value)
        else:
            record[field] = value

    epic_match = EPIC_PATTERN.search(text)
    epic_label_seen = bool(re.search(r"\bEPIC\b|Elector Photo|ವೋಟರ್ ಗುರುತಿನ", text, re.IGNORECASE))
    record["epic_number"] = re.sub(r"\s+", "", epic_match.group(1)).upper() if epic_match else None
    record["field_status"]["epic_number"] = field_state(
        epic_label_seen or epic_match is not None,
        record["epic_number"],
        ocr_confidence,
    )
    record["field_confidence"]["epic_number"] = ocr_confidence if epic_match else None

    relation_match = RELATION_TYPE_PATTERN.search(text)
    if relation_match:
        relation_label = relation_match.group(1).casefold()
        record["relationship_type"] = (
            "father" if "father" in relation_label or "ತಂದೆ" in relation_label
            else "mother" if "mother" in relation_label or "ತಾಯಿ" in relation_label
            else "husband" if "husband" in relation_label or "ಪತಿ" in relation_label
            else None
        )

    has_name = bool(record["elector_name_native"] or record["elector_name_english"])
    record["needs_manual_review"] = (
        ocr_confidence is None
        or ocr_confidence < 75
        or record["serial_number"] is None
        or not has_name
        or record["age"] is None
        or record["gender"] is None
    )

    return record


def parse_cover_metadata(text: str) -> dict[str, Any]:
    """Extract only explicit cover-sheet fields; no values are inferred."""
    normalized = normalize_digits(text)
    patterns = {
        "assembly_constituency": r"Assembly Constituency\s*[:;,.]\s*\d+\s*[;,.:-]?\s*([^\n(]+)",
        "assembly_constituency_number": r"Assembly Constituency\s*[:;,.]\s*(\d+)\s*[;,.:-]?",
        "district": r"District\s*[:;,.]?\s*([^\n]+)",
        "polling_station_name": r"No\W*and\W+Name\W+of\W+Polling\W+Station[^\n]*GENERAL\s*\n\s*\d+\s*[=:-]?\s*([^\n]+)",
        "polling_part_number": r"Part\s*No\.?\s*:\s*(\d+)",
        "roll_year": r"Year[- ]of Revision\s*[:;,.]?\s*(\d{4})",
        "qualifying_date": r"Qualifying Date\s+(\d{2}[-/]\d{2}[-/]\d{4})",
        "revision_type": r"Type of revision\s+([^\n]+)",
        "date_of_update": r"Date of Updat(?:e|ion)\s*:?\s*(\d{2}[-/]\d{2}[-/]\d{4})",
    }
    result: dict[str, Any] = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, normalized, re.IGNORECASE)
        if match:
            value = clean_value(match.group(1))
            if field in {
                "assembly_constituency_number", "polling_part_number", "roll_year",
                "starting_serial_number", "ending_serial_number", "male_electors",
                "female_electors", "third_gender_electors", "total_electors",
            }:
                result[field] = parse_integer(value)
            else:
                result[field] = value

    result["supplementary_additions_present"] = bool(
        re.search(r"list\W+of\W+additions|additions\W+of\W+continuous", normalized, re.IGNORECASE)
    )
    result["supplementary_deletions_present"] = bool(
        re.search(r"list\W+of\W+deletions|deletions\W+of\W+continuous", normalized, re.IGNORECASE)
    )

    table_match = re.search(r"NUMBER\W*OF\W*ELECTORS(?P<table>.*?)(?:Signature\W+of\W+Electoral|$)", normalized, re.IGNORECASE | re.DOTALL)
    if table_match:
        table = table_match.group("table")
        values = re.findall(r"\d+", table)
        if len(values) >= 6:
            (
                result["starting_serial_number"],
                result["ending_serial_number"],
                result["male_electors"],
                result["female_electors"],
                result["third_gender_electors"],
                result["total_electors"],
            ) = (int(value) for value in values[-6:])
    return result