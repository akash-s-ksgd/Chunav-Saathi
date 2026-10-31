"""Quality and promotion gates for an electoral-roll batch."""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .normalizer import normalize_gender, parse_integer
from .pdf_inspector import sha256_file


EPIC_PATTERN = re.compile(r"^[A-Z]{3}[0-9]{7}$")
REQUIRED_PROVENANCE = (
    "state", "district", "assembly_constituency", "assembly_constituency_number",
    "polling_part_number", "roll_year", "roll_revision", "source_pdf",
    "source_pdf_sha256", "source_page",
)


def validate_epic_format(value: str | None) -> bool:
    if value is None:
        return False
    return EPIC_PATTERN.fullmatch("".join(str(value).split()).upper()) is not None


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows = []
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if line.strip():
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError as error:
                    raise ValueError("Invalid JSONL at line {}".format(line_number)) from error
    return rows


def _validate_records(records: list[dict[str, Any]]) -> dict[str, Any]:
    errors = []
    warnings = []
    duplicates = []
    seen = set()
    review_count = 0
    unreadable_count = 0
    confidence_values = []
    field_totals: Counter[str] = Counter()
    field_extracted: Counter[str] = Counter()
    per_part: dict[str, Counter[str]] = defaultdict(Counter)

    for index, record in enumerate(records, start=1):
        part = str(record.get("polling_part_number") or "unknown")
        if record.get("needs_manual_review", True):
            review_count += 1
            per_part[part]["needs_manual_review"] += 1
        if record.get("ocr_confidence") is not None:
            confidence_values.append(float(record["ocr_confidence"]))

        for field in REQUIRED_PROVENANCE:
            if record.get(field) in (None, ""):
                errors.append({"record_index": index, "code": "missing_provenance", "field": field})

        serial = record.get("serial_number")
        if serial is not None and (not isinstance(serial, int) or serial < 1):
            errors.append({"record_index": index, "code": "invalid_serial_number"})

        epic = record.get("epic_number")
        if epic and not validate_epic_format(str(epic)):
            warnings.append({"record_index": index, "code": "epic_format_unusual"})

        age = record.get("age")
        if age is not None and (not isinstance(age, int) or not 18 <= age <= 120):
            warnings.append({"record_index": index, "code": "age_outside_plausible_range"})

        gender_original = record.get("gender_original")
        if gender_original and record.get("gender") != normalize_gender(gender_original):
            warnings.append({"record_index": index, "code": "gender_normalization_unrecognized"})

        field_status = record.get("field_status") or {}
        for field, status in field_status.items():
            field_totals[field] += 1
            if status == "extracted":
                field_extracted[field] += 1
            if status == "unreadable":
                unreadable_count += 1
                per_part[part]["unreadable_fields"] += 1

        source_hash = record.get("source_pdf_sha256")
        source_page = record.get("source_page")
        duplicate_key = (source_hash, record.get("serial_number")) if record.get("serial_number") is not None else None
        if duplicate_key and duplicate_key in seen:
            duplicates.append({"record_index": index, "source_page": source_page, "code": "duplicate_source_serial"})
        elif duplicate_key:
            seen.add(duplicate_key)

    quality = {
        field: {
            "observed": field_totals[field],
            "extracted": field_extracted[field],
            "extraction_rate": round(field_extracted[field] / field_totals[field], 4) if field_totals[field] else None,
        }
        for field in sorted(field_totals)
    }
    confidence_distribution = {
        "count": len(confidence_values),
        "min": round(min(confidence_values), 2) if confidence_values else None,
        "median": round(sorted(confidence_values)[len(confidence_values) // 2], 2) if confidence_values else None,
        "mean": round(sum(confidence_values) / len(confidence_values), 2) if confidence_values else None,
        "under_75": sum(value < 75 for value in confidence_values),
    }
    return {
        "total_detected_elector_boxes": len(records),
        "total_extracted_records": len(records),
        "valid_records": max(0, len(records) - len(errors)),
        "records_requiring_manual_review": review_count,
        "unreadable_record_fields": unreadable_count,
        "duplicate_records": len(duplicates),
        "errors": errors,
        "warnings": warnings,
        "duplicate_details": duplicates,
        "ocr_confidence_distribution": confidence_distribution,
        "field_extraction_quality": quality,
        "record_quality_by_part": {part: dict(counts) for part, counts in per_part.items()},
    }


def _verify_sources(source_manifest: dict[str, Any], input_dir: Path) -> dict[str, Any]:
    files = source_manifest.get("files", [])
    missing_or_changed = []
    for entry in files:
        source = input_dir / entry["original_filename"]
        if not source.is_file() or sha256_file(source) != entry.get("sha256"):
            missing_or_changed.append(entry["original_filename"])
    hash_counts = Counter(entry.get("sha256") for entry in files)
    duplicate_count = sum(count - 1 for count in hash_counts.values() if count > 1)
    observed_parts = sorted({
        entry.get("filename_metadata", {}).get("polling_part_number")
        for entry in files
        if entry.get("filename_metadata", {}).get("polling_part_number") is not None
    })
    evidence_path = input_dir.parent.parent.parent.parent / "staging" / "belthangady" / "coverage_evidence.json"
    if evidence_path.exists():
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
        expected_parts = sorted(set(evidence.get("expected_polling_part_numbers", [])))
        coverage_reference = evidence.get("source_reference")
    else:
        expected_parts = []
        coverage_reference = None
    coverage_complete = bool(expected_parts and set(expected_parts) == set(observed_parts) and coverage_reference)
    return {
        "source_pdf_count": len(files),
        "expected_source_pdf_count": source_manifest.get("expected_source_pdf_count", 11),
        "all_source_files_accounted_for": len(files) == source_manifest.get("expected_source_pdf_count", 11),
        "unique_source_pdf_count": len(hash_counts),
        "duplicate_source_pdf_count": duplicate_count,
        "no_duplicate_source_files": duplicate_count == 0,
        "all_checksums_match": not missing_or_changed,
        "missing_or_changed_sources": missing_or_changed,
        "observed_polling_part_numbers": observed_parts,
        "expected_polling_part_numbers": expected_parts,
        "coverage_evidence_reference": coverage_reference,
        "coverage_complete": coverage_complete,
    }


def _manual_comparison_gate(path: Path, expected_source_count: int) -> dict[str, Any]:
    verified = []
    if path.exists():
        with path.open(encoding="utf-8-sig", newline="") as source:
            for row in csv.DictReader(source):
                if str(row.get("human_verified", "")).strip().casefold() in {"yes", "true", "1"}:
                    verified.append(row)
    verified_sources = {row.get("source_pdf") for row in verified if row.get("source_pdf")}
    verified_pages = {(row.get("source_pdf"), row.get("source_page")) for row in verified}
    min_source_count = min(10, expected_source_count)
    return {
        "verified_record_count": len(verified),
        "verified_source_pdf_count": len(verified_sources),
        "verified_source_page_count": len(verified_pages),
        "required_verified_record_count": 50,
        "required_verified_source_pdf_count": min_source_count,
        "required_verified_source_page_count": min(25, 50),
        "passed": (
            len(verified) >= 50
            and len(verified_sources) >= min_source_count
            and len(verified_pages) >= min(25, len(verified))
        ),
    }


def validate_batch(input_dir: Path, staging_dir: Path) -> dict[str, Any]:
    source_manifest_path = staging_dir / "source_manifest.json"
    extraction_path = staging_dir / "extraction_report.json"
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    extraction = json.loads(extraction_path.read_text(encoding="utf-8")) if extraction_path.exists() else {}
    records = load_jsonl(staging_dir / "records.jsonl")
    source_validation = _verify_sources(source_manifest, input_dir)
    record_validation = _validate_records(records)

    part_reconciliation = []
    for part in extraction.get("parts", []):
        expected = part.get("expected_elector_count")
        extracted = part.get("extracted_records", 0)
        part_reconciliation.append({
            "polling_part_number": part.get("polling_part_number"),
            "expected_records": expected,
            "extracted_records": extracted,
            "difference": expected - extracted if expected is not None else None,
            "reconciled": expected is not None and expected == extracted,
            "unreadable_pages": sum(
                page.get("source_pdf") == part.get("source_pdf")
                for page in extraction.get("unreadable_pages", [])
            ),
            "ocr_failures": sum(
                page.get("source_pdf") == part.get("source_pdf")
                for page in extraction.get("ocr_failures", [])
            ),
        })

    manual = _manual_comparison_gate(staging_dir / "manual_review.csv", source_validation["unique_source_pdf_count"])
    reconciliation_passed = bool(part_reconciliation) and all(item["reconciled"] for item in part_reconciliation)
    extraction_complete = extraction.get("status") == "completed" and extraction.get("unprocessed_pages", 1) == 0
    source_gates_passed = (
        source_validation["all_source_files_accounted_for"]
        and source_validation["no_duplicate_source_files"]
        and source_validation["all_checksums_match"]
        and source_validation["coverage_complete"]
    )
    ready = (
        extraction_complete
        and source_gates_passed
        and reconciliation_passed
        and manual["passed"]
        and not record_validation["errors"]
        and record_validation["duplicate_records"] == 0
        and record_validation["records_requiring_manual_review"] == 0
    )

    return {
        "schema_version": 1,
        "status": "ready_for_import" if ready else "blocked",
        "ready_for_import": ready,
        "total_source_pdfs": source_validation["source_pdf_count"],
        "total_pages": extraction.get("total_pages", sum(item.get("page_count", 0) for item in source_manifest.get("files", []) if not item.get("duplicate_content"))),
        "total_detected_elector_boxes": record_validation["total_detected_elector_boxes"],
        "total_extracted_records": record_validation["total_extracted_records"],
        "valid_records": record_validation["valid_records"],
        "records_requiring_manual_review": record_validation["records_requiring_manual_review"],
        "unreadable_records": record_validation["unreadable_record_fields"],
        "duplicate_records": record_validation["duplicate_records"],
        "source_validation": source_validation,
        "part_reconciliation": part_reconciliation,
        "manual_comparison_gate": manual,
        "ocr_confidence_distribution": record_validation["ocr_confidence_distribution"],
        "field_extraction_quality": record_validation["field_extraction_quality"],
        "record_errors": record_validation["errors"],
        "record_warnings": record_validation["warnings"],
        "extraction_status": extraction.get("status", "not_run"),
        "unreadable_pages": extraction.get("unreadable_pages", []),
        "ocr_failures": extraction.get("ocr_failures", []),
        "promotion_blockers": _promotion_blockers(
            extraction_complete, source_gates_passed, reconciliation_passed,
            manual["passed"], record_validation,
        ),
    }


def _promotion_blockers(extraction_complete: bool, source_gates: bool, reconciled: bool, manual: bool, records: dict[str, Any]) -> list[str]:
    blockers = []
    if not extraction_complete:
        blockers.append("OCR extraction is not complete")
    if not source_gates:
        blockers.append("Source integrity, duplicate-file, or constituency coverage gate failed")
    if not reconciled:
        blockers.append("Printed totals are missing or extracted counts do not reconcile")
    if not manual:
        blockers.append("At least 50 distributed manual record comparisons are required")
    if records["errors"]:
        blockers.append("Record validation errors remain")
    if records["duplicate_records"]:
        blockers.append("Duplicate source-aware records were detected")
    if records["records_requiring_manual_review"]:
        blockers.append("Records still require manual review")
    return blockers