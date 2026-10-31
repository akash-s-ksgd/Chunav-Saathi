// Demo-safe, per-instance in-memory rate limiter.
// This is intentionally not distributed and is meant only for local/demo usage.
const buckets = new Map();

export function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key) || [];
  const recent = bucket.filter((timestamp) => timestamp > now - windowMs);

  if (recent.length >= limit) {
    const resetAt = recent[0] + windowMs;
    return { allowed: false, remaining: 0, resetAt };
  }

  recent.push(now);
  buckets.set(key, recent);

  return {
    allowed: true,
    remaining: Math.max(limit - recent.length, 0),
    resetAt: now + windowMs,
  };
}
