#!/usr/bin/env python3
"""Validate the staged batch and write its quality/promotion report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from electoral_rolls.validator import validate_batch


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=PROJECT_ROOT / "data/raw/karnataka/belthangady/original")
    parser.add_argument("--staging-dir", type=Path, default=PROJECT_ROOT / "data/staging/belthangady")
    args = parser.parse_args()
    report = validate_batch(args.input_dir, args.staging_dir)
    report_path = args.staging_dir / "validation_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "total_source_pdfs": report["total_source_pdfs"],
        "total_pages": report["total_pages"],
        "total_extracted_records": report["total_extracted_records"],
        "promotion_blockers": report["promotion_blockers"],
    }, ensure_ascii=False, indent=2))
    return 0 if report["ready_for_import"] else 2


if __name__ == "__main__":
    raise SystemExit(main())