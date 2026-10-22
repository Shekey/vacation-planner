import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

/**
 * Baseline browser protections for every response. There's deliberately no script CSP:
 * clickjacking, MIME sniffing and token leaks through the Referer header are the real risks here.
 */
const securityHeaders = [
  // Nobody can frame the app (clickjacking), inject a <base> tag or load plugins.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Invite and calendar-feed tokens live in URLs; other sites only ever see our origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** Pages and feeds whose URL is a secret: keep them out of search engines and shared caches. */
const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/invite/:path*", headers: noIndex },
      { source: "/sign-in/confirm", headers: noIndex },
      { source: "/api/:path*", headers: noIndex },
      { source: "/w/:path*", headers: noIndex },
    ];
  },
};

/**
 * Sentry's build step uploads source maps (so an error points at the real line) when SENTRY_AUTH_TOKEN, SENTRY_ORG and
 * SENTRY_PROJECT are set in Vercel; without them it uploads nothing and the build is the same as before. The maps are
 * deleted from the deployed files after the upload, and Sentry's own build telemetry is off.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
