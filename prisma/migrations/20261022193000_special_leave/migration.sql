-- AlterEnum
ALTER TYPE "BookingType" ADD VALUE 'SPECIAL';

-- CreateEnum
CREATE TYPE "SpecialReason" AS ENUM ('WEDDING', 'BIRTH', 'BEREAVEMENT', 'MOVING', 'OTHER');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "specialReason" "SpecialReason";
