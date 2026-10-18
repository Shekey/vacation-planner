import { scrubEvent } from "@/lib/sentry-scrub";

/**
 * One set of Sentry options for the browser, the Node server and the edge. Off when NEXT_PUBLIC_SENTRY_DSN is not
 * set, so local runs and previews send nothing. Errors only (no performance traces, no session replay), no user data,
 * and every report is scrubbed first (src/lib/sentry-scrub.ts).
 */
export function sentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Redirects and not-found pages are normal control flow in Next.js, not errors.
    ignoreErrors: [/NEXT_REDIRECT/, /NEXT_NOT_FOUND/],
    beforeSend: <T extends object>(event: T): T => scrubEvent(event),
    beforeSendTransaction: <T extends object>(event: T): T => scrubEvent(event),
    beforeBreadcrumb: <T extends object>(breadcrumb: T): T => (scrubEvent({ breadcrumbs: [breadcrumb] }).breadcrumbs as T[])[0],
  };
}
