import { getDb } from "@/lib/mongodb";
import { hashPassword, generateToken } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { validatePassword } from "@/lib/validation";

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit({ key: `register:${ip}:${(await req.clone().json()).phone || "unknown"}`, limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limitResult.allowed) {
      return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { name, phone, password, confirmPassword, state, district, constituency, epicNumber } = body;

    const errors = {};

    if (!name || name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
      errors.phone = "Valid 10-digit phone number required";
    }
    if (!validatePassword(password)) {
      errors.password = "Password must be at least 8 characters and include a letter and a number";
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
    const existing = await db.collection("users").findOne({ phone });
    if (existing) {
      return Response.json(
        { error: "An account with this phone number already exists" },
        { status: 409 }
      );
    }

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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);

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
