// Vercel build: migrate the database, then build the app.
// Preview deploys often have no database of their own; they still build, just without migrations.
import { execSync } from "node:child_process";
import { DATABASE_URL_NAMES, databaseUrl } from "../src/lib/database-url.mjs";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (databaseUrl({ direct: true })) {
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
