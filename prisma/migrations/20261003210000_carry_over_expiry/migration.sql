-- Deadline ("MM-DD") by which carried-over vacation days must be taken.
ALTER TABLE "WorkspaceSettings" ADD COLUMN "carryOverExpiry" TEXT;
