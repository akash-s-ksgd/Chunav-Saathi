# Electoral Roll Ingestion

This pipeline keeps source PDFs, OCR output, extracted records, review sheets, and import reports under the local `data/` directory. That directory is ignored by Git. Never commit the source rolls, individual records, OCR caches, or secret keys.

## Belthangady Pilot

From the `chunav-saathi` directory, create and activate a Python 3.12 environment, then install the dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Install Tesseract locally and add the `eng` and `kan` trained data. Verify both are listed:

```powershell
tesseract --list-langs
```

Copy `.env.example` to `.env.local` and configure the existing MongoDB URI, independent 32-byte encryption and HMAC keys, the Tesseract executable path if it is not on `PATH`, and the local data root. Do not put secret values in Git or logs. Encryption and HMAC keys must be distinct.

Inspect all PDFs, calculate source checksums, and write the metadata report:

```powershell
python scripts/inspect_electoral_rolls.py
```

Read `data/staging/belthangady/inspection_report.json`, `.csv`, and `source_manifest.json`. Confirm each metadata value against the cover page and resolve filename/content disagreements. Identical source files are flagged, not silently deleted.

Calibrate OCR on a limited number of pages first:

```powershell
python scripts/extract_electoral_rolls.py --limit-pages 2
```

Review OCR confidence, detected box count, parsed-field rates, and the source page itself. Do not remove `--limit-pages` until card segmentation and field accuracy have been manually demonstrated. Extraction checkpoints are stored locally and resume by source checksum and page.

After calibration, process the batch and validate it:

```powershell
python scripts/extract_electoral_rolls.py
python scripts/validate_electoral_rolls.py
```

The validator requires official evidence of complete polling-part coverage, exact printed-total reconciliation, no duplicate source files, and at least 50 manual comparisons distributed across the PDFs and pages. Mark `human_verified` in `manual_review.csv` only after checking each sample against the source. Never treat an unreadable or unprocessed record as absent from the roll.

Dry-run is the default and does not connect to MongoDB:

```powershell
python scripts/mongo_import.py --dry-run
```

Only after all validation gates pass and the admin access checks are verified, explicitly import:

```powershell
python scripts/mongo_import.py --commit
```

The importer writes approved personal fields encrypted with AES-256-GCM to `electoral_records_restricted`, and stores a separate keyed HMAC token for EPIC matching. It writes only aggregate statistics to `electoral_statistics`; it never uploads source PDFs.

## Another Constituency

Create the same directory shape with an appropriate state and constituency slug:

```text
data/raw/<state-slug>/<constituency-slug>/original/
data/staging/<constituency-slug>/
```

Then pass the corresponding `--input-dir` and `--output-dir` to inspection and extraction, `--input-dir` and `--staging-dir` to validation, and `--source-dir` and `--staging-dir` to the importer. Confirm state/constituency metadata from the documents; do not infer missing values from the directory name.

## Admin Metadata API

`GET /api/electoral-roll/imports` requires a bearer token with the existing `admin` role. It returns batch metadata and validation aggregates only. Individual voter records are not exposed by this API. Citizens must continue using the official ECI voter-search service for individual verification.

## Current Belthangady Findings

The local source folder contains 11 PDFs but only 10 unique checksums: the two part-1 files are byte-identical. Unique filenames show parts 1–10; this does not prove that the constituency has no additional parts. The PDFs are image-only. The cover OCR currently verifies only a subset of metadata, and the two-page pilot found low-confidence card crops with no reliable field extraction. The full batch is therefore intentionally blocked from promotion and MongoDB import until OCR segmentation and coverage are independently validated.