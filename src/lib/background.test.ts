import { describe, expect, it, vi } from "vitest";
import { afterResponse, mapLimit } from "./background";

describe("mapLimit", () => {
  it("keeps the order and never runs more than the limit at once", async () => {
    let running = 0;
    let most = 0;
    const out = await mapLimit([5, 1, 4, 2, 3, 0], 2, async (n) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, n));
      running--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30, 0]);
    expect(most).toBe(2);
  });

  it("handles an empty list", async () => {
    expect(await mapLimit([], 3, async () => 1)).toEqual([]);
  });
});

describe("afterResponse", () => {
  it("runs right away outside a request and swallows failures", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const done = vi.fn();
    await afterResponse(async () => done());
    await expect(afterResponse(async () => Promise.reject(new Error("smtp down")))).resolves.toBeUndefined();
    expect(done).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
