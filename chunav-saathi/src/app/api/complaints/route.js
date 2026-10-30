import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/complaints — List complaints with filters
export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    const { searchParams } = new URL(req.url);

    const db = await getDb();
    const query = {};

    // Non-admin users can only see their own complaints
    if (!user || user.role !== "admin") {
      if (user) query.userId = user.userId;
    }

    // Filters
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const state = searchParams.get("state");
    const priority = searchParams.get("priority");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;
    if (state && state !== "all") query.state = state;
    if (priority && priority !== "all") query.priority = priority;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo + "T23:59:59Z");
    }

    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { complaintId: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [complaints, total] = await Promise.all([
      db.collection("complaints")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("complaints").countDocuments(query),
    ]);

    return Response.json({
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List complaints error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/complaints — Create a new complaint
export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { category, subject, description, state, district, constituency, boothId, priority } = body;

    // ── Validation ──────────────────────────────────────────────
    const errors = {};
    if (!category) errors.category = "Category is required";
    if (!subject || subject.trim().length < 10) errors.subject = "Subject must be at least 10 characters";
    if (!description || description.trim().length < 30) errors.description = "Description must be at least 30 characters";
    if (!state) errors.state = "State is required";
    if (!district) errors.district = "District is required";
    if (!priority) errors.priority = "Priority is required";

    if (Object.keys(errors).length > 0) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const db = await getDb();

    // Generate complaint ID
    const count = await db.collection("complaints").countDocuments();
    const complaintId = `CMP-${String(count + 1).padStart(5, "0")}`;

    const complaint = {
      complaintId,
      userId: user.userId,
      userName: user.name,
      userPhone: user.phone,
      category,
      subject: subject.trim(),
      description: description.trim(),
      state,
      district,
      constituency: constituency || "",
      boothId: boothId || "",
      boothName: "",
      priority,
      status: "Pending",
      adminNotes: "",
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If boothId provided, fetch booth name
    if (boothId) {
      const booth = await db.collection("booths").findOne({ boothId });
      if (booth) complaint.boothName = booth.name;
    }

    const result = await db.collection("complaints").insertOne(complaint);

    return Response.json({
      message: "Complaint filed successfully",
      complaint: { ...complaint, _id: result.insertedId },
    }, { status: 201 });
  } catch (error) {
    console.error("Create complaint error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
