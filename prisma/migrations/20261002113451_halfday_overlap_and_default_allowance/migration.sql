-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "defaultAllowanceDays" DECIMAL(4,1) DEFAULT 20;

-- Overlap is checked in half-day units so a morning and an afternoon booking can share a date.
-- Day d maps to [2d, 2d+2); starting PM adds 1 to the start, ending AM subtracts 1 from the end.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_no_overlap";

CREATE FUNCTION booking_halfday_range(s date, sp "DayPart", e date, ep "DayPart") RETURNS int4range
LANGUAGE sql IMMUTABLE AS $$
  SELECT int4range((s - DATE '2000-01-01') * 2 + CASE WHEN sp::text = 'PM' THEN 1 ELSE 0 END,
                   (e - DATE '2000-01-01') * 2 + CASE WHEN ep::text = 'AM' THEN 1 ELSE 2 END)
$$;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "membershipId" WITH =,
    booking_halfday_range("startDate", "startPart", "endDate", "endPart") WITH &&
  ) WHERE ("status" IN ('PENDING', 'APPROVED'));
