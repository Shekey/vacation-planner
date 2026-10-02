-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "calendarToken" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "holidayCountry" TEXT,
ADD COLUMN     "maxCarryOverDays" DECIMAL(4,1),
ADD COLUMN     "minPeoplePresent" INTEGER,
ADD COLUMN     "teamsWebhookUrl" TEXT;

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_workspaceId_date_key" ON "Holiday"("workspaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_calendarToken_key" ON "Membership"("calendarToken");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

