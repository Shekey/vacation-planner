-- CreateTable
CREATE TABLE "CarriedOver" (
    "membershipId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days" DECIMAL(4,1) NOT NULL,

    CONSTRAINT "CarriedOver_pkey" PRIMARY KEY ("membershipId","year")
);

-- AddForeignKey
ALTER TABLE "CarriedOver" ADD CONSTRAINT "CarriedOver_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
