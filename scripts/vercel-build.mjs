// Vercel build: migrate the database, then build the app.
// Previews build without migrating unless opted in, so an unmerged migration never reaches the production database.
import { execSync } from "node:child_process";
import { DATABASE_URL_NAMES, databaseUrl, shouldMigrateOnBuild } from "../src/lib/database-url.mjs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (!shouldMigrateOnBuild(process.env)) {
  console.warn(
    `Skipping migrations on this ${process.env.VERCEL_ENV} deploy. Set MIGRATE_ON_PREVIEW=1 only when previews have their own database.`,
  );
} else if (databaseUrl({ direct: true })) {
  run("prisma migrate deploy");
} else if (process.env.VERCEL_ENV === "production") {
  console.error(
    [
      "No database URL is set, so migrations can't run.",
      `Set one of: ${DATABASE_URL_NAMES.join(", ")}.`,
      "On Vercel: open Storage, connect a Neon database to this project, then redeploy.",
    ].join("\n"),
  );
  process.exit(1);
} else {
  console.warn("No database URL is set for this environment; skipping migrations. Sign-in won't work on this deploy.");
}

run("next build");
