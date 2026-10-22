/** The Vercel address the app had before the rename to Urlaubflow. */
export const LEGACY_HOST = "vacation-planner-lyart.vercel.app";

/**
 * Paths the old address keeps serving instead of redirecting: calendar apps don't always follow a redirect for a
 * subscribed feed, and the Stripe webhook and Vercel crons keep calling the URL they were set up with.
 */
const STAYS_ON_LEGACY_HOST = ["api/calendar", "api/stripe", "api/cron"];

/**
 * The public origin, e.g. "https://urlaubflow.de", from NEXT_PUBLIC_SITE_URL in production; null elsewhere. Set it once
 * the domain shows "Valid" in Vercel: from the next deploy, links in emails use it and the old address redirects to it.
 */
export function siteOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || process.env.VERCEL_ENV !== "production") return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

type Redirect = {
  source: string;
  has: { type: "host"; value: string }[];
  destination: string;
  permanent: true;
};

/** Host redirects for next.config.ts (308, path and query kept). None until the site origin is set. */
export function domainRedirects(): Redirect[] {
  const origin = siteOrigin();
  if (!origin) return [];
  const host = new URL(origin).host;
  const kept = STAYS_ON_LEGACY_HOST.join("|");
  return [
    {
      source: `/:path((?!(?:${kept})(?:/|$)).*)`,
      has: [{ type: "host", value: LEGACY_HOST }],
      destination: `${origin}/:path`,
      permanent: true,
    },
    // Normally Vercel's domain settings do this; the rule covers www added as a plain alias.
    {
      source: "/:path*",
      has: [{ type: "host", value: `www.${host}` }],
      destination: `${origin}/:path*`,
      permanent: true,
    },
  ];
}
