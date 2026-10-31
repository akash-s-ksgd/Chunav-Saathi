import test from "node:test";
import assert from "node:assert/strict";

import {
  getElectoralRollImportAccess,
  toPublicElectoralRollImport,
} from "../src/lib/electoralRollImportAccess.mjs";

test("import metadata requires authentication and the admin role", () => {
  assert.deepEqual(getElectoralRollImportAccess(null), {
    status: 401,
    error: "Authentication required",
  });
  assert.equal(getElectoralRollImportAccess({ role: "citizen" }).status, 403);
  assert.equal(getElectoralRollImportAccess({ role: "admin" }), null);
});

test("public import summary contains only approved aggregate metadata", () => {
  const result = toPublicElectoralRollImport({
    _id: "batch-1",
    state: "Karnataka",
    district: "Dakshina Kannada",
    assembly_constituency: "Belthangady",
    coverage_parts: [2, 1, "private"],
    coverage_complete: false,
    status: "blocked",
    validation_status: "blocked",
    validation_summary: {
      valid_records: 0,
      records_requiring_manual_review: 20,
      ready_for_import: false,
      secret: "must not pass",
    },
    source_pdf_filenames: ["private.pdf"],
    source_pdf_sha256: ["secret"],
    individual_record: { name: "Synthetic Private Name", epic: "ABC1234567" },
  });
  const serialized = JSON.stringify(result);
  assert.deepEqual(result.polling_part_coverage, [1, 2]);
  assert.equal(result.coverage_complete, false);
  assert.equal(result.validation_summary.ready_for_import, false);
  assert.equal(serialized.includes("Synthetic Private Name"), false);
  assert.equal(serialized.includes("ABC1234567"), false);
  assert.equal(serialized.includes("private.pdf"), false);
  assert.equal(serialized.includes("must not pass"), false);
});