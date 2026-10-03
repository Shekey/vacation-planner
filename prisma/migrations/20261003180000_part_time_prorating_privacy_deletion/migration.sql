-- Part-time work days, pro-rated allowances, private sick leave, and account deletion (creator links become nullable).
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_createdById_fkey";

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "invitedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "employmentStart" DATE,
ADD COLUMN     "workDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Workspace" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "hideSickType" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

