-- CreateTable
CREATE TABLE "SignInAttempt" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "sent" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignInAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignInAttempt_emailHash_createdAt_idx" ON "SignInAttempt"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "SignInAttempt_ipHash_createdAt_idx" ON "SignInAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "SignInAttempt_createdAt_idx" ON "SignInAttempt"("createdAt");
