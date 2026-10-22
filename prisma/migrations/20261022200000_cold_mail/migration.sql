-- CreateTable
CREATE TABLE "ColdMail" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColdMail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ColdMail_workspaceId_createdAt_idx" ON "ColdMail"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "ColdMail" ADD CONSTRAINT "ColdMail_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
