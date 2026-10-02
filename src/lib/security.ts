import { timingSafeEqual } from "node:crypto";

/**
 * A same-site path that's safe to redirect to, or the fallback.
 * Rejects absolute URLs and protocol-relative tricks like "//evil.com" and "/\evil.com",
 * which browsers treat as another host.
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters (tabs, newlines) are stripped by browsers and can hide a "//".
  if (/[\x00-\x1f\x7f]/.test(value)) return fallback;
  return value;
}

/** Compares secrets in constant time so response timing doesn't leak how much matched. */
export function secretsMatch(given: string | null | undefined, expected: string | null | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the request carries the CRON_SECRET bearer token that Vercel Cron sends. */
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return secretsMatch(req.headers.get("authorization"), secret ? `Bearer ${secret}` : null);
}
