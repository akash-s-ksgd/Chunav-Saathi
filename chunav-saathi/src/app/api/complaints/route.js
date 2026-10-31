import { database } from "../../../lib/mongodb.js";
import { authService } from "../../../lib/auth.js";
import {
  ALLOWED_COMPLAINT_CATEGORIES,
  ALLOWED_COMPLAINT_PRIORITIES,
  ALLOWED_COMPLAINT_STATUSES,
  clampLimit,
  clampPage,
  escapeRegex,
  sanitizeSearch,
  isAllowedValue,
} from "../../../lib/validation.js";

// GET /api/complaints — List complaints with filters
export async function GET(req) {
  try {
    const user = authService.getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required. Please login." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const db = await database.getDb();
    const query = {};

    if (user.role !== "admin") {
      query.userId = user.userId;
    }

    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const state = searchParams.get("state");
    const priority = searchParams.get("priority");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");
    const page = clampPage(searchParams.get("page"), 1);
    const limit = clampLimit(searchParams.get("limit"), 20);

    if (status && status !== "all") {
      if (!isAllowedValue(status, ALLOWED_COMPLAINT_STATUSES)) {
        return Response.json({ error: "Invalid complaint status" }, { status: 400 });
      }
      query.status = status;
    }
    if (category && category !== "all") {
      if (!isAllowedValue(category, ALLOWED_COMPLAINT_CATEGORIES)) {
        return Response.json({ error: "Invalid complaint category" }, { status: 400 });
      }
      query.category = category;
    }
    if (state && state !== "all") query.state = state;
    if (priority && priority !== "all") {
      if (!isAllowedValue(priority, ALLOWED_COMPLAINT_PRIORITIES)) {
        return Response.json({ error: "Invalid complaint priority" }, { status: 400 });
      }
      query.priority = priority;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    if (search) {
      const safeSearch = sanitizeSearch(search);
      query.$or = [
        { subject: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { complaintId: { $regex: safeSearch, $options: "i" } },
        { state: { $regex: safeSearch, $options: "i" } },
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
    const user = authService.getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { category, subject, description, state, district, constituency, boothId, priority } = body;

    const errors = {};
    if (!category || !isAllowedValue(category, ALLOWED_COMPLAINT_CATEGORIES)) errors.category = "Category is required";
    if (typeof subject !== "string" || subject.trim().length < 10 || subject.length > 160) errors.subject = "Subject must be between 10 and 160 characters";
    if (typeof description !== "string" || description.trim().length < 30 || description.length > 5000) errors.description = "Description must be between 30 and 5000 characters";
    if (typeof state !== "string" || !state.trim() || state.length > 100) errors.state = "State is required";
    if (typeof district !== "string" || !district.trim() || district.length > 100) errors.district = "District is required";
    if (constituency !== undefined && typeof constituency !== "string") errors.constituency = "Constituency must be text";
    if (boothId !== undefined && typeof boothId !== "string") errors.boothId = "Booth ID must be text";
    if (!priority || !isAllowedValue(priority, ALLOWED_COMPLAINT_PRIORITIES)) errors.priority = "Priority is required";

    if (Object.keys(errors).length > 0) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const db = await database.getDb();
    await db.collection("complaints").createIndex({ complaintId: 1 }, { unique: true, sparse: true });

    const counter = await db.collection("counters").findOneAndUpdate(
      { _id: "complaintId" },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    if (!Number.isInteger(counter?.value)) {
      throw new Error("Complaint counter did not return a valid sequence value.");
    }
    const complaintId = `CMP-${String(counter.value).padStart(5, "0")}`;

    const complaint = {
      complaintId,
      userId: user.userId,
      userName: user.name,
      userPhone: user.phone,
      category,
      subject: subject.trim(),
      description: description.trim(),
      state: state.trim(),
      district: district.trim(),
      constituency: constituency?.trim() || "",
      boothId: boothId?.trim() || "",
      boothName: "",
      priority,
      status: "Pending",
      adminNotes: "",
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

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
