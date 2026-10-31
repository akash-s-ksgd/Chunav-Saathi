# Review Changes

## Status

Phases 1 and 2 are implemented and passed the checks listed below. Phase 3 is blocked pending confirmation about the content of pages 1–2 in the unique Belthangady PDFs. Phase 4 has only partial changes; Phase 5 is not complete. No database seed or import commit was run. No secrets were added to this file or `.env.example`.

## Phase 1: Security

- Removed the JWT development-secret fallback. `JWT_SECRET` is required outside tests.
- Deleted the public `/api/seed` route. `npm run seed` now requires `ALLOW_SEED=true`, a non-production `NODE_ENV`, `SEED_ADMIN_PASSWORD`, `SEED_CITIZEN_PASSWORD`, and `SEED_ADMIN_PHONE`; credentials are not returned or logged. The seed endpoint no longer exists.
- Required authentication for complaint list and detail reads; citizens are restricted to their own complaints and admins can view all.
- Made complaint updates role-aware, rejected unapproved fields, and validated status, priority, text type, and length. Complaint creation validates request shape and values.
- Replaced count-based complaint IDs with an atomic `counters` update and a unique complaint ID index. The ID handling matches MongoDB driver 7's returned-document API.
- Escaped regex search inputs and bounded pagination in complaints, users, and booths APIs.
- Kept login errors generic; added demo-only per-instance rate limits for login, registration, and chat.
- Removed `isVerified: true` from new registrations and enforced the 8-character, letter-and-number password rule in the API and login modal.
- Restricted analytics detail fields to admins and excluded names, phones, user IDs, subjects, descriptions, and admin notes from API responses. Admin top-reporter output contains ordinal labels and counts only.
- Added Node tests for the requested security cases plus atomic complaint-counter handling.

## Phase 2: AI Chat

- Updated `ChatUI` to render AI SDK message `parts`, send `{ text }`, and configure the installed SDK with `DefaultChatTransport`.
- Updated the route to validate UI messages, convert them with `convertToModelMessages`, and read user text from message parts. Limits are 20 messages and 1,000 characters per text part.
- Changed chat throttling to 20 requests per minute per IP and narrowed data-intent matching so generic terms do not trigger database queries.
- Added instructions to identify the database source/year when available, abstain with “I don't have that data.” when the requested fact is absent, and return a friendly error if streaming setup fails.
- Added three data-backed question examples and a synthetic-data caveat to the README.
- Not verified against a live Groq request; no provider call was made.

## Phase 3: Belthangady Aggregate Data

**Blocked; no extraction or import implementation was started.** The requested workflow requires stopping if pages 1–2 contain elector entries. I have not inspected those pages and will not assume they are cover/summary-only. Please confirm that pages 1–2 of every unique PDF contain no voter-entry content, or provide reviewed page images/authorization to inspect them.

A non-writing dry run of the existing importer reported 11 files, 10 unique files, 0 eligible records, matching source checksums, and `blocked` status. Blockers included unresolved duplicate PDFs, unverified coverage, incomplete OCR, missing/reconciled printed totals, manual review, and missing 50-record comparisons. No MongoDB write occurred.

The requested `npm run import:elections` command is intentionally not defined. The repository's existing `scripts/mongo_import.py --commit` writes restricted per-voter records and is not an acceptable substitute for the requested aggregate-only importer. Do not run that commit path for this phase.

Not implemented: summary-page extraction, verified-part import, null-safe booth display, Belthangady analytics/chart/table, aggregate chatbot data source, CSV election importer, resource-ID configuration, and data-sources page.

## Phase 4: Frontend

- Replaced false ECI affiliation claims in the hero, metadata, navigation, login/chat copy, and assistant instructions with independent-student-project wording. Links to official ECI services remain.
- Fixed existing React lint errors in auth/theme contexts, complaints pages, navbar, and voter dashboard using derived state or external-store subscriptions.
- Did not implement System/Light/Dark selection, `next/font`, Kannada font loading, full WCAG contrast/focus/modal/reduced-motion work, source-backed hero statistics, loading/error/retry states for all fetches, or 360px/768px browser checks. These remain pending; phase work was stopped at the Phase 3 data confirmation gate.

## Phase 5: Cleanup and Docs

- Added this review and documented three chatbot example questions in the README.
- Updated `.env.example` with the environment variable names used by current code; it contains no secret values.
- Not implemented: README consolidation/architecture synopsis, Firebase removal, index-maintenance script, analytics `$facet`/cache, or full documentation cleanup. The README still contains older unverified claims and should be revised before submission.

## Commands

From the project directory in PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` locally with `MONGODB_URI`, a strong random `JWT_SECRET`, `GROQ_API_KEY`, and `DATA_GOV_API_KEY` if using that integration. For roll encryption, set two distinct 32-byte values in base64 for `ELECTORAL_DATA_ENCRYPTION_KEY` and `ELECTORAL_DATA_HMAC_KEY`. Never commit `.env.local`.

Generate a JWT secret without printing it to the console:

```powershell
$env:JWT_SECRET = (node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")
```

For a local demo seed only, set `ALLOW_SEED=true`, `NODE_ENV=development`, `SEED_ADMIN_PASSWORD`, `SEED_CITIZEN_PASSWORD`, and a 10-digit `SEED_ADMIN_PHONE` in `.env.local`, then run:

```powershell
npm run seed
```

The seed clears and repopulates the `users`, `booths`, `complaints`, and `elections` collections. Use only a disposable local/demo database. The positive seed path was not run; only the fail-closed behavior with `ALLOW_SEED=false` was verified.

`npm run import:elections` is not available yet. Do not substitute `python scripts/mongo_import.py --commit`; that is the existing per-voter import path and conflicts with the aggregate-only requirement. It can be added after the Phase 3 page-content gate is resolved.

Verification commands:

```powershell
npm run lint
$env:JWT_SECRET = (node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")
npm run build
$env:NODE_ENV = "test"
node --test tests/*.test.mjs
```

## Verification and Remaining Risks

- `npm run lint`: passed with 0 errors and 1 existing Google Fonts warning in `src/app/layout.js`.
- `npm run build`: passed using a throwaway process-only JWT secret; the build correctly fails when the required secret is absent.
- `node --test tests/*.test.mjs`: 8 passed, 0 failed.
- `npm run seed` with `ALLOW_SEED=false`: correctly refused before database access.
- Existing import dry run: blocked as detailed above; no database was written.
- Live login/registration, CRUD against MongoDB, Groq streaming, real data.gov.in access, seeded UI, and responsive browser behavior were not exercised in this pass.
- The in-memory rate limiter is per process and is not suitable for multi-instance production deployment. Forwarded-IP headers must be trusted/normalized by the deployment proxy.
- Seed generation contains synthetic election/booth/complaint data; it is demo data, not official election statistics. The seed operation is destructive to the four listed collections.
- The data.gov.in service still has hardcoded resource IDs; their validity/provenance was not verified.
- Commits created: Phase 1 `77570d9`, Phase 2 `c1094a5`, and partial Phase 4 `90be256`. The review document itself is awaiting its documentation commit.