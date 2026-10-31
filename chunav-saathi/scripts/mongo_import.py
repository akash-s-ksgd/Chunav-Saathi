#!/usr/bin/env python3
"""Dry-run by default; commit only a fully validated electoral-roll batch."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

from electoral_rolls.mongo_uploader import (
    build_restricted_document,
    import_metadata_document,
    load_secret_key,
    mutable_import_fields,
    stable_import_id,
    upsert_record_batch,
)
from electoral_rolls.pdf_inspector import sha256_file
from electoral_rolls.validator import load_jsonl


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _verify_checksums(source_manifest: dict[str, Any], source_dir: Path) -> tuple[bool, list[str]]:
    errors = []
    for source in source_manifest.get("files", []):
        path = source_dir / source["original_filename"]
        if not path.is_file() or sha256_file(path) != source.get("sha256"):
            errors.append(source["original_filename"])
    return not errors, errors


def _batch_metadata(source_manifest: dict[str, Any], extraction_report: dict[str, Any]) -> dict[str, Any]:
    parts = extraction_report.get("parts", [])
    first_cover = next((part.get("cover_metadata", {}) for part in parts if part.get("cover_metadata")), {})
    return {
        "state": source_manifest.get("state", "Karnataka"),
        "state_code": source_manifest.get("state_code", "S10"),
        "district": first_cover.get("district"),
        "assembly_constituency": first_cover.get("assembly_constituency"),
        "assembly_constituency_number": first_cover.get("assembly_constituency_number"),
        "roll_year": first_cover.get("roll_year"),
        "roll_revision": first_cover.get("roll_revision"),
        "revision_type": first_cover.get("revision_type"),
    }


def _preflight(data_root: Path, source_dir: Path, staging_dir: Path) -> dict[str, Any]:
    source_manifest = _read_json(staging_dir / "source_manifest.json")
    extraction_report = _read_json(staging_dir / "extraction_report.json")
    validation_report = _read_json(staging_dir / "validation_report.json")
    records = load_jsonl(staging_dir / "records.jsonl")
    checksum_ok, checksum_errors = _verify_checksums(source_manifest, source_dir)
    hashes = [entry.get("sha256") for entry in source_manifest.get("files", [])]
    duplicate_source_count = len(hashes) - len(set(hashes))
    import_id = stable_import_id(source_manifest.get("files", []), _batch_metadata(source_manifest, extraction_report))

    blockers = list(validation_report.get("promotion_blockers", []))
    if not source_manifest:
        blockers.append("Source manifest is missing")
    if not extraction_report:
        blockers.append("Extraction report is missing")
    if not validation_report:
        blockers.append("Validation report is missing")
    if not checksum_ok:
        blockers.append("One or more source checksums do not match")
    if duplicate_source_count:
        blockers.append("Duplicate source PDFs must be resolved")
    if not source_manifest.get("coverage_complete"):
        blockers.append("Coverage has not been independently established")
    if not validation_report.get("ready_for_import"):
        blockers.append("Validation report is not ready for import")

    eligible = [record for record in records if record.get("needs_manual_review") is False]
    if len(eligible) != len(records):
        blockers.append("Every record must pass validation and be free of manual-review flags")

    return {
        "data_root": str(data_root),
        "source_manifest": source_manifest,
        "extraction_report": extraction_report,
        "validation_report": validation_report,
        "records": records,
        "eligible_records": eligible,
        "import_id": import_id,
        "source_checksums_match": checksum_ok,
        "checksum_errors": checksum_errors,
        "duplicate_source_count": duplicate_source_count,
        "blockers": sorted(set(blockers)),
    }


def _public_statistics(records: list[dict[str, Any]], import_id: str, parts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_part: dict[int, dict[str, int]] = {}
    for record in records:
        number = record.get("polling_part_number")
        if number is None:
            continue
        stats = by_part.setdefault(number, {"extracted_records": 0, "male": 0, "female": 0, "third_gender": 0})
        stats["extracted_records"] += 1
        if record.get("gender") == "male":
            stats["male"] += 1
        elif record.get("gender") == "female":
            stats["female"] += 1
        elif record.get("gender") == "third_gender":
            stats["third_gender"] += 1

    summaries = {part.get("polling_part_number"): part for part in parts}
    output = []
    for part_number, statistics in sorted(by_part.items()):
        summary = summaries.get(part_number, {})
        cover = summary.get("cover_metadata", {})
        output.append({
            "_id": "{}:part:{}".format(import_id, part_number),
            "import_id": import_id,
            "polling_part_number": part_number,
            "expected_electors": cover.get("total_electors"),
            **statistics,
            "source_pdf_sha256": summary.get("source_pdf_sha256"),
            "updated_at": datetime.now(timezone.utc),
        })
    return output


def _commit(preflight: dict[str, Any], batch_size: int) -> dict[str, Any]:
    encryption_key = load_secret_key("ELECTORAL_DATA_ENCRYPTION_KEY")
    hmac_key = load_secret_key("ELECTORAL_DATA_HMAC_KEY")
    if encryption_key == hmac_key:
        raise ValueError("Encryption and HMAC keys must be distinct")

    mongo_uri = os.getenv("MONGODB_URI", "").strip()
    if not mongo_uri:
        raise ValueError("MONGODB_URI is not configured")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command("ping")
        database = client.get_default_database(default="chunav-saathi")
        imports = database["roll_imports"]
        restricted = database["electoral_records_restricted"]
        statistics = database["electoral_statistics"]
        polling_parts = database["polling_parts"]

        existing = imports.find_one({"_id": preflight["import_id"]}, {"status": 1})
        if existing and existing.get("status") == "completed":
            return {
                "status": "already_completed",
                "import_id": preflight["import_id"],
                "inserted": 0,
                "updated": 0,
                "skipped": len(preflight["eligible_records"]),
                "failed": 0,
            }

        restricted.create_index([("import_id", 1), ("epic_token", 1)], unique=True, partialFilterExpression={"epic_token": {"$type": "string"}})
        restricted.create_index([("import_id", 1), ("polling_part_number", 1)])
        imports.create_index([("imported_at", -1)])
        statistics.create_index([("import_id", 1), ("polling_part_number", 1)], unique=True)
        polling_parts.create_index([("import_id", 1), ("polling_part_number", 1)], unique=True)

        import_metadata = import_metadata_document(
            import_id=preflight["import_id"],
            source_manifest=preflight["source_manifest"],
            extraction_report=preflight["extraction_report"],
            validation_report=preflight["validation_report"],
            records=preflight["records"],
            status="processing",
        )
        import_metadata.update({
            "status": "processing",
            "started_at": existing.get("started_at", datetime.now(timezone.utc)) if existing else datetime.now(timezone.utc),
            "imported_at": datetime.now(timezone.utc),
            "last_error_type": None,
        })
        imports.update_one(
            {"_id": preflight["import_id"]},
            {"$set": mutable_import_fields(import_metadata)},
            upsert=True,
        )

        counters = {"inserted": 0, "updated": 0, "skipped": 0, "failed": 0}
        records = preflight["eligible_records"]
        for offset in range(0, len(records), batch_size):
            chunk = records[offset:offset + batch_size]
            documents = [
                build_restricted_document(
                    record,
                    import_id=preflight["import_id"],
                    encryption_key=encryption_key,
                    hmac_key=hmac_key,
                )
                for record in chunk
            ]
            result = upsert_record_batch(restricted, documents)
            for key in counters:
                counters[key] += result.get(key, 0)
            imports.update_one(
                {"_id": preflight["import_id"]},
                {"$set": {"progress": offset + len(chunk), "counters": counters}},
            )
            if result["failed"]:
                raise RuntimeError("A database batch failed")

        aggregate_docs = _public_statistics(
            records,
            preflight["import_id"],
            preflight["extraction_report"].get("parts", []),
        )
        for collection, docs in ((statistics, aggregate_docs), (polling_parts, import_metadata["parts"])):
            operations = []
            for original_doc in docs:
                document = dict(original_doc)
                document_id = document.get("_id") or "{}:part:{}".format(
                    preflight["import_id"], document.get("polling_part_number")
                )
                document["_id"] = document_id
                document.setdefault("import_id", preflight["import_id"])
                operations.append(UpdateOne(
                    {"_id": document_id},
                    {"$setOnInsert": document},
                    upsert=True,
                ))
            if operations:
                collection.bulk_write(operations, ordered=False)

        imports.update_one(
            {"_id": preflight["import_id"]},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc),
                "counters": counters,
                "extracted_records": len(records),
            }},
        )
        return {"status": "completed", "import_id": preflight["import_id"], **counters}
    except Exception as error:
        try:
            database = client.get_default_database(default="chunav-saathi")
            database["roll_imports"].update_one(
                {"_id": preflight["import_id"]},
                {"$set": {"status": "failed", "last_error_type": type(error).__name__, "failed_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
        except Exception:
            pass
        raise
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Validate only (the default)")
    mode.add_argument("--commit", action="store_true", help="Import only if every promotion gate passes")
    parser.add_argument("--data-root", type=Path)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--staging-dir", type=Path)
    parser.add_argument("--batch-size", type=int, default=250)
    args = parser.parse_args()
    if args.batch_size < 1:
        parser.error("--batch-size must be positive")

    load_dotenv(PROJECT_ROOT / ".env.local")
    data_root = (args.data_root or Path(os.getenv("ELECTORAL_DATA_ROOT", PROJECT_ROOT / "data"))).resolve()
    source_dir = (args.source_dir or data_root / "raw/karnataka/belthangady/original").resolve()
    staging_dir = (args.staging_dir or data_root / "staging/belthangady").resolve()
    preflight = _preflight(data_root, source_dir, staging_dir)

    summary = {
        "mode": "commit" if args.commit else "dry-run",
        "import_id": preflight["import_id"],
        "source_files": len(preflight["source_manifest"].get("files", [])),
        "unique_source_files": preflight["source_manifest"].get("unique_source_count", 0),
        "records_eligible": len(preflight["eligible_records"]),
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
        "validation_status": preflight["validation_report"].get("status", "missing"),
        "source_checksums_match": preflight["source_checksums_match"],
        "status": "blocked" if preflight["blockers"] else "ready",
        "promotion_blockers": preflight["blockers"],
    }
    if not args.commit or preflight["blockers"]:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 2 if args.commit and preflight["blockers"] else 0

    try:
        result = _commit(preflight, args.batch_size)
        summary.update(result)
        summary["status"] = result["status"]
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except Exception as error:
        summary.update({"status": "failed", "error_type": type(error).__name__})
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 1


if __name__ == "__main__":
    sys.exit(main())