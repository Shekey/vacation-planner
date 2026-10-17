-- Time-limited support access, switched on by a workspace admin.
ALTER TABLE "Workspace" ADD COLUMN "supportAccessUntil" TIMESTAMP(3);
