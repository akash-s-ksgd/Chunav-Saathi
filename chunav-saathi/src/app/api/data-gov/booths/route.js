import { getDb } from "@/lib/mongodb";
import { fetchElectionDataFromGov } from "@/lib/dataGovService";

// GET /api/data-gov/booths — Fetch polling booth data, preferring data.gov.in with DB fallback
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state") || "";
    const source = searchParams.get("source") || "auto"; // auto | api | db

    const db = await getDb();

    // Try data.gov.in first if requested
    if (source === "api" || source === "auto") {
      const govData = await fetchElectionDataFromGov(state, 50);
      if (govData.success && govData.data.length > 0) {
        return Response.json({
          source: "data.gov.in",
          message: "Data fetched live from Government of India Open Data Platform",
          total: govData.total,
          data: govData.data,
        });
      }
    }

    // Fallback to local database
    const query = {};
    if (state) query.state = { $regex: state, $options: "i" };

    const booths = await db.collection("booths")
      .find(query)
      .limit(50)
      .toArray();

    // Also return aggregated stats
    const stateStats = await db.collection("booths").aggregate([
      ...(state ? [{ $match: { state: { $regex: state, $options: "i" } } }] : []),
      {
        $group: {
          _id: "$state",
          totalBooths: { $sum: 1 },
          avgCapacity: { $avg: "$capacity" },
          accessibleCount: { $sum: { $cond: ["$isAccessible", 1, 0] } },
        },
      },
      { $sort: { totalBooths: -1 } },
    ]).toArray();

    return Response.json({
      source: "local-database",
      message: "Data served from local database. Set DATA_GOV_API_KEY for live data.gov.in integration.",
      booths,
      stateStats,
      total: booths.length,
    });
  } catch (error) {
    console.error("Data.gov.in proxy error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
