import * as mongo from "@/lib/mongodb";
import * as validation from "@/lib/validation";

// GET /api/booths — Search polling booths with filters
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const db = await mongo.getDb();
    const query = {};

    const state = searchParams.get("state");
    const district = searchParams.get("district");
    const constituency = searchParams.get("constituency");
    const pincode = searchParams.get("pincode");
    const search = searchParams.get("search");
    const accessible = searchParams.get("accessible");
    const page = validation.clampPage(searchParams.get("page"), 1);
    const limit = validation.clampLimit(searchParams.get("limit"), 20);

    if (state && state !== "all") query.state = state;
    if (district && district !== "all") query.district = { $regex: validation.escapeRegex(district), $options: "i" };
    if (constituency) query.constituency = { $regex: validation.escapeRegex(constituency), $options: "i" };
    if (pincode) query.pincode = pincode;
    if (accessible === "true") query.isAccessible = true;

    if (search) {
      const safeSearch = validation.escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { boothId: { $regex: safeSearch, $options: "i" } },
        { address: { $regex: safeSearch, $options: "i" } },
        { constituency: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [booths, total] = await Promise.all([
      db.collection("booths")
        .find(query)
        .sort({ state: 1, district: 1, boothNumber: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("booths").countDocuments(query),
    ]);

    const states = await db.collection("booths").distinct("state");

    return Response.json({
      booths,
      states,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List booths error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
