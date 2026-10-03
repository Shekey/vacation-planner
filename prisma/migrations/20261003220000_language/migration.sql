-- AlterTable
ALTER TABLE "User" ADD COLUMN "locale" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN "englishName" TEXT;
