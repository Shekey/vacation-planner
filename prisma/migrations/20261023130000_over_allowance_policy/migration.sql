-- What happens when someone books more vacation than they have left (#82). Existing workspaces keep today's warning.
CREATE TYPE "OverAllowance" AS ENUM ('WARN', 'APPROVAL', 'BLOCK');

ALTER TABLE "WorkspaceSettings" ADD COLUMN "overAllowance" "OverAllowance" NOT NULL DEFAULT 'WARN';
