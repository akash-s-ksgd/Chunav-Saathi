/**
 * data.gov.in API Service Layer
 * Handles fetching, caching, and normalizing election data from the Open Government Data platform
 */

const DATA_GOV_BASE = "https://api.data.gov.in/resource";
const API_KEY = process.env.DATA_GOV_API_KEY || "";

/**
 * Fetch data from data.gov.in API
 * Since data.gov.in doesn't have a single dedicated polling booth endpoint,
 * we use available election-related dataset resource IDs
 */
export async function fetchFromDataGov(resourceId, filters = {}, limit = 100, offset = 0) {
  if (!API_KEY) {
    return { success: false, error: "DATA_GOV_API_KEY not configured", data: [] };
  }

  try {
    const params = new URLSearchParams({
      "api-key": API_KEY,
      format: "json",
      limit: String(limit),
      offset: String(offset),
    });

    // Add any filters
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.append(`filters[${key}]`, value);
    }

    const url = `${DATA_GOV_BASE}/${resourceId}?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour

    if (!res.ok) {
      throw new Error(`data.gov.in API returned ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      total: data.total || 0,
      count: data.count || 0,
      data: data.records || [],
    };
  } catch (error) {
    console.error("data.gov.in API error:", error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Known election-related resource IDs on data.gov.in
 * These can be updated as new datasets are published
 */
export const KNOWN_RESOURCES = {
  // State-wise electors data
  stateElectors: "1f72e0e1-5d4c-4495-89c0-7329d9270c2a",
  // Parliamentary constituency data
  parliamentaryConstituencies: "cee3d4a6-96b5-4c00-a9fe-2e3f1b264e6b",
  // Election results
  electionResults: "9ef84268-d588-465a-a308-a864a43d0070",
};

/**
 * Fetch and normalize election data from data.gov.in
 * Falls back to local database if API is unavailable
 */
export async function fetchElectionDataFromGov(state = "", limit = 50) {
  const filters = {};
  if (state) filters.state_name = state;

  const result = await fetchFromDataGov(
    KNOWN_RESOURCES.stateElectors,
    filters,
    limit
  );

  if (!result.success) {
    return { success: false, source: "data.gov.in", error: result.error, data: [] };
  }

  // Normalize the data to our schema
  const normalized = result.data.map(record => ({
    state: record.state_name || record.state || "Unknown",
    district: record.district_name || record.district || "Unknown",
    totalElectors: parseInt(record.total_electors || record.electors || 0),
    maleElectors: parseInt(record.male_electors || record.male || 0),
    femaleElectors: parseInt(record.female_electors || record.female || 0),
    source: "data.gov.in",
    resourceId: KNOWN_RESOURCES.stateElectors,
    fetchedAt: new Date(),
  }));

  return { success: true, source: "data.gov.in", total: result.total, data: normalized };
}
