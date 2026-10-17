-- Past years' allowances, so changing someone's allowance doesn't rewrite last year's carry-over.
CREATE TABLE "AllowanceYear" (
    "membershipId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days" DECIMAL(4,1),

    CONSTRAINT "AllowanceYear_pkey" PRIMARY KEY ("membershipId","year")
);

ALTER TABLE "AllowanceYear" ADD CONSTRAINT "AllowanceYear_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
