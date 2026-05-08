const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(input: string): string {
  return input.replace(CONTROL_CHAR_REGEX, "").trim();
}

/**
 * Sanitize a search term for safe interpolation into PostgREST .or() filter strings.
 * Strips control chars and PostgREST metacharacters (, ( ) \) that could inject
 * additional filter conditions, then hard-caps at 200 chars.
 */
export function sanitizeSearchTerm(input: string): string {
  return input
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(/[,()\\]/g, "")
    .trim()
    .substring(0, 200);
}

/**
 * Escape HTML special characters to prevent XSS when inserting user data into HTML templates.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function sanitizeStoragePath(input: string): string {
  const cleaned = input
    .replace(/\\/g, "/")
    .replace(/\.\.+/g, "")
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9/_\-.]/g, "")
    .replace(/\/{2,}/g, "/");
  return cleaned.endsWith("/") || cleaned === "" ? cleaned : `${cleaned}/`;
}
