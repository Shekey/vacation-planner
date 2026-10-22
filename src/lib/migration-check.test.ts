import { describe, expect, it } from "vitest";
import { breakingStatements, migrationProblems } from "./migration-check.mjs";

const path = "prisma/migrations/20261023000000_x/migration.sql";

describe("breakingStatements", () => {
  it("finds drops and renames with their lines", () => {
    const sql = [
      'ALTER TABLE "Booking" ADD COLUMN "note" TEXT;',
      'ALTER TABLE "Booking" DROP COLUMN "old";',
      'DROP TABLE "Thing";',
      'ALTER TABLE "User" RENAME COLUMN "a" TO "b";',
      'ALTER TYPE "Kind" RENAME TO "Kind_old";',
    ].join("\n");
    expect(breakingStatements(sql)).toEqual([
      { what: "DROP COLUMN", line: 2 },
      { what: "DROP TABLE", line: 3 },
      { what: "RENAME", line: 4 },
      { what: "RENAME", line: 5 },
    ]);
  });

  it("ignores what Prisma generates for additive changes", () => {
    const sql = [
      "-- AlterTable",
      'ALTER TABLE "Workspace" ADD COLUMN "deletedAt" TIMESTAMP(3);',
      '-- CreateIndex\nCREATE INDEX "Booking_x_idx" ON "Booking"("x");',
      'ALTER TABLE "Booking" ALTER COLUMN "x" DROP DEFAULT;',
      'DROP INDEX "Old_idx";',
    ].join("\n");
    expect(breakingStatements(sql)).toEqual([]);
  });

  it("ignores comments and strings", () => {
    const sql = "-- we used to DROP TABLE here\n/* RENAME\nlater */\nUPDATE \"X\" SET a = 'rename it';";
    expect(breakingStatements(sql)).toEqual([]);
  });
});

describe("migrationProblems", () => {
  it("lists breaking statements in new migrations", () => {
    expect(migrationProblems([{ status: "A", path, sql: 'DROP TABLE "Old";' }])).toEqual([`${path}:1: DROP TABLE`]);
  });

  it("refuses changing or removing a migration production already ran", () => {
    expect(migrationProblems([{ status: "M", path }, { status: "D", path }])).toEqual([
      `${path}: an existing migration was changed; add a new one instead`,
      `${path}: an existing migration was removed; add a new one instead`,
    ]);
  });

  it("ignores other files", () => {
    expect(migrationProblems([{ status: "M", path: "prisma/schema.prisma" }, { status: "A", path: "prisma/migrations/migration_lock.toml" }])).toEqual([]);
  });
});
