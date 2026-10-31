const VALIDATION_FIELDS = [
  "valid_records",
  "records_requiring_manual_review",
  "duplicate_records",
  "ready_for_import",
];

export function getElectoralRollImportAccess(user) {
  if (!user) return { status: 401, error: "Authentication required" };
  if (user.role !== "admin") return { status: 403, error: "Admin access required" };
  return null;
}

export function toPublicElectoralRollImport(document) {
  const validation = document.validation_summary || {};
  return {
    import_id: document.import_id || document._id,
    state: document.state || null,
    district: document.district || null,
    constituency: document.assembly_constituency || null,
    constituency_number: document.assembly_constituency_number ?? null,
    polling_part_coverage: Array.isArray(document.coverage_parts)
      ? document.coverage_parts.filter(Number.isInteger).sort((a, b) => a - b)
      : [],
    coverage_complete: document.coverage_complete === true,
    roll_year: document.roll_year ?? null,
    roll_revision: document.roll_revision ?? null,
    revision_type: document.revision_type || null,
    import_status: document.status || "unknown",
    validation_status: document.validation_status || "unknown",
    validation_summary: Object.fromEntries(
      VALIDATION_FIELDS
        .filter((field) => validation[field] !== undefined)
        .map((field) => [field, validation[field]])
    ),
    total_source_pdfs: document.source_pdf_count ?? null,
    unique_source_pdfs: document.unique_source_pdf_count ?? null,
    total_pages: document.total_pages ?? null,
    expected_records: document.expected_records ?? null,
    extracted_records: document.extracted_records ?? null,
    last_imported_at: document.completed_at || document.imported_at || null,
  };
}