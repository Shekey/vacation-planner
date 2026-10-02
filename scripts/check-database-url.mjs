import { DATABASE_URL_NAMES, databaseUrl } from "../src/lib/database-url.mjs";

if (!databaseUrl({ direct: true })) {
  console.error(
    [
      "No database URL is set, so migrations can't run.",
      `Set one of: ${DATABASE_URL_NAMES.join(", ")}.`,
      "On Vercel: open Storage, connect a Neon database to this project, then redeploy.",
    ].join("\n"),
  );
  process.exit(1);
}
