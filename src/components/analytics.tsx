"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";
import { analyticsMode, filterEvent, sanitizePath } from "@/lib/analytics";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
// Session replay of the public pages only; set to "false" to turn it off.
const REPLAY = process.env.NEXT_PUBLIC_POSTHOG_REPLAY !== "false";

let started = false;

/** Starts PostHog once, in the browser, and only if a key is set and the visitor hasn't sent Do Not Track. */
function start(): boolean {
  if (started) return true;
  if (!KEY || navigator.doNotTrack === "1") return false;
  posthog.init(KEY, {
    api_host: HOST,
    ui_host: "https://eu.posthog.com",
    // Cookieless: nothing is stored in the browser, so there is nothing to consent to under § 25 TDDDG.
    persistence: "memory",
    // Nobody is identified: no sign-in link, no email, no user id goes to PostHog.
    person_profiles: "identified_only",
    respect_dnt: true,
    capture_pageview: false, // we send our own, with the address cleaned (below)
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false, // Sentry does errors
    disable_surveys: true,
    disable_conversations: true,
    // Replay is switched on per page below; inputs are always masked.
    disable_session_recording: true,
    session_recording: { maskAllInputs: true },
    // The last gate: what may be sent depends on where the visitor is (src/lib/analytics.ts).
    before_send: (event) => (event ? filterEvent(event, window.location.pathname) : null),
  });
  started = true;
  return true;
}

/**
 * Anonymous, cookieless usage statistics (PostHog, EU). Public pages: page views, clicks and a masked session replay.
 * Signed-in app: one page view per page with slugs and ids removed, and no replay. Operator area: nothing.
 */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!start()) return;
    const mode = analyticsMode(pathname);
    if (mode === "full" && REPLAY) posthog.startSessionRecording();
    else posthog.stopSessionRecording();
    if (mode !== "none") posthog.capture("$pageview", { $current_url: `${window.location.origin}${sanitizePath(pathname)}` });
  }, [pathname]);
  return null;
}
