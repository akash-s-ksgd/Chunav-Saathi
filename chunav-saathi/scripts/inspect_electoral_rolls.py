#!/usr/bin/env python3
"""Inspect local electoral-roll PDFs and write a provenance manifest."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from electoral_rolls.pdf_inspector import build_inspection_report


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=PROJECT_ROOT / "data/raw/karnataka/belthangady/original",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "data/staging/belthangady",
    )
    parser.add_argument("--expected-count", type=int, default=11)
    parser.add_argument("--no-cache", action="store_true", help="Rerun cover OCR for every PDF")
    args = parser.parse_args()

    paths = sorted(args.input_dir.glob("*.pdf"))
    cached_entries = {}
    old_report_path = args.output_dir / "inspection_report.json"
    if not args.no_cache and old_report_path.is_file():
        try:
            old_report = json.loads(old_report_path.read_text(encoding="utf-8"))
            cached_entries = {entry["original_filename"]: entry for entry in old_report.get("files", [])}
        except (json.JSONDecodeError, KeyError, TypeError):
            cached_entries = {}
    report = build_inspection_report(
        paths,
        expected_count=args.expected_count,
        cached_entries=cached_entries,
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)

    report_path = args.output_dir / "inspection_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    csv_path = args.output_dir / "inspection_report.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as output:
        fields = [
            "original_filename", "sha256", "file_size_bytes", "page_count", "pdf_version",
            "has_searchable_text_layer", "pages_with_embedded_images", "language_from_native_text",
            "polling_part_number", "assembly_constituency_number", "roll_year", "revision_type",
            "roll_revision", "duplicate_content", "open_status", "metadata_content_verified",
            "cover_ocr_confidence", "summary_ocr_confidence", "document_district",
            "document_assembly_constituency", "document_assembly_constituency_number",
            "document_polling_part_number", "document_roll_year", "document_revision_type",
            "document_date_of_update", "polling_station_name", "starting_serial_number",
            "ending_serial_number", "male_electors", "female_electors",
            "third_gender_electors", "total_electors", "supplementary_additions_present",
            "supplementary_deletions_present",
        ]
        writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for entry in report["files"]:
            cover = entry.get("cover_metadata", {})
            writer.writerow({
                **entry,
                **entry.get("filename_metadata", {}),
                "document_district": cover.get("district"),
                "document_assembly_constituency": cover.get("assembly_constituency"),
                "document_assembly_constituency_number": cover.get("assembly_constituency_number"),
                "document_polling_part_number": cover.get("polling_part_number"),
                "document_roll_year": cover.get("roll_year"),
                "document_revision_type": cover.get("revision_type"),
                "document_date_of_update": cover.get("date_of_update"),
                "polling_station_name": cover.get("polling_station_name"),
                "starting_serial_number": cover.get("starting_serial_number"),
                "ending_serial_number": cover.get("ending_serial_number"),
                "male_electors": cover.get("male_electors"),
                "female_electors": cover.get("female_electors"),
                "third_gender_electors": cover.get("third_gender_electors"),
                "total_electors": cover.get("total_electors"),
                "supplementary_additions_present": cover.get("supplementary_additions_present"),
                "supplementary_deletions_present": cover.get("supplementary_deletions_present"),
            })

    manifest = {
        "schema_version": 1,
        "expected_source_pdf_count": report["expected_source_pdf_count"],
        "constituency_slug": "belthangady",
        "state": "Karnataka",
        "state_code": "S10",
        "inspection_report": report_path.name,
        "source_count": report["source_pdf_count"],
        "unique_source_count": report["unique_source_pdf_count"],
        "source_pages_total": report["source_pages_total"],
        "unique_source_pages_total": report["unique_source_pages_total"],
        "duplicate_source_pages_total": report["duplicate_source_pages_total"],
        "coverage_parts_observed": report["observed_polling_part_numbers"],
        "coverage_complete": False,
        "files": report["files"],
    }
    (args.output_dir / "source_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(
        "Inspected {} PDFs ({} unique); observed parts {}. Reports written under {}".format(
            report["source_pdf_count"],
            report["unique_source_pdf_count"],
            ", ".join(str(part) for part in report["observed_polling_part_numbers"]),
            args.output_dir,
        )
    )
    return 0 if all(entry["open_status"] == "ok" for entry in report["files"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())