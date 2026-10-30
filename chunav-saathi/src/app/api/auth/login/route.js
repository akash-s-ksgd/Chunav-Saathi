import { getDb } from "@/lib/mongodb";
import { verifyPassword, generateToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    // ── Validation ──────────────────────────────────────────────
    if (!phone || !password) {
      return Response.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // ── Find user ───────────────────────────────────────────────
    const user = await db.collection("users").findOne({ phone });
    if (!user) {
      return Response.json(
        { error: "No account found with this phone number" },
        { status: 401 }
      );
    }

    // ── Verify password ─────────────────────────────────────────
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return Response.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // ── Generate JWT ────────────────────────────────────────────
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      phone: user.phone,
      state: user.state || "",
      district: user.district || "",
      constituency: user.constituency || "",
    });

    return Response.json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        role: user.role,
        state: user.state || "",
        district: user.district || "",
        constituency: user.constituency || "",
        epicNumber: user.epicNumber || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
