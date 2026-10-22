import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

/**
 * Runs `task` after the response is sent, so a slow email or chat service never makes the person wait for
 * a booking that is already saved. Outside a request (crons, tests) there is no response to wait for, so it
 * runs right away. Never throws: a failure is logged and reported, like the senders themselves do.
 */
export async function afterResponse(task: () => Promise<unknown>): Promise<void> {
  const run = async () => {
    try {
      await task();
    } catch (e) {
      console.error("[background] task failed", e);
      Sentry.captureException(e);
    }
  };
  try {
    after(run);
  } catch {
    await run();
  }
}

/** How many emails go out at once when an admin sends many (invitations, welcome mails after an import). */
export const SEND_CONCURRENCY = 5;

/** Like Promise.all over `items`, with at most `limit` of them running at once. Results keep the input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
