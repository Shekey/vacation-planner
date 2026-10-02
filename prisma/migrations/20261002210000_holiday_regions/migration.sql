-- Regional public holidays: a holiday can apply to one region, and members say where they work.
ALTER TABLE "WorkspaceSettings" ADD COLUMN "holidayRegion" TEXT;
ALTER TABLE "Membership" ADD COLUMN "holidayRegion" TEXT;
ALTER TABLE "Holiday" ADD COLUMN "region" TEXT NOT NULL DEFAULT '';

DROP INDEX "Holiday_workspaceId_date_key";
CREATE UNIQUE INDEX "Holiday_workspaceId_date_region_key" ON "Holiday"("workspaceId", "date", "region");
