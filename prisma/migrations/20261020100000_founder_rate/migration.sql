-- Workspaces created during the free beta keep a founder discount when they subscribe.
ALTER TABLE "Workspace" ADD COLUMN "founderRate" BOOLEAN NOT NULL DEFAULT false;

-- Everything that exists before the beta ends was created during the beta, except what already pays.
UPDATE "Workspace" SET "founderRate" = true WHERE "stripeSubscriptionId" IS NULL;
