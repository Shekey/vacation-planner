-- Plans and Stripe billing per workspace, Slack webhook, dismissible onboarding checklist.
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'TEAM', 'BUSINESS');

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "billingStatus" TEXT,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "onboardingDismissedAt" TIMESTAMP(3),
ADD COLUMN     "slackWebhookUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");


-- Workspaces that exist before billing launches get a fresh 30-day trial instead of dropping to Free.
UPDATE "Workspace" SET "trialEndsAt" = now() + interval '30 days';
