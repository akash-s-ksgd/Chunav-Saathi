import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "chunav-saathi-dev-secret-key-change-in-production";
const TOKEN_EXPIRY = "7d";

/**
 * Hash a password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Extract user from request Authorization header
 * Returns { userId, role, name, phone, state } or null
 */
export function getUserFromRequest(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

/**
 * Higher-order function to protect API routes
 * @param {Function} handler - The route handler (req, context) => Response
 * @param {Object} options - { roles: ['admin', 'citizen'] }
 */
export function withAuth(handler, options = {}) {
  return async (req, context) => {
    const user = getUserFromRequest(req);
    if (!user) {
      return Response.json(
        { error: "Authentication required. Please login." },
        { status: 401 }
      );
    }

    if (options.roles && !options.roles.includes(user.role)) {
      return Response.json(
        { error: "Insufficient permissions." },
        { status: 403 }
      );
    }

    // Attach user to request for downstream use
    req.user = user;
    return handler(req, context);
  };
}
