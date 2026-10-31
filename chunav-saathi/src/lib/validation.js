export const ALLOWED_COMPLAINT_STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];
export const ALLOWED_COMPLAINT_PRIORITIES = ["Low", "Medium", "High"];
export const ALLOWED_COMPLAINT_CATEGORIES = [
  "Booth Accessibility",
  "Booth Distance",
  "Staff Behavior",
  "EVM Malfunction",
  "Queue Management",
  "Voter ID Issues",
  "Misinformation",
  "Infrastructure",
  "Transportation",
  "Other",
];
export const EPIC_NUMBER_PATTERN = /^[A-Z]{3}\d{7}$/;

export function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function clampPage(value, defaultValue = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, 100);
}

export function clampLimit(value, defaultValue = 20) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return defaultValue;
  return Math.min(parsed, 100);
}

export function validatePassword(password) {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;
  if (!/[A-Za-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  return true;
}

export function validateEpicNumber(value) {
  return typeof value === "string" && EPIC_NUMBER_PATTERN.test(value.trim().toUpperCase());
}

export function normalizeText(value, defaultValue = "") {
  if (typeof value !== "string") return defaultValue;
  const trimmed = value.trim();
  return trimmed || defaultValue;
}

export function sanitizeSearch(value) {
  return escapeRegex(normalizeText(value, ""));
}

export function isAllowedValue(value, allowedValues) {
  return allowedValues.includes(value);
}

export function buildComplaintUpdate(fields, userRole) {
  const update = { updatedAt: new Date() };
  const allowedAdmin = ["status", "adminNotes", "priority"];
  const allowedCitizen = ["subject", "description", "priority"];

  for (const key of allowedAdmin) {
    if (fields[key] !== undefined && (userRole === "admin" || key !== "status")) {
      update[key] = fields[key];
    }
  }

  for (const key of allowedCitizen) {
    if (fields[key] !== undefined && userRole !== "admin") {
      update[key] = fields[key];
    }
  }

  if (fields.status === "Resolved" && userRole === "admin") {
    update.resolvedAt = new Date();
  }

  return update;
}
