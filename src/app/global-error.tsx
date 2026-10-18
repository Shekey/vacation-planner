"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Shown when the root layout itself fails. It replaces the whole page, so it brings its own <html> and
 * can't use the app's translations: both languages, side by side.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "3rem 1.5rem", background: "#f4f7fb", color: "#16202a" }}>
        <main style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem" }}>Something went wrong · Etwas ist schiefgelaufen</h1>
          <p style={{ opacity: 0.8 }}>
            That didn&apos;t work. Try again, and if it keeps happening, reload the page.
            <br />
            Das hat nicht geklappt. Versuche es noch einmal, und lade die Seite neu, falls es wieder passiert.
          </p>
          <button
            onClick={() => retry()}
            style={{ background: "#0284c7", color: "white", border: 0, borderRadius: "0.5rem", padding: "0.6rem 1.1rem", fontSize: "1rem", cursor: "pointer" }}
          >
            Try again · Noch einmal
          </button>
        </main>
      </body>
    </html>
  );
}
