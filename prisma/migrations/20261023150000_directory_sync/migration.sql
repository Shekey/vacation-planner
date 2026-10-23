-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "directoryConnectedAt" TIMESTAMP(3),
ADD COLUMN     "directoryGroupId" TEXT,
ADD COLUMN     "directoryGroupName" TEXT,
ADD COLUMN     "directoryNoticeKey" TEXT,
ADD COLUMN     "directoryTenantId" TEXT;
