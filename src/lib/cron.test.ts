import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
import * as Sentry from "@sentry/nextjs";
import { forEachWithin, reportCronRun } from "./cron";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("forEachWithin", () => {
  it("runs every item, at most `concurrency` at a time", async () => {
    let running = 0;
    let most = 0;
    const seen: number[] = [];
    const run = await forEachWithin(
      [1, 2, 3, 4, 5, 6, 7],
      async (n) => {
        most = Math.max(most, ++running);
        await new Promise((r) => setTimeout(r, 1));
        seen.push(n);
        running--;
      },
      { concurrency: 3 },
    );
    expect(run).toEqual({ done: 7, failed: 0, skipped: 0 });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(most).toBe(3);
  });

  it("counts a failing item and carries on", async () => {
    const run = await forEachWithin([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("slow upstream");
    });
    expect(run).toEqual({ done: 2, failed: 1, skipped: 0 });
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it("starts nothing new once the budget is spent", async () => {
    let clock = 0;
    const run = await forEachWithin(
      [1, 2, 3, 4, 5],
      async () => {
        clock += 10;
      },
      { concurrency: 1, budgetMs: 25, now: () => clock },
    );
    expect(run).toEqual({ done: 3, failed: 0, skipped: 2 });
  });

  it("handles an empty list", async () => {
    expect(await forEachWithin([], async () => {})).toEqual({ done: 0, failed: 0, skipped: 0 });
  });
});

describe("reportCronRun", () => {
  it("pings the job's heartbeat URL after a clean run", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("OK"));
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("CRON_HEARTBEAT_DAILY_DIGEST", "https://hc-ping.com/abc");
    await reportCronRun("daily-digest", []);
    expect(fetch.mock.calls[0][0]).toBe("https://hc-ping.com/abc");
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("pings /fail and tells Sentry when something was skipped", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("OK"));
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("CRON_HEARTBEAT_HOUSEKEEPING", "https://hc-ping.com/abc/");
    await reportCronRun("housekeeping", ["purge: timeout"]);
    expect(fetch.mock.calls[0][0]).toBe("https://hc-ping.com/abc/fail");
    expect(Sentry.captureMessage).toHaveBeenCalledOnce();
  });

  it("does nothing without a URL and never throws when the monitor is down", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetch);
    await reportCronRun("holidays", []);
    expect(fetch).not.toHaveBeenCalled();
    vi.stubEnv("CRON_HEARTBEAT_HOLIDAYS", "https://hc-ping.com/abc");
    await expect(reportCronRun("holidays", [])).resolves.toBeUndefined();
  });
});
