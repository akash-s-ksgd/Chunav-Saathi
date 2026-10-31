import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  getElectoralRollImportAccess,
  toPublicElectoralRollImport,
} from "@/lib/electoralRollImportAccess.mjs";

const IMPORT_PROJECTION = {
  _id: 1,
  import_id: 1,
  state: 1,
  district: 1,
  assembly_constituency: 1,
  assembly_constituency_number: 1,
  coverage_parts: 1,
  coverage_complete: 1,
  roll_year: 1,
  roll_revision: 1,
  revision_type: 1,
  status: 1,
  validation_status: 1,
  validation_summary: 1,
  source_pdf_count: 1,
  unique_source_pdf_count: 1,
  total_pages: 1,
  expected_records: 1,
  extracted_records: 1,
  imported_at: 1,
  completed_at: 1,
};

export async function GET(request) {
  const accessError = getElectoralRollImportAccess(getUserFromRequest(request));
  if (accessError) {
    return Response.json(
      { error: accessError.error },
      { status: accessError.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const db = await getDb();
    const documents = await db.collection("roll_imports")
      .find({}, { projection: IMPORT_PROJECTION })
      .sort({ imported_at: -1 })
      .limit(100)
      .toArray();
    return Response.json(
      { imports: documents.map(toPublicElectoralRollImport) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { error: "Unable to retrieve electoral-roll import metadata" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}