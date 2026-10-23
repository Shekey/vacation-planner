-- An optional stand-in (Vertretung) per booking (#34). A nullable column only.
ALTER TABLE "Booking" ADD COLUMN "standInId" TEXT;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_standInId_fkey" FOREIGN KEY ("standInId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Booking_standInId_idx" ON "Booking"("standInId");
