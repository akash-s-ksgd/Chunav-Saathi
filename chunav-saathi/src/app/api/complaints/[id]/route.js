import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// GET /api/complaints/[id] — Get a single complaint
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    let complaint;
    // Try by complaintId first, then by MongoDB _id
    complaint = await db.collection("complaints").findOne({ complaintId: id });
    if (!complaint && ObjectId.isValid(id)) {
      complaint = await db.collection("complaints").findOne({ _id: new ObjectId(id) });
    }

    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
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
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const db = await getDb();

    let complaint = await db.collection("complaints").findOne({ complaintId: id });
    if (!complaint && ObjectId.isValid(id)) {
      complaint = await db.collection("complaints").findOne({ _id: new ObjectId(id) });
    }

    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Only admin or complaint owner can update
    if (user.role !== "admin" && complaint.userId !== user.userId) {
      return Response.json({ error: "Not authorized to update this complaint" }, { status: 403 });
    }

    const updateFields = { updatedAt: new Date() };

    // Admin can update status and adminNotes
    if (user.role === "admin") {
      if (body.status) updateFields.status = body.status;
      if (body.adminNotes !== undefined) updateFields.adminNotes = body.adminNotes;
      if (body.status === "Resolved") updateFields.resolvedAt = new Date();
    }

    // Owner can update description, priority
    if (complaint.userId === user.userId && complaint.status === "Pending") {
      if (body.subject) updateFields.subject = body.subject;
      if (body.description) updateFields.description = body.description;
      if (body.priority) updateFields.priority = body.priority;
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
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    let complaint = await db.collection("complaints").findOne({ complaintId: id });
    if (!complaint && ObjectId.isValid(id)) {
      complaint = await db.collection("complaints").findOne({ _id: new ObjectId(id) });
    }

    if (!complaint) {
      return Response.json({ error: "Complaint not found" }, { status: 404 });
    }

    // Only admin or complaint owner can delete
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
