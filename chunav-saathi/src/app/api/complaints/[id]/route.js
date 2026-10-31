import { database } from "../../../../lib/mongodb.js";
import { authService } from "../../../../lib/auth.js";
import {
  ALLOWED_COMPLAINT_PRIORITIES,
  ALLOWED_COMPLAINT_STATUSES,
  isAllowedValue,
} from "../../../../lib/validation.js";
import { ObjectId } from "mongodb";

// GET /api/complaints/[id] — Get a single complaint
export async function GET(req, { params }) {
  try {
    const user = authService.getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required. Please login." }, { status: 401 });
    }

    const { id } = await params;
    const db = await database.getDb();

    let complaint;
    complaint = await db.collection("complaints").findOne({ complaintId: id });
    if (!complaint && ObjectId.isValid(id)) {
      complaint = await db.collection("complaints").findOne({ _id: new ObjectId(id) });
    }

    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (user.role !== "admin" && complaint.userId !== user.userId) {
      return Response.json({ error: "You are not allowed to view this complaint." }, { status: 403 });
    }

    return Response.json({ complaint });
  } catch (error) {
    console.error("Get complaint error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/complaints/[id] — Update a complaint
export async function PUT(req, { params }) {
  try {
    const user = authService.getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const db = await database.getDb();

    let complaint = await db.collection("complaints").findOne({ complaintId: id });
    if (!complaint && ObjectId.isValid(id)) {
      complaint = await db.collection("complaints").findOne({ _id: new ObjectId(id) });
    }

    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (user.role !== "admin" && complaint.userId !== user.userId) {
      return Response.json({ error: "Not authorized to update this complaint" }, { status: 403 });
    }

    const isAdmin = user.role === "admin";
    const isOwner = complaint.userId === user.userId;
    const allowedFields = isAdmin
      ? ["status", "adminNotes", "priority"]
      : ["subject", "description", "priority"];
    const unexpectedFields = Object.keys(body).filter((field) => !allowedFields.includes(field));
    if (unexpectedFields.length > 0) {
      return Response.json({ error: "Request contains fields that cannot be updated" }, { status: 400 });
    }

    if (!isAdmin && (!isOwner || complaint.status !== "Pending")) {
      return Response.json({ error: "Only the owner can edit a pending complaint" }, { status: 403 });
    }

    const updateFields = { updatedAt: new Date() };
    if (body.status !== undefined) {
      if (!isAdmin || !isAllowedValue(body.status, ALLOWED_COMPLAINT_STATUSES)) {
        return Response.json({ error: "Invalid complaint status" }, { status: 400 });
      }
      updateFields.status = body.status;
      if (body.status === "Resolved") updateFields.resolvedAt = new Date();
    }
    if (body.priority !== undefined) {
      if (!isAllowedValue(body.priority, ALLOWED_COMPLAINT_PRIORITIES)) {
        return Response.json({ error: "Invalid complaint priority" }, { status: 400 });
      }
      updateFields.priority = body.priority;
    }
    if (body.adminNotes !== undefined) {
      if (!isAdmin || typeof body.adminNotes !== "string" || body.adminNotes.length > 1000) {
        return Response.json({ error: "Invalid admin notes" }, { status: 400 });
      }
      updateFields.adminNotes = body.adminNotes.trim();
    }
    if (body.subject !== undefined) {
      if (typeof body.subject !== "string" || body.subject.trim().length < 10 || body.subject.length > 160) {
        return Response.json({ error: "Subject must be between 10 and 160 characters" }, { status: 400 });
      }
      updateFields.subject = body.subject.trim();
    }
    if (body.description !== undefined) {
      if (typeof body.description !== "string" || body.description.trim().length < 30 || body.description.length > 5000) {
        return Response.json({ error: "Description must be between 30 and 5000 characters" }, { status: 400 });
      }
      updateFields.description = body.description.trim();
    }
    if (Object.keys(updateFields).length === 1) {
      return Response.json({ error: "No complaint fields were provided" }, { status: 400 });
    }

    await db.collection("complaints").updateOne(
      { _id: complaint._id },
      { $set: updateFields }
    );

    const updated = await db.collection("complaints").findOne({ _id: complaint._id });

    return Response.json({
      message: "Complaint updated successfully",
      complaint: updated,
    });
  } catch (error) {
    console.error("Update complaint error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/complaints/[id] — Delete a complaint
export async function DELETE(req, { params }) {
  try {
    const user = authService.getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const db = await database.getDb();

    let complaint = await db.collection("complaints").findOne({ complaintId: id });
    if (!complaint && ObjectId.isValid(id)) {
      complaint = await db.collection("complaints").findOne({ _id: new ObjectId(id) });
    }

    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (user.role !== "admin" && complaint.userId !== user.userId) {
      return Response.json({ error: "Not authorized to delete this complaint" }, { status: 403 });
    }

    await db.collection("complaints").deleteOne({ _id: complaint._id });

    return Response.json({ message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Delete complaint error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
