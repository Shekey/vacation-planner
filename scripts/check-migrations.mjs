// CI: fail a PR whose migrations drop or rename something, unless it carries the label breaking-migration.
// Usage: node scripts/check-migrations.mjs <base-ref>   (BREAKING_MIGRATION_LABEL=1 when the label is set)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { migrationProblems } from "../src/lib/migration-check.mjs";

const base = process.argv[2] ?? "origin/main";
const diff = execFileSync("git", ["diff", "--name-status", "--no-renames", `${base}...HEAD`, "--", "prisma/migrations"], {
  encoding: "utf8",
});
const changes = diff
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [status, path] = line.split("\t");
    return { status, path, sql: status === "A" ? readFileSync(path, "utf8") : undefined };
  });

const problems = migrationProblems(changes);
if (problems.length === 0) {
  console.log("Migrations are additive.");
} else if (process.env.BREAKING_MIGRATION_LABEL === "1") {
  console.log(["Breaking migration, allowed by the breaking-migration label:", ...problems].join("\n  "));
} else {
  console.error(
    [
      "This PR's migrations would break the app that is still live while the deploy rolls out:",
      ...problems.map((problem) => `  ${problem}`),
      "",
      "Expand, then contract: add the new column or table and switch the code over in this PR;",
      "drop or rename the old one in a later PR, once no deployed code uses it (README, \"Database changes\").",
      "If this is that later PR, or you accept the downtime, add the label breaking-migration.",
    ].join("\n"),
  );
  process.exit(1);
}
