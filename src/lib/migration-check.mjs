// Plain JS so the CI script (scripts/check-migrations.mjs) can run it without a build.

// Statements that break the code still running while a deploy rolls out (expand/contract, see README).
const BREAKING = [
  { pattern: /\bDROP\s+COLUMN\b/i, what: "DROP COLUMN" },
  { pattern: /\bDROP\s+TABLE\b/i, what: "DROP TABLE" },
  { pattern: /\bRENAME\b/i, what: "RENAME" },
];

/**
 * Breaking statements in a migration, with their line numbers. Comments and string literals are ignored.
 * @param {string} sql
 * @returns {{ what: string, line: number }[]}
 */
export function breakingStatements(sql) {
  // Blank out comments and strings but keep newlines, so line numbers still match the file.
  const blank = (text) => text.replace(/[^\n]/g, " ");
  const code = sql.replace(/\/\*[\s\S]*?\*\/|--[^\n]*|'(?:[^']|'')*'/g, blank);
  const found = [];
  code.split("\n").forEach((text, index) => {
    for (const { pattern, what } of BREAKING) {
      if (pattern.test(text)) found.push({ what, line: index + 1 });
    }
  });
  return found;
}

/**
 * Problems with the migration files a PR touches. Existing migrations may only be added to, never changed or removed,
 * because production has already run them.
 * @param {{ status: string, path: string, sql?: string }[]} changes git status letter (A, M, D, R…) and path
 * @returns {string[]}
 */
export function migrationProblems(changes) {
  const problems = [];
  for (const { status, path, sql } of changes) {
    if (!/^prisma\/migrations\/[^/]+\/migration\.sql$/.test(path)) continue;
    if (status !== "A") {
      problems.push(`${path}: an existing migration was ${status === "D" ? "removed" : "changed"}; add a new one instead`);
      continue;
    }
    for (const { what, line } of breakingStatements(sql ?? "")) {
      problems.push(`${path}:${line}: ${what}`);
    }
  }
  return problems;
}
