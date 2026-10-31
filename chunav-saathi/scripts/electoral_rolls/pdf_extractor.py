"""Resumable, local-only PDF OCR extraction."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pandas as pd
import pymupdf

from .field_parser import parse_cover_metadata, parse_elector_card
from .ocr_engine import configure_tesseract, detect_grid_boxes, ocr_image, render_page
from .pdf_inspector import sha256_file


EXTRACTION_VERSION = "0.1.0"
RECORD_COLUMNS = [
    "state", "district", "assembly_constituency", "assembly_constituency_number",
    "polling_part_number", "polling_station_name", "roll_year", "roll_revision",
    "roll_section", "serial_number", "epic_number", "elector_name_native",
    "elector_name_english", "relative_name_native", "relative_name_english",
    "relationship_type", "house_number", "age", "gender", "gender_original",
    "source_pdf", "source_pdf_sha256", "source_page", "ocr_confidence",
    "field_confidence", "field_status", "needs_manual_review", "raw_ocr_text",
    "extraction_version", "record_index_on_page",
]


def _atomic_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def _part_metadata(entry: dict[str, Any]) -> dict[str, Any]:
    filename = entry.get("filename_metadata", {})
    cover = entry.get("cover_metadata", {})
    return {
        "state": "Karnataka",
        "district": cover.get("district"),
        "assembly_constituency": cover.get("assembly_constituency"),
        "assembly_constituency_number": cover.get("assembly_constituency_number", filename.get("assembly_constituency_number")),
        "polling_part_number": cover.get("polling_part_number", filename.get("polling_part_number")),
        "polling_station_name": cover.get("polling_station_name"),
        "roll_year": cover.get("roll_year", filename.get("roll_year")),
        "roll_revision": cover.get("roll_revision", filename.get("roll_revision")),
        "roll_section": None,
    }


def _parse_card_text(text: str, metadata: dict[str, Any], entry: dict[str, Any], page: int, index: int, confidence: float | None) -> dict[str, Any]:
    return parse_elector_card(
        text,
        metadata=metadata,
        source_pdf=entry["original_filename"],
        source_pdf_sha256=entry["sha256"],
        source_page=page,
        record_index=index,
        ocr_confidence=confidence,
        extraction_version=EXTRACTION_VERSION,
    )


def _matching_conflicts(filename_metadata: dict[str, Any], cover_metadata: dict[str, Any]) -> list[dict[str, Any]]:
    comparison = {
        "assembly_constituency_number": "assembly_constituency_number",
        "polling_part_number": "polling_part_number",
        "roll_year": "roll_year",
        "roll_revision": "roll_revision",
    }
    return [
        {"field": field, "filename_candidate": filename_metadata.get(field), "document_value": cover_metadata.get(document_field)}
        for field, document_field in comparison.items()
        if filename_metadata.get(field) is not None
        and cover_metadata.get(document_field) is not None
        and filename_metadata[field] != cover_metadata[document_field]
    ]


def extract_batch(
    source_manifest_path: Path,
    input_dir: Path,
    output_dir: Path,
    *,
    language: str = "kan+eng",
    dpi: int = 300,
    limit_pages: int | None = None,
) -> dict[str, Any]:
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    output_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = output_dir / "extraction_checkpoint.json"
    checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8")) if checkpoint_path.exists() else {}
    errors: list[dict[str, Any]] = []
    parts: list[dict[str, Any]] = []
    all_records: list[dict[str, Any]] = []
    processed_page_count = 0
    elector_box_count = 0
    unreadable_pages: list[dict[str, Any]] = []
    ocr_failures: list[dict[str, Any]] = []

    try:
        tesseract_info = configure_tesseract()
    except Exception as error:
        tesseract_info = None
        setup_error = type(error).__name__
        files = source_manifest.get("files", [])
        report = {
            "schema_version": 1,
            "extraction_version": EXTRACTION_VERSION,
            "status": "blocked_ocr_dependency",
            "tesseract_available": False,
            "setup_error_type": setup_error,
            "requested_languages": language,
            "source_pdf_count": len(files),
            "unique_source_pdf_count": source_manifest.get("unique_source_count"),
            "total_pages": sum(item.get("page_count", 0) for item in files),
            "unique_source_total_pages": sum(item.get("page_count", 0) for item in files if not item.get("duplicate_content")),
            "duplicate_source_pages": sum(item.get("page_count", 0) for item in files if item.get("duplicate_content")),
            "processed_pages": 0,
            "unprocessed_pages": sum(item.get("page_count", 0) for item in files if not item.get("duplicate_content")),
            "detected_elector_boxes": 0,
            "extracted_records": 0,
            "ocr_failures": [],
            "unreadable_pages": [],
            "limitation": "No OCR was attempted; install Tesseract with kan and eng models to continue.",
        }
        _write_outputs(output_dir, [], report, parts)
        return report

    seen_hashes = set()
    for entry in source_manifest.get("files", []):
        if entry["sha256"] in seen_hashes:
            continue
        seen_hashes.add(entry["sha256"])
        source_path = input_dir / entry["original_filename"]
        if not source_path.is_file() or sha256_file(source_path) != entry["sha256"]:
            errors.append({"source_pdf": entry["original_filename"], "error": "source_checksum_mismatch_or_missing"})
            continue

        metadata = _part_metadata(entry)
        cover_metadata = entry.get("cover_metadata", {})
        part_summary: dict[str, Any] = {
            "source_pdf": entry["original_filename"],
            "source_pdf_sha256": entry["sha256"],
            "polling_part_number": metadata["polling_part_number"],
            "cover_metadata": cover_metadata,
            "metadata_conflicts": [],
            "expected_elector_count": cover_metadata.get("total_electors"),
            "detected_elector_boxes": 0,
            "extracted_records": 0,
            "page_count": entry.get("page_count", 0),
        }
        file_checkpoint = checkpoint.get(entry["sha256"], {"pages": {}})
        try:
            with pymupdf.open(source_path) as document:
                for page_index in range(document.page_count):
                    if limit_pages is not None and processed_page_count >= limit_pages:
                        break
                    page_number = page_index + 1
                    page_key = str(page_number)
                    if page_key in file_checkpoint["pages"]:
                        page_result = file_checkpoint["pages"][page_key]
                    else:
                        try:
                            image = render_page(document, page_index, dpi=dpi)
                            if page_index == 0:
                                page_ocr = ocr_image(image, language="eng")
                                cover = cover_metadata or parse_cover_metadata(page_ocr["text"])
                                part_summary["cover_metadata"] = cover
                                part_summary["metadata_conflicts"] = _matching_conflicts(
                                    entry.get("filename_metadata", {}), cover
                                )
                                part_summary["expected_elector_count"] = cover.get("total_electors")
                                for field in ("district", "assembly_constituency", "assembly_constituency_number", "polling_part_number", "roll_year"):
                                    if cover.get(field) is not None:
                                        metadata[field] = cover[field]
                                page_result = {
                                    "status": "processed",
                                    "raw_text": None,
                                    "cover_metadata": cover,
                                    "confidence": page_ocr["confidence"],
                                    "records": [],
                                    "box_count": 0,
                                }
                            else:
                                boxes = detect_grid_boxes(image)
                                page_records = []
                                image_height, image_width = image.shape[:2]
                                for record_index, (x, y, width, height) in enumerate(boxes, start=1):
                                    margin_x = max(2, int(width * 0.015))
                                    margin_y = max(2, int(height * 0.015))
                                    crop = image[
                                        max(0, y + margin_y):min(image_height, y + height - margin_y),
                                        max(0, x + margin_x):min(image_width, x + width - margin_x),
                                    ]
                                    card = ocr_image(crop, language=language)
                                    if card["text"].strip():
                                        page_records.append(_parse_card_text(
                                            card["text"], metadata, entry, page_number, record_index, card["confidence"]
                                        ))
                                page_result = {
                                    "status": "processed" if boxes else "unreadable",
                                    "raw_text": None,
                                    "confidence": None,
                                    "records": page_records,
                                    "box_count": len(boxes),
                                }
                        except Exception as error:
                            page_result = {"status": "ocr_error", "error_type": type(error).__name__, "records": [], "box_count": 0}

                        file_checkpoint["pages"][page_key] = page_result
                        checkpoint[entry["sha256"]] = file_checkpoint
                        _atomic_json(checkpoint_path, checkpoint)

                    processed_page_count += 1
                    part_summary["detected_elector_boxes"] += page_result.get("box_count", 0)
                    part_summary["extracted_records"] += len(page_result.get("records", []))
                    all_records.extend(page_result.get("records", []))
                    if page_result["status"] == "unreadable":
                        unreadable_pages.append({"source_pdf": entry["original_filename"], "page": page_number})
                    elif page_result["status"] == "ocr_error":
                        ocr_failures.append({"source_pdf": entry["original_filename"], "page": page_number, "error_type": page_result.get("error_type")})

                    if page_number == 1:
                        cached_cover = page_result.get("cover_metadata") or file_checkpoint.get("cover_metadata")
                        if cached_cover:
                            part_summary["cover_metadata"] = cached_cover
                            part_summary["expected_elector_count"] = cached_cover.get("total_electors")
        except Exception as error:
            errors.append({"source_pdf": entry["original_filename"], "error": type(error).__name__})
        parts.append(part_summary)

    unique_source_total_pages = sum(part["page_count"] for part in parts)
    source_pages_total = source_manifest.get("source_pages_total")
    if source_pages_total is None:
        source_pages_total = sum(item.get("page_count", 0) for item in source_manifest.get("files", []))
    total_pages = source_pages_total
    unprocessed_pages = max(0, unique_source_total_pages - processed_page_count)
    status = (
        "completed_with_errors" if errors or ocr_failures or unreadable_pages
        else "partial" if unprocessed_pages
        else "completed"
    )
    report = {
        "schema_version": 1,
        "extraction_version": EXTRACTION_VERSION,
        "status": status,
        "tesseract_available": True,
        "tesseract": tesseract_info[0],
        "languages": language,
        "source_pdf_count": source_manifest.get("source_count"),
        "unique_source_pdf_count": len(parts),
        "total_pages": total_pages,
        "unique_source_total_pages": unique_source_total_pages,
        "duplicate_source_pages": total_pages - unique_source_total_pages,
        "processed_pages": processed_page_count,
        "unprocessed_pages": unprocessed_pages,
        "detected_elector_boxes": sum(part["detected_elector_boxes"] for part in parts),
        "extracted_records": len(all_records),
        "unreadable_pages": unreadable_pages,
        "ocr_failures": ocr_failures,
        "source_errors": errors,
        "parts": parts,
    }
    _write_outputs(output_dir, all_records, report, parts)
    return report


def _write_outputs(output_dir: Path, records: list[dict[str, Any]], report: dict[str, Any], parts: list[dict[str, Any]]) -> None:
    jsonl_path = output_dir / "records.jsonl"
    with jsonl_path.open("w", encoding="utf-8", newline="\n") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=False) + "\n")

    dataframe = pd.DataFrame(records, columns=RECORD_COLUMNS)
    dataframe.to_csv(output_dir / "records.csv", index=False, encoding="utf-8-sig")

    review_columns = RECORD_COLUMNS + ["human_verified", "review_notes"]
    review_sample = _manual_review_sample(records, limit=50)
    review_frame = pd.DataFrame(review_sample, columns=review_columns)
    review_frame["human_verified"] = ""
    review_frame["review_notes"] = ""
    review_frame.to_csv(output_dir / "manual_review.csv", index=False, encoding="utf-8-sig")

    manifest = {
        "schema_version": 1,
        "extraction_version": EXTRACTION_VERSION,
        "status": report["status"],
        "record_format": "JSONL",
        "records_file": jsonl_path.name,
        "records_count": len(records),
        "source_manifest": "source_manifest.json",
        "coverage_parts": sorted({part.get("polling_part_number") for part in parts if part.get("polling_part_number") is not None}),
        "coverage_complete": False,
        "parts": parts,
        "tesseract_available": report.get("tesseract_available"),
        "validation_report": "validation_report.json",
    }
    _atomic_json(output_dir / "manifest.json", manifest)
    _atomic_json(output_dir / "extraction_report.json", report)


def _manual_review_sample(records: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    if len(records) <= limit:
        return records
    grouped: dict[tuple[Any, Any], list[dict[str, Any]]] = {}
    for record in records:
        key = (record.get("polling_part_number"), record.get("source_page"))
        grouped.setdefault(key, []).append(record)
    keys = sorted(grouped, key=lambda item: (item[0] or 0, item[1] or 0))
    selected = []
    while len(selected) < limit and any(grouped.values()):
        for key in keys:
            if grouped[key] and len(selected) < limit:
                selected.append(grouped[key].pop(0))
    return selected