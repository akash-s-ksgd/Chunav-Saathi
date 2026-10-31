import { database } from "../../../../lib/mongodb.js";
import { authService } from "../../../../lib/auth.js";
import { rateLimit, getClientIp } from "../../../../lib/rateLimit.js";

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit({ key: `login:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limitResult.allowed) {
      return Response.json({ error: "Too many login attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return Response.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const db = await database.getDb();
    const user = await db.collection("users").findOne({ phone });
    if (!user) {
      return Response.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const isValid = await authService.verifyPassword(password, user.password);
    if (!isValid) {
      return Response.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const token = authService.generateToken({
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
