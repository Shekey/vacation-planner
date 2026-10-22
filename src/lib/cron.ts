import * as Sentry from "@sentry/nextjs";

/** Work stops starting this long into a run, so what is in flight can finish before the cron route's 60 s `maxDuration`. */
export const CRON_BUDGET_MS = 40_000;

export type CronJob = "daily-digest" | "holidays" | "housekeeping";

/**
 * Runs `fn` for each item, at most `concurrency` at a time, and starts nothing new once `budgetMs` has passed.
 * A failing item is counted, not thrown, so one workspace can't stop the rest.
 */
export async function forEachWithin<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  { concurrency = 5, budgetMs = CRON_BUDGET_MS, now = Date.now }: { concurrency?: number; budgetMs?: number; now?: () => number } = {},
) {
  const deadline = now() + budgetMs;
  let next = 0;
  let done = 0;
  let failed = 0;
  async function worker() {
    while (next < items.length && now() < deadline) {
      const item = items[next++];
      try {
        await fn(item);
        done++;
      } catch (e) {
        failed++;
        Sentry.captureException(e);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return { done, failed, skipped: items.length - next };
}

/**
 * Tells the heartbeat monitor (Healthchecks.io or Better Stack ping URL in `CRON_HEARTBEAT_<JOB>`) how the run went,
 * and Sentry when something was skipped or failed, so a run that stops working is noticed within a day.
 */
export async function reportCronRun(job: CronJob, problems: string[]) {
  if (problems.length > 0) {
    Sentry.captureMessage(`cron ${job} incomplete`, { level: "warning", tags: { cron: job }, extra: { problems } });
  }
  const url = process.env[`CRON_HEARTBEAT_${job.toUpperCase().replace(/-/g, "_")}`];
  if (!url) return;
  try {
    // Both services take "/fail" on the ping URL as a failed run.
    await fetch(problems.length > 0 ? `${url.replace(/\/$/, "")}/fail` : url, {
      method: "POST",
      body: problems.join("\n").slice(0, 10_000),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // The monitor alerts on the missing ping.
  }
}
