import { getDb } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/users — List users (admin) or get current user profile
export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);

    // If requesting own profile
    if (searchParams.get("me") === "true") {
      const profile = await db.collection("users").findOne(
        { phone: user.phone },
        { projection: { password: 0 } }
      );
      if (!profile) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      return Response.json({ user: profile });
    }

    // Admin-only: list all users
    if (user.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const query = {};
    const search = searchParams.get("search");
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { epicNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      db.collection("users")
        .find(query, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(query),
    ]);

    return Response.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Users error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
