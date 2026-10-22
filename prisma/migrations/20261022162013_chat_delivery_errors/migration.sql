-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "slackError" TEXT,
ADD COLUMN     "slackErrorAt" TIMESTAMP(3),
ADD COLUMN     "teamsError" TEXT,
ADD COLUMN     "teamsErrorAt" TIMESTAMP(3);
