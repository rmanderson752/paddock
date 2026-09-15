/**
 * Only follow same-origin paths after sign-in — never an absolute URL or a
 * protocol-relative one smuggled in through the query string.
 */
export function safeRedirectPath(value: unknown, fallback = "/portfolio"): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/signup")) return fallback;
  return value;
}
