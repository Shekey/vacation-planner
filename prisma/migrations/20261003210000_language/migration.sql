-- AlterTable
ALTER TABLE "User" ADD COLUMN "locale" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
