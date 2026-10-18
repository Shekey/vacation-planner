/**
 * Rules for what usage statistics may see. The app shows employees' names and absences, so analytics are
 * restricted by where the visitor is: the public pages get full measurement, the signed-in app only anonymous
 * page counts, and the operator and sign-in-by-link areas nothing at all. Pure, so it is tested.
 */

export type AnalyticsMode = "full" | "pageviews" | "none";

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/impressum", "/datenschutz", "/agb", "/avv"]);

/** Only the path, with every identifier removed: slugs, ids and tokens never leave the browser. */
export function sanitizePath(rawPath: string): string {
  const path = rawPath.split(/[?#]/)[0] || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "invite") return "/invite/*"; // the token in the URL is a credential
  if (parts[0] === "w" && parts.length >= 2) return `/w/*${parts[2] ? `/${parts[2]}` : ""}`; // slug and ids dropped
  if (parts[0] === "admin") return "/admin";
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

/**
 * What may be recorded on this path:
 * - "full": public pages (landing, sign-in, legal): page views, clicks and, if on, session replay with masked inputs
 * - "pageviews": the signed-in app: a page view with the cleaned path, nothing else (no clicks, no replay: names are on screen)
 * - "none": the operator area and the second-factor page
 */
export function analyticsMode(rawPath: string): AnalyticsMode {
  const path = rawPath.split(/[?#]/)[0] || "/";
  if (path.startsWith("/admin") || path.startsWith("/two-factor")) return "none";
  return PUBLIC_PATHS.has(path.replace(/\/+$/, "") || "/") ? "full" : "pageviews";
}

/** An absolute URL reduced to origin plus cleaned path (no query, no hash), or "" when it can't be read. */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${sanitizePath(u.pathname)}`;
  } catch {
    return "";
  }
}

type EventLike = { event: string; properties?: Record<string, unknown> };

/**
 * The filter every PostHog event passes before it is sent. Returns null to drop the event. `path` is where the
 * visitor is now. In the signed-in app only our own page views get through; everything has its URLs cleaned.
 */
export function filterEvent<T extends EventLike>(event: T, path: string): T | null {
  const mode = analyticsMode(path);
  if (mode === "none") return null;
  if (mode === "pageviews" && event.event !== "$pageview") return null;
  if (event.properties) {
    for (const key of ["$current_url", "$referrer", "$initial_referrer", "$initial_current_url"]) {
      const value = event.properties[key];
      if (typeof value === "string") event.properties[key] = value === "$direct" ? value : sanitizeUrl(value);
    }
    if (typeof event.properties["$pathname"] === "string") event.properties["$pathname"] = sanitizePath(event.properties["$pathname"] as string);
    // Search terms and the like in the query string are not ours to keep.
    delete event.properties["$initial_pathname"];
  }
  return event;
}
