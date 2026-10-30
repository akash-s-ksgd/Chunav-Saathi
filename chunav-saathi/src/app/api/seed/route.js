import { seedDatabase } from "@/lib/seed";

// POST /api/seed — Seed the database with sample data
export async function POST(req) {
  try {
    // Basic protection: require a seed key or admin auth
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key !== "chunav-saathi-seed-2024" && process.env.NODE_ENV === "production") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedDatabase();

    return Response.json({
      message: "Database seeded successfully!",
      counts: result,
      credentials: {
        admin: { phone: "9999900000", password: "admin123" },
        citizen: { phone: "see database", password: "citizen123" },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
