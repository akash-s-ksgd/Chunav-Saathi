"""Local-only inspection helpers for electoral-roll source PDFs."""

from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

import pymupdf


FILENAME_PATTERN = re.compile(
    r"^(?P<year>\d{4})-EROLLGEN-(?P<state_code>S\d+)-"
    r"(?P<ac_number>\d+)-(?P<revision_type>[A-Z]+)-FinalRoll-"
    r"Revision(?P<revision_number>\d+)-(?P<language>[A-Z]{3})-"
    r"(?P<part_number>\d+)-(?P<suffix>[A-Z]+)(?: \((?P<copy>\d+)\))?$",
    re.IGNORECASE,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def filename_candidates(path: Path) -> dict[str, Any]:
    match = FILENAME_PATTERN.match(path.stem)
    if not match:
        return {"parsed": False, "evidence": "filename"}

    values = match.groupdict()
    return {
        "parsed": True,
        "evidence": "filename_only",
        "roll_year": int(values["year"]),
        "state_code": values["state_code"].upper(),
        "assembly_constituency_number": int(values["ac_number"]),
        "revision_type": values["revision_type"].upper(),
        "roll_revision": int(values["revision_number"]),
        "language_hint": values["language"].upper(),
        "polling_part_number": int(values["part_number"]),
        "duplicate_suffix": values["copy"],
    }


def _script_language(text: str) -> str:
    kannada = sum("\u0c80" <= char <= "\u0cff" for char in text)
    latin = sum(char.isascii() and char.isalpha() for char in text)
    if kannada and latin:
        return "Kannada and English"
    if kannada:
        return "Kannada"
    if latin:
        return "English"
    return "unknown"


def inspect_pdf(path: Path) -> dict[str, Any]:
    checksum = sha256_file(path)
    result: dict[str, Any] = {
        "original_filename": path.name,
        "sha256": checksum,
        "file_size_bytes": path.stat().st_size,
        "filename_metadata": filename_candidates(path),
        "open_status": "ok",
    }

    try:
        with pymupdf.open(path) as document:
            page_details = []
            all_native_text = []
            for page_number, page in enumerate(document, start=1):
                text = page.get_text("text")
                all_native_text.append(text)
                image_info = page.get_image_info(xrefs=True)
                page_details.append({
                    "page": page_number,
                    "width_points": round(page.rect.width, 2),
                    "height_points": round(page.rect.height, 2),
                    "rotation": page.rotation,
                    "native_text_characters": len(text.strip()),
                    "embedded_image_count": len(image_info),
                    "embedded_images": [
                        {
                            "width_pixels": image.get("width"),
                            "height_pixels": image.get("height"),
                            "x_resolution_dpi": image.get("xres"),
                            "y_resolution_dpi": image.get("yres"),
                        }
                        for image in image_info[:4]
                    ],
                })

            native_text = "\n".join(all_native_text)
            metadata = document.metadata or {}
            result.update({
                "pdf_version": metadata.get("format"),
                "page_count": document.page_count,
                "native_text_characters": sum(len(text.strip()) for text in all_native_text),
                "has_searchable_text_layer": any(text.strip() for text in all_native_text),
                "pages_with_embedded_images": sum(
                    page["embedded_image_count"] > 0 for page in page_details
                ),
                "language_from_native_text": _script_language(native_text),
                "document_metadata": {
                    key: metadata.get(key)
                    for key in ("title", "author", "subject", "keywords", "creator", "producer", "creationDate")
                    if metadata.get(key)
                },
                "pages": page_details,
            })

            try:
                from .field_parser import parse_cover_metadata
                from .ocr_engine import configure_tesseract, ocr_image, render_page

                configure_tesseract()
                cover_page = render_page(document, 0, dpi=250)
                cover_ocr = ocr_image(cover_page, language="eng")
                cover_metadata = parse_cover_metadata(cover_ocr["text"])

                page = document[0]
                summary_clip = pymupdf.Rect(
                    0,
                    page.rect.height * 0.68,
                    page.rect.width,
                    page.rect.height * 0.96,
                )
                summary_pixmap = page.get_pixmap(
                    matrix=pymupdf.Matrix(3, 3), clip=summary_clip, alpha=False
                )
                import cv2
                import numpy as np

                summary_image = cv2.imdecode(
                    np.frombuffer(summary_pixmap.tobytes("png"), dtype=np.uint8),
                    cv2.IMREAD_COLOR,
                )
                summary_ocr = ocr_image(
                    summary_image,
                    language="eng",
                    remove_table_lines=True,
                )
                cover_metadata.update(parse_cover_metadata(summary_ocr["text"]))
                filename = result["filename_metadata"]
                conflicts = []
                for field in (
                    "assembly_constituency_number",
                    "polling_part_number",
                    "roll_year",
                    "roll_revision",
                ):
                    if filename.get(field) is not None and cover_metadata.get(field) is not None:
                        if filename[field] != cover_metadata[field]:
                            conflicts.append({
                                "field": field,
                                "filename_candidate": filename[field],
                                "document_value": cover_metadata[field],
                            })
                result["cover_metadata"] = cover_metadata
                result["cover_ocr_confidence"] = cover_ocr["confidence"]
                result["summary_ocr_confidence"] = summary_ocr["confidence"]
                result["metadata_conflicts"] = conflicts
                result["metadata_content_verified"] = bool(
                    cover_metadata.get("assembly_constituency_number")
                    and cover_metadata.get("polling_part_number")
                    and cover_metadata.get("roll_year")
                )
            except Exception as error:
                result["cover_ocr_status"] = "unavailable_or_failed"
                result["cover_ocr_error_type"] = type(error).__name__
    except Exception as error:  # PyMuPDF raises several exception types for malformed PDFs.
        result.update({"open_status": "error", "open_error_type": type(error).__name__})

    return result


def build_inspection_report(
    paths: list[Path],
    expected_count: int = 11,
    cached_entries: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    def source_sort_key(path: Path) -> tuple[bool, str]:
        return (bool(re.search(r"\s\(\d+\)$", path.stem)), path.name.casefold())

    entries = []
    for path in sorted(paths, key=source_sort_key):
        cached = (cached_entries or {}).get(path.name)
        if cached and cached.get("sha256") == sha256_file(path):
            entries.append(json.loads(json.dumps(cached)))
        else:
            entries.append(inspect_pdf(path))
    hashes: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        hashes[entry["sha256"]].append(entry)

    canonical_by_hash: dict[str, str] = {}
    for entry in entries:
        matching = hashes[entry["sha256"]]
        canonical = canonical_by_hash.setdefault(entry["sha256"], entry["original_filename"])
        entry["duplicate_source_filenames"] = [
            other["original_filename"]
            for other in matching
            if other["original_filename"] != entry["original_filename"]
        ]
        entry["duplicate_content"] = entry["original_filename"] != canonical
        entry["canonical_source_filename"] = canonical

    parts = sorted({
        entry["filename_metadata"].get("polling_part_number")
        for entry in entries
        if entry["filename_metadata"].get("polling_part_number") is not None
    })
    expected_part_range = list(range(1, max(parts, default=0) + 1))
    unique_entries = [entry for entry in entries if not entry["duplicate_content"]]
    source_pages = sum(entry.get("page_count", 0) for entry in entries)
    unique_source_pages = sum(entry.get("page_count", 0) for entry in unique_entries)
    return {
        "schema_version": 1,
        "country": "India",
        "state": "Karnataka",
        "state_code": "S10",
        "expected_source_pdf_count": expected_count,
        "source_pdf_count": len(entries),
        "source_count_matches_expected": len(entries) == expected_count,
        "unique_source_pdf_count": len(hashes),
        "duplicate_source_pdf_count": len(entries) - len(hashes),
        "source_pages_total": source_pages,
        "unique_source_pages_total": unique_source_pages,
        "duplicate_source_pages_total": source_pages - unique_source_pages,
        "observed_polling_part_numbers": parts,
        "gaps_within_observed_part_range": sorted(set(expected_part_range) - set(parts)),
        "coverage_note": "Observed filenames are not proof that all constituency polling parts are present.",
        "metadata_content_verified_files": sum(entry.get("metadata_content_verified", False) for entry in entries),
        "metadata_verification": "Content OCR is reported per PDF; low-confidence OCR values require manual confirmation.",
        "files": entries,
    }