-- CreateTable
CREATE TABLE "KeepCarriedOver" (
    "membershipId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "KeepCarriedOver_pkey" PRIMARY KEY ("membershipId","year")
);

-- AddForeignKey
ALTER TABLE "KeepCarriedOver" ADD CONSTRAINT "KeepCarriedOver_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
