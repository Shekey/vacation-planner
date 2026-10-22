// Plain JS so prisma.config.ts, the app and the build check can all share it.

// Vercel's Neon integration names its variables differently depending on how the
// database was connected (DATABASE_* or POSTGRES_*), so accept either.
const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

/**
 * Connection string for the app (pooled) or for migrations (direct).
 * @param {{ direct?: boolean }} [options]
 * @returns {string | undefined}
 */
export function databaseUrl({ direct = false } = {}) {
  const names = direct ? [...DIRECT, ...POOLED] : [...POOLED, ...DIRECT];
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

export const DATABASE_URL_NAMES = [...POOLED, ...DIRECT];

/**
 * Whether the Vercel build may run migrations. Production does; so do CI and local builds outside Vercel.
 * A preview usually shares the production database (the Neon integration hands every environment the same URL),
 * so a preview migrates only when its project opts in with MIGRATE_ON_PREVIEW=1, e.g. for a Neon branch per preview.
 * @param {Record<string, string | undefined>} env
 * @returns {boolean}
 */
export function shouldMigrateOnBuild(env) {
  if (env.VERCEL_ENV === "production" || !env.VERCEL_ENV) return true;
  return env.MIGRATE_ON_PREVIEW === "1";
}
