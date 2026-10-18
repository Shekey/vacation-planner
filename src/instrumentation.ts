import * as Sentry from "@sentry/nextjs";

/** Starts error reporting on the server (Node.js and edge runtimes) when the app boots. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

/** Server errors from pages, actions and route handlers, with the request's route but not its content. */
export const onRequestError = Sentry.captureRequestError;
