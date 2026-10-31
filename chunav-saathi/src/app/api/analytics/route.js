import { database } from "../../../lib/mongodb.js";
import { authService } from "../../../lib/auth.js";

// GET /api/analytics — Aggregated analytics data with filters
export async function GET(req) {
  try {
    const user = authService.getUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const db = await database.getDb();

    const match = {};
    const state = searchParams.get("state");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const userId = searchParams.get("userId");

    if (state && state !== "all") match.state = state;
    if (category && category !== "all") match.category = category;
    if (status && status !== "all") match.status = status;
    if (priority && priority !== "all") match.priority = priority;
    if (userId && user?.role === "admin") match.userId = userId;

    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) match.createdAt.$lte = new Date(`${dateTo}T23:59:59Z`);
    }

    const isAdmin = user?.role === "admin";
    const [
      totalComplaints,
      statusBreakdown,
      categoryBreakdown,
      stateBreakdown,
      priorityBreakdown,
      monthlyTrend,
      recentComplaints,
      topUsers,
      avgResolutionTime,
      boothStats,
      electionStats,
    ] = await Promise.all([
      db.collection("complaints").countDocuments(match),
      db.collection("complaints").aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      db.collection("complaints").aggregate([
        { $match: match },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      db.collection("complaints").aggregate([
        { $match: match },
        { $group: { _id: "$state", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).toArray(),
      db.collection("complaints").aggregate([
        { $match: match },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      db.collection("complaints").aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]).toArray(),
      isAdmin
        ? db.collection("complaints").find(match).sort({ createdAt: -1 }).limit(10).project({
            userId: 0,
            userName: 0,
            userPhone: 0,
            subject: 0,
            description: 0,
            adminNotes: 0,
          }).toArray()
        : [],
      isAdmin
        ? db.collection("complaints").aggregate([
            { $match: match },
            { $group: { _id: "$userId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]).toArray()
        : [],
      db.collection("complaints").aggregate([
        { $match: { ...match, status: "Resolved", resolvedAt: { $ne: null } } },
        {
          $project: {
            resolutionDays: {
              $divide: [
                { $subtract: ["$resolvedAt", "$createdAt"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: "$resolutionDays" } } },
      ]).toArray(),
      db.collection("booths").aggregate([
        {
          $group: {
            _id: null,
            totalBooths: { $sum: 1 },
            accessibleBooths: { $sum: { $cond: ["$isAccessible", 1, 0] } },
            avgCapacity: { $avg: "$capacity" },
          },
        },
      ]).toArray(),
      db.collection("elections").find({}).toArray(),
    ]);

    const resolved = statusBreakdown.find((s) => s._id === "Resolved")?.count || 0;
    const pending = statusBreakdown.find((s) => s._id === "Pending")?.count || 0;
    const inProgress = statusBreakdown.find((s) => s._id === "In Progress")?.count || 0;

    return Response.json({
      kpis: {
        totalComplaints,
        resolvedCount: resolved,
        pendingCount: pending,
        inProgressCount: inProgress,
        resolutionRate: totalComplaints > 0 ? ((resolved / totalComplaints) * 100).toFixed(1) : 0,
        avgResolutionDays: avgResolutionTime[0]?.avgDays?.toFixed(1) || "N/A",
        totalBooths: boothStats[0]?.totalBooths || 0,
        accessibleBooths: boothStats[0]?.accessibleBooths || 0,
      },
      charts: {
        statusBreakdown: statusBreakdown.map((s) => ({ label: s._id, value: s.count })),
        categoryBreakdown: categoryBreakdown.map((c) => ({ label: c._id, value: c.count })),
        stateBreakdown: stateBreakdown.map((s) => ({ label: s._id, value: s.count })),
        priorityBreakdown: priorityBreakdown.map((p) => ({ label: p._id, value: p.count })),
        monthlyTrend: monthlyTrend.map((m) => ({
          label: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
          value: m.count,
        })),
      },
      topUsers: isAdmin
        ? topUsers.map((item, index) => ({ label: `Reporter ${index + 1}`, count: item.count }))
        : undefined,
      recentComplaints: isAdmin ? recentComplaints : undefined,
      elections: electionStats,
      filters: {
        states: await db.collection("complaints").distinct("state"),
        categories: await db.collection("complaints").distinct("category"),
        statuses: await db.collection("complaints").distinct("status"),
        priorities: await db.collection("complaints").distinct("priority"),
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
