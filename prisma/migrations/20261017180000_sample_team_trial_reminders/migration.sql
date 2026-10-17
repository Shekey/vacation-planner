-- Sample team: made-up members an admin can add and remove in one click.
ALTER TABLE "Membership" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkspaceSettings" ADD COLUMN "teamType" TEXT;

-- Trial reminder emails, sent once each; the date a cancelled subscription stops.
ALTER TABLE "Workspace" ADD COLUMN "cancelAt" TIMESTAMP(3),
ADD COLUMN "trialReminder7SentAt" TIMESTAMP(3),
ADD COLUMN "trialReminder1SentAt" TIMESTAMP(3);
