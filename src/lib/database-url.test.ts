import { describe, expect, it } from "vitest";
import { shouldMigrateOnBuild } from "./database-url.mjs";

describe("shouldMigrateOnBuild", () => {
  it("migrates production, CI and local builds", () => {
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldMigrateOnBuild({})).toBe(true);
  });

  it("leaves the database alone on previews unless they opt in", () => {
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "development" })).toBe(false);
    expect(shouldMigrateOnBuild({ VERCEL_ENV: "preview", MIGRATE_ON_PREVIEW: "1" })).toBe(true);
  });
});
