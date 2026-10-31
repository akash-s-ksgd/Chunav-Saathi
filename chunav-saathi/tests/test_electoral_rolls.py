from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from electoral_rolls.field_parser import parse_cover_metadata, parse_elector_card
from electoral_rolls.mongo_uploader import (
    build_restricted_document,
    decrypt_field,
    epic_hmac_token,
    mutable_import_fields,
    upsert_record_batch,
)
from electoral_rolls.normalizer import field_state, normalize_digits, normalize_gender
from electoral_rolls.ocr_engine import configure_tesseract, ocr_image
from electoral_rolls.pdf_inspector import build_inspection_report, inspect_pdf
from electoral_rolls.validator import validate_batch, validate_epic_format


class PdfInspectionTests(unittest.TestCase):
    def test_native_text_and_image_only_pdf_detection(self):
        import pymupdf

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            text_pdf = root / "native.pdf"
            doc = pymupdf.open()
            page = doc.new_page()
            page.insert_text((30, 40), "Synthetic PDF text")
            doc.save(text_pdf)
            doc.close()

            image_pdf = root / "image.pdf"
            image_path = root / "synthetic.png"
            Image.new("RGB", (40, 40), "white").save(image_path)
            doc = pymupdf.open()
            page = doc.new_page()
            page.insert_image(pymupdf.Rect(10, 10, 80, 80), filename=str(image_path))
            doc.save(image_pdf)
            doc.close()

            self.assertTrue(inspect_pdf(text_pdf)["has_searchable_text_layer"])
            image_report = inspect_pdf(image_pdf)
            self.assertFalse(image_report["has_searchable_text_layer"])
            self.assertEqual(image_report["pages_with_embedded_images"], 1)

    def test_checksum_and_duplicate_input_detection(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            first = root / "part-1.pdf"
            duplicate = root / "part-1-copy.pdf"
            first.write_bytes(b"synthetic pdf payload")
            duplicate.write_bytes(first.read_bytes())
            report = build_inspection_report([first, duplicate], expected_count=2)
            self.assertEqual(report["unique_source_pdf_count"], 1)
            self.assertEqual(sum(item["duplicate_content"] for item in report["files"]), 1)
            self.assertEqual(report["files"][0]["sha256"], hashlib.sha256(first.read_bytes()).hexdigest())


class NormalizerAndParserTests(unittest.TestCase):
    def test_cover_parser_uses_explicit_values(self):
        text = (
            "No..Name:and Reservation Status of Assembly Constituency : 200. BELTHANGADY (GEN) Part No. : 2,\n"
            "Year-of Revision: 2026 Roll Identification\n"
            "uct District :DAKSHINA KANNADA\n"
            "4.. NUMBER'OF/ELECTORS\n"
            "| Starting | Ending | Net Electors |\n"
            "Serial No. Serial No. Male | Female | Third Gender | Total\n"
            "| 1 | 615 320 | 293 0 613 |"
        )
        values = parse_cover_metadata(text)
        self.assertEqual(values["assembly_constituency"], "BELTHANGADY")
        self.assertEqual(values["assembly_constituency_number"], 200)
        self.assertEqual(values["district"], "DAKSHINA KANNADA")
        self.assertEqual(values["polling_part_number"], 2)
        self.assertEqual(values["roll_year"], 2026)
        self.assertEqual(values["total_electors"], 613)

    def test_kannada_digits_gender_and_missing_blank_distinction(self):
        self.assertEqual(normalize_digits("ವಯಸ್ಸು ೪೬"), "ವಯಸ್ಸು 46")
        self.assertEqual(normalize_gender("ಮಹಿಳೆ"), "female")
        self.assertEqual(field_state(False, None, None), "not_present")
        self.assertEqual(field_state(True, None, None), "blank")
        self.assertEqual(field_state(True, "x", 20), "unreadable")

    def test_record_parser_preserves_provenance_and_does_not_invent_fields(self):
        record = parse_elector_card(
            "Name: Synthetic Name\nAge: 46\nGender: Female\nEPIC No: ABC1234567",
            metadata={"state": "Karnataka", "polling_part_number": 1},
            source_pdf="synthetic.pdf",
            source_pdf_sha256="a" * 64,
            source_page=3,
            record_index=4,
            ocr_confidence=96,
            extraction_version="test",
        )
        self.assertEqual(record["source_pdf_sha256"], "a" * 64)
        self.assertEqual(record["source_page"], 3)
        self.assertEqual(record["elector_name_native"], "Synthetic Name")
        self.assertIsNone(record["serial_number"])
        self.assertTrue(record["needs_manual_review"])

    def test_kannada_name_stays_native(self):
        record = parse_elector_card(
            "ಹೆಸರು: ಪರೀಕ್ಷಾ ಹೆಸರು",
            metadata={},
            source_pdf="synthetic.pdf",
            source_pdf_sha256="b" * 64,
            source_page=2,
            record_index=1,
            ocr_confidence=95,
            extraction_version="test",
        )
        self.assertEqual(record["elector_name_native"], "ಪರೀಕ್ಷಾ ಹೆಸರು")
        self.assertIsNone(record["elector_name_english"])

    def test_epic_validation_never_corrects(self):
        self.assertTrue(validate_epic_format("abc 1234567"))
        self.assertFalse(validate_epic_format("AB1234567"))
        self.assertFalse(validate_epic_format(None))


class LocalOcrTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            configure_tesseract()
        except Exception as error:
            raise unittest.SkipTest("Local Tesseract with eng and kan is unavailable: " + type(error).__name__)

    def test_english_ocr_on_synthetic_image(self):
        image = Image.new("RGB", (900, 160), "white")
        draw = ImageDraw.Draw(image)
        draw.text((20, 35), "SYNTHETIC ELECTOR TEST", fill="black", font=ImageFont.load_default(size=46))
        import numpy as np

        result = ocr_image(np.array(image), "eng")
        self.assertIn("SYNTHETIC", result["text"].upper())
        self.assertIsNotNone(result["confidence"])

    def test_kannada_ocr_on_synthetic_image(self):
        candidates = [
            Path("C:/Windows/Fonts/Nirmala.ttc"),
            Path("C:/Windows/Fonts/Nirmala.ttf"),
            Path("C:/Windows/Fonts/NirmalaUI.ttf"),
        ]
        font_path = next((path for path in candidates if path.is_file()), None)
        if font_path is None:
            self.skipTest("No installed Kannada-capable font found")
        image = Image.new("RGB", (900, 180), "white")
        draw = ImageDraw.Draw(image)
        draw.text((20, 35), "ಪರೀಕ್ಷಾ ಹೆಸರು", fill="black", font=ImageFont.truetype(str(font_path), 72, index=0))
        import numpy as np

        result = ocr_image(np.array(image), "kan+eng")
        self.assertTrue(any("\u0c80" <= char <= "\u0cff" for char in result["text"]))


class ValidationTests(unittest.TestCase):
    def _record(self, **overrides):
        record = {
            "state": "Karnataka",
            "district": "Synthetic District",
            "assembly_constituency": "Synthetic Constituency",
            "assembly_constituency_number": 200,
            "polling_part_number": 1,
            "roll_year": 2026,
            "roll_revision": 1,
            "source_pdf": "synthetic.pdf",
            "source_pdf_sha256": "a" * 64,
            "source_page": 2,
            "serial_number": 1,
            "epic_number": "ABC1234567",
            "needs_manual_review": False,
            "ocr_confidence": 96,
            "field_status": {"elector_name_native": "extracted"},
        }
        record.update(overrides)
        return record

    def test_duplicate_detection_is_source_aware(self):
        from electoral_rolls.validator import _validate_records

        records = [
            self._record(source_pdf_sha256="a" * 64, serial_number=1),
            self._record(source_pdf_sha256="b" * 64, serial_number=1),
        ]
        report = _validate_records(records)
        self.assertEqual(report["duplicate_records"], 0)
        records.append(self._record(source_pdf_sha256="a" * 64, serial_number=1))
        self.assertEqual(_validate_records(records)["duplicate_records"], 1)

    def test_manifest_validation_checks_hashes_and_requires_coverage_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_dir = root / "raw" / "karnataka" / "belthangady" / "original"
            staging = root / "staging" / "belthangady"
            source_dir.mkdir(parents=True)
            staging.mkdir(parents=True)
            source = source_dir / "synthetic.pdf"
            source.write_bytes(b"synthetic")
            checksum = hashlib.sha256(b"synthetic").hexdigest()
            (staging / "source_manifest.json").write_text(json.dumps({
                "expected_source_pdf_count": 1,
                "source_count": 1,
                "unique_source_count": 1,
                "coverage_complete": False,
                "files": [{
                    "original_filename": source.name,
                    "sha256": checksum,
                    "page_count": 1,
                    "filename_metadata": {"polling_part_number": 1},
                    "duplicate_content": False,
                }],
            }), encoding="utf-8")
            (staging / "extraction_report.json").write_text(json.dumps({
                "status": "blocked_ocr_dependency",
                "unprocessed_pages": 1,
                "parts": [],
            }), encoding="utf-8")
            report = validate_batch(source_dir, staging)
            self.assertTrue(report["source_validation"]["all_checksums_match"])
            self.assertFalse(report["source_validation"]["coverage_complete"])
            self.assertFalse(report["ready_for_import"])

    def test_age_and_gender_warnings_do_not_rewrite_source_values(self):
        from electoral_rolls.validator import _validate_records

        record = self._record(age=17, gender_original="Unmapped value", gender="female")
        report = _validate_records([record])
        codes = {warning["code"] for warning in report["warnings"]}
        self.assertIn("age_outside_plausible_range", codes)
        self.assertIn("gender_normalization_unrecognized", codes)
        self.assertEqual(record["age"], 17)


class EncryptionAndImportTests(unittest.TestCase):
    def setUp(self):
        self.encryption_key = b"E" * 32
        self.hmac_key = b"H" * 32

    def test_field_encryption_and_epic_hmac_do_not_store_plaintext(self):
        record = {
            "needs_manual_review": False,
            "source_pdf_sha256": "c" * 64,
            "source_page": 4,
            "serial_number": 1,
            "elector_name_native": "Synthetic Person",
            "house_number": "H-1",
            "age": 44,
            "epic_number": "ABC1234567",
            "state": "Karnataka",
            "polling_part_number": 1,
        }
        document = build_restricted_document(
            record,
            import_id="synthetic-import",
            encryption_key=self.encryption_key,
            hmac_key=self.hmac_key,
        )
        serialized = json.dumps(document, default=str)
        for secret in ("Synthetic Person", "ABC1234567", "H-1", '"age": 44'):
            self.assertNotIn(secret, serialized)
        envelope = document["personal_data_encrypted"]["elector_name_native"]
        self.assertEqual(
            decrypt_field(envelope, self.encryption_key, "synthetic-import:{}:elector_name_native".format(document["_id"])),
            "Synthetic Person",
        )
        self.assertEqual(document["epic_token"], epic_hmac_token("abc 1234567", self.hmac_key))

    def test_manual_review_records_are_not_importable(self):
        with self.assertRaises(ValueError):
            build_restricted_document(
                {"needs_manual_review": True},
                import_id="synthetic-import",
                encryption_key=self.encryption_key,
                hmac_key=self.hmac_key,
            )

    def test_import_metadata_update_does_not_set_immutable_id(self):
        document = {"_id": "batch-id", "status": "processing", "import_id": "batch-id"}
        self.assertEqual(
            mutable_import_fields(document),
            {"status": "processing", "import_id": "batch-id"},
        )

    def test_idempotent_batch_writes_resume_after_partial_failure(self):
        class FakeCollection:
            def __init__(self):
                self.documents = {}
                self.fail_once = True

            def count_documents(self, query):
                ids = query["_id"]["$in"]
                return sum(identifier in self.documents for identifier in ids)

            def bulk_write(self, operations, ordered=False):
                inserted = 0
                for operation in operations:
                    identifier = operation._filter["_id"]
                    document = operation._doc["$setOnInsert"]
                    if identifier not in self.documents:
                        self.documents[identifier] = document
                        inserted += 1
                        if self.fail_once:
                            self.fail_once = False
                            raise RuntimeError("synthetic interruption")
                return SimpleNamespace(upserted_count=inserted)

        collection = FakeCollection()
        documents = [{"_id": "one"}, {"_id": "two"}]
        first = upsert_record_batch(collection, documents)
        self.assertEqual(first, {"inserted": 1, "skipped": 0, "failed": 1})
        retry = upsert_record_batch(collection, documents)
        self.assertEqual(retry, {"inserted": 1, "skipped": 1, "failed": 0})
        repeated = upsert_record_batch(collection, documents)
        self.assertEqual(repeated, {"inserted": 0, "skipped": 2, "failed": 0})


if __name__ == "__main__":
    unittest.main()