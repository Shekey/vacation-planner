import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.options";

// Errors in the browser. Runs before the app becomes interactive.
Sentry.init(sentryOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
