-- Two-factor sign-in for the operator's team.
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN "totpLastStep" INTEGER,
ADD COLUMN "totpFailedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totpLockedUntil" TIMESTAMP(3),
ADD COLUMN "recoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Session" ADD COLUMN "twoFactorVerifiedAt" TIMESTAMP(3);
