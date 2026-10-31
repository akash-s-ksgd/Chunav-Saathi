#!/usr/bin/env python3
"""Extract records locally from the inspected electoral-roll batch."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from electoral_rolls.pdf_extractor import extract_batch


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=PROJECT_ROOT / "data/raw/karnataka/belthangady/original")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "data/staging/belthangady")
    parser.add_argument("--language", default="kan+eng")
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--limit-pages", type=int)
    parser.add_argument("--no-resume", action="store_true", help="Ignore the previous extraction checkpoint")
    args = parser.parse_args()

    checkpoint = args.output_dir / "extraction_checkpoint.json"
    if args.no_resume and checkpoint.exists():
        checkpoint.unlink()
    report = extract_batch(
        args.output_dir / "source_manifest.json",
        args.input_dir,
        args.output_dir,
        language=args.language,
        dpi=args.dpi,
        limit_pages=args.limit_pages,
    )
    print(json.dumps({
        "status": report["status"],
        "source_pdf_count": report["source_pdf_count"],
        "unique_source_pdf_count": report["unique_source_pdf_count"],
        "processed_pages": report["processed_pages"],
        "unprocessed_pages": report["unprocessed_pages"],
        "detected_elector_boxes": report["detected_elector_boxes"],
        "extracted_records": report["extracted_records"],
        "setup_error_type": report.get("setup_error_type"),
    }, indent=2))
    return 0 if report["status"] == "completed" else 2


if __name__ == "__main__":
    raise SystemExit(main())