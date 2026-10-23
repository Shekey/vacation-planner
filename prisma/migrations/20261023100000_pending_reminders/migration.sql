-- Reminders and stand-ins for pending requests (#80). Only new nullable columns; older pending requests count from createdAt.
ALTER TABLE "WorkspaceSettings" ADD COLUMN "reminderDays" INTEGER DEFAULT 3;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "autoApproveDays" INTEGER;
ALTER TABLE "Membership" ADD COLUMN "awayUntil" DATE;
ALTER TABLE "Booking" ADD COLUMN "pendingSince" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "remindedAt" TIMESTAMP(3);
