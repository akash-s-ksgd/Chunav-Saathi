"""Encrypted, idempotent MongoDB import helpers."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Iterable

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pymongo import UpdateOne


PERSONAL_FIELDS = (
    "serial_number", "epic_number", "elector_name_native", "elector_name_english",
    "relative_name_native", "relative_name_english", "relationship_type",
    "house_number", "age", "gender", "gender_original",
)
PUBLIC_FIELDS = (
    "state", "district", "assembly_constituency", "assembly_constituency_number",
    "polling_part_number", "polling_station_name", "roll_year", "roll_revision",
    "roll_section", "source_pdf", "source_pdf_sha256", "source_page",
    "extraction_version",
)


def load_secret_key(name: str, environ: dict[str, str] | None = None) -> bytes:
    value = (environ or os.environ).get(name, "").strip()
    if not value:
        raise ValueError("Required secret is not configured: " + name)
    try:
        padded = value + "=" * (-len(value) % 4)
        decoded = base64.b64decode(padded, altchars=b"-_", validate=True)
    except (ValueError, base64.binascii.Error):
        decoded = value.encode("utf-8")
    if len(decoded) != 32:
        raise ValueError(name + " must decode to exactly 32 bytes")
    return decoded


def encrypt_field(value: Any, key: bytes, associated_data: str) -> dict[str, str]:
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(key).encrypt(
        nonce,
        json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        associated_data.encode("utf-8"),
    )
    return {
        "algorithm": "AES-256-GCM",
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
    }


def decrypt_field(envelope: dict[str, str], key: bytes, associated_data: str) -> Any:
    plaintext = AESGCM(key).decrypt(
        base64.b64decode(envelope["nonce"]),
        base64.b64decode(envelope["ciphertext"]),
        associated_data.encode("utf-8"),
    )
    return json.loads(plaintext.decode("utf-8"))


def epic_hmac_token(epic_number: str, key: bytes) -> str:
    normalized = "".join(epic_number.split()).upper()
    return hmac.new(key, normalized.encode("utf-8"), hashlib.sha256).hexdigest()


def deterministic_record_id(import_id: str, source_hash: str, source_page: int, record: dict[str, Any]) -> str:
    identity = record.get("serial_number")
    if identity is None:
        identity = "page-record:{}".format(record.get("record_index_on_page", "unknown"))
    value = "{}:{}:{}:{}".format(import_id, source_hash, source_page, identity)
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def build_restricted_document(
    record: dict[str, Any],
    *,
    import_id: str,
    encryption_key: bytes,
    hmac_key: bytes,
) -> dict[str, Any]:
    if record.get("needs_manual_review", True):
        raise ValueError("Record is not approved: manual review is still required")
    for field in ("source_pdf_sha256", "source_page", "polling_part_number"):
        if record.get(field) in (None, ""):
            raise ValueError("Record is missing required provenance: " + field)
    if hmac.compare_digest(encryption_key, hmac_key):
        raise ValueError("Encryption and HMAC keys must be distinct")

    document_id = deterministic_record_id(
        import_id,
        str(record["source_pdf_sha256"]),
        int(record["source_page"]),
        record,
    )
    aad_prefix = "{}:{}".format(import_id, document_id)
    personal = {}
    for field in PERSONAL_FIELDS:
        value = record.get(field)
        if value is not None:
            personal[field] = encrypt_field(value, encryption_key, aad_prefix + ":" + field)

    epic = record.get("epic_number")
    document: dict[str, Any] = {
        "_id": document_id,
        "import_id": import_id,
        "personal_data_encrypted": personal,
        "source_pdf_sha256": record["source_pdf_sha256"],
        "source_page": int(record["source_page"]),
        "extraction_version": record.get("extraction_version"),
        "created_at": datetime.now(timezone.utc),
    }
    document.update({field: record.get(field) for field in PUBLIC_FIELDS if record.get(field) is not None})
    if epic:
        document["epic_token"] = epic_hmac_token(str(epic), hmac_key)
    return document


def upsert_record_batch(collection: Any, documents: list[dict[str, Any]]) -> dict[str, int]:
    if not documents:
        return {"inserted": 0, "skipped": 0, "failed": 0}
    identifiers = [document["_id"] for document in documents]
    already_present = collection.count_documents({"_id": {"$in": identifiers}})
    operations = [
        UpdateOne({"_id": document["_id"]}, {"$setOnInsert": document}, upsert=True)
        for document in documents
    ]
    try:
        result = collection.bulk_write(operations, ordered=False)
    except Exception:
        present_after = collection.count_documents({"_id": {"$in": identifiers}})
        newly_inserted = max(0, present_after - already_present)
        return {
            "inserted": newly_inserted,
            "skipped": already_present,
            "failed": len(documents) - present_after,
        }
    inserted = int(result.upserted_count)
    return {
        "inserted": inserted,
        "skipped": len(documents) - inserted,
        "failed": 0,
    }


def stable_import_id(source_entries: Iterable[dict[str, Any]], metadata: dict[str, Any]) -> str:
    fingerprints = sorted(entry["sha256"] for entry in source_entries)
    data = json.dumps(
        {"sources": fingerprints, "metadata": metadata},
        sort_keys=True,
        separators=(",", ":"),
    )
    return "roll-" + hashlib.sha256(data.encode("utf-8")).hexdigest()


def mutable_import_fields(document: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in document.items() if key != "_id"}


def import_metadata_document(
    *,
    import_id: str,
    source_manifest: dict[str, Any],
    extraction_report: dict[str, Any],
    validation_report: dict[str, Any],
    records: list[dict[str, Any]],
    status: str,
) -> dict[str, Any]:
    parts = []
    for summary in extraction_report.get("parts", []):
        cover = summary.get("cover_metadata", {})
        parts.append({
            "polling_part_number": summary.get("polling_part_number"),
            "expected_records": summary.get("expected_elector_count"),
            "extracted_records": summary.get("extracted_records", 0),
            "source_pdf_sha256": summary.get("source_pdf_sha256"),
            "source_pdf": summary.get("source_pdf"),
            "roll_year": cover.get("roll_year"),
            "roll_revision": cover.get("roll_revision"),
            "revision_type": cover.get("revision_type"),
            "date_of_update": cover.get("date_of_update"),
            "total_pages": summary.get("page_count"),
        })
    return {
        "_id": import_id,
        "import_id": import_id,
        "state": source_manifest.get("state", "Karnataka"),
        "state_code": source_manifest.get("state_code", "S10"),
        "district": next((part.get("cover_metadata", {}).get("district") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("district")), None),
        "assembly_constituency": next((part.get("cover_metadata", {}).get("assembly_constituency") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("assembly_constituency")), None),
        "assembly_constituency_number": next((part.get("cover_metadata", {}).get("assembly_constituency_number") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("assembly_constituency_number") is not None), None),
        "roll_year": next((part.get("cover_metadata", {}).get("roll_year") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("roll_year") is not None), None),
        "roll_revision": next((part.get("cover_metadata", {}).get("roll_revision") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("roll_revision") is not None), None),
        "revision_type": next((part.get("cover_metadata", {}).get("revision_type") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("revision_type")), None),
        "publication_date": next((part.get("cover_metadata", {}).get("date_of_update") for part in extraction_report.get("parts", []) if part.get("cover_metadata", {}).get("date_of_update")), None),
        "source_pdf_filenames": [entry["original_filename"] for entry in source_manifest.get("files", [])],
        "source_pdf_sha256": sorted({entry["sha256"] for entry in source_manifest.get("files", [])}),
        "source_pdf_count": len(source_manifest.get("files", [])),
        "unique_source_pdf_count": len({entry["sha256"] for entry in source_manifest.get("files", [])}),
        "total_pages": extraction_report.get("total_pages", 0),
        "expected_records": sum(part.get("expected_elector_count") or 0 for part in extraction_report.get("parts", [])),
        "extracted_records": len(records),
        "validation_status": validation_report.get("status"),
        "validation_summary": {
            key: validation_report.get(key)
            for key in (
                "valid_records", "records_requiring_manual_review", "duplicate_records",
                "ocr_confidence_distribution", "field_extraction_quality",
                "promotion_blockers", "ready_for_import",
            )
        },
        "coverage_parts": sorted({part.get("polling_part_number") for part in parts if part.get("polling_part_number") is not None}),
        "coverage_complete": bool(source_manifest.get("coverage_complete")) and bool(validation_report.get("ready_for_import")),
        "parts": parts,
        "status": status,
        "imported_at": datetime.now(timezone.utc),
    }