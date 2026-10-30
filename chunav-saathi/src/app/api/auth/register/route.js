import { getDb } from "@/lib/mongodb";
import { hashPassword, generateToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, phone, password, confirmPassword, state, district, constituency, epicNumber } = body;

    // ── Validation ──────────────────────────────────────────────
    const errors = {};

    if (!name || name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
      errors.phone = "Valid 10-digit phone number required";
    }
    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    if (!state) {
      errors.state = "State is required";
    }
    if (!district) {
      errors.district = "District is required";
    }

    if (Object.keys(errors).length > 0) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const db = await getDb();

    // ── Check if phone already exists ───────────────────────────
    const existing = await db.collection("users").findOne({ phone });
    if (existing) {
      return Response.json(
        { error: "An account with this phone number already exists" },
        { status: 409 }
      );
    }

    // ── Create user ─────────────────────────────────────────────
    const hashedPassword = await hashPassword(password);
    const user = {
      name: name.trim(),
      phone,
      password: hashedPassword,
      role: "citizen",
      state,
      district,
      constituency: constituency || "",
      epicNumber: epicNumber ? epicNumber.toUpperCase() : "",
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);

    // ── Generate JWT ────────────────────────────────────────────
    const token = generateToken({
      userId: result.insertedId.toString(),
      role: "citizen",
      name: user.name,
      phone: user.phone,
      state: user.state,
      district: user.district,
      constituency: user.constituency,
    });

    return Response.json({
      message: "Registration successful",
      token,
      user: {
        id: result.insertedId.toString(),
        name: user.name,
        phone: user.phone,
        role: user.role,
        state: user.state,
        district: user.district,
        constituency: user.constituency,
        epicNumber: user.epicNumber,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
