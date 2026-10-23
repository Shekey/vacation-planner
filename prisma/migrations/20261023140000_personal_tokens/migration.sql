-- Personal tokens for AI assistants (#45). A new table and a new column with a default; nothing existing changes.
ALTER TABLE "WorkspaceSettings" ADD COLUMN "assistantAccess" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PersonalToken" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PersonalToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PersonalToken_tokenHash_key" ON "PersonalToken"("tokenHash");
CREATE INDEX "PersonalToken_membershipId_idx" ON "PersonalToken"("membershipId");

ALTER TABLE "PersonalToken" ADD CONSTRAINT "PersonalToken_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
