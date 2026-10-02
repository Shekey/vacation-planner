import { notFound } from "next/navigation";
import { countDays } from "@/lib/booking-days";
import { ACTIVE_STATUSES, spanOf } from "@/lib/bookings";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/session";
import { saveBooking } from "../actions";
import { BookingForm } from "../booking-form";
import { loadBookingFormData } from "../load";

export const metadata = { title: "Change booking" };

export default async function EditBookingPage({ params }: PageProps<"/w/[slug]/book/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireMembership(slug);
  const booking = await db.booking.findFirst({
    where: { id, workspaceId: ctx.workspace.id, status: { in: ACTIVE_STATUSES } },
  });
  if (!booking) notFound();
  if (booking.membershipId !== ctx.membership.id && ctx.membership.role !== "ADMIN") notFound();

  const data = await loadBookingFormData(ctx);
  const span = spanOf(booking);
  const region = data.members.find((m) => m.id === booking.membershipId)?.region ?? "";
  const holidaySet = new Set(data.holidays.filter((h) => h.region === "" || h.region === region).map((h) => h.date));
  const ownDaysThisYear =
    booking.type === "VACATION"
      ? countDays(span, { countWeekends: data.settings.countWeekends, holidays: holidaySet }, { from: `${data.currentYear}-01-01`, to: `${data.currentYear}-12-31` })
      : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Change booking</h2>
      <BookingForm
        action={saveBooking.bind(null, slug, booking.id)}
        members={data.members.filter((m) => m.id === booking.membershipId)}
        canChooseMember={false}
        settings={data.settings}
        isAdmin={data.isAdmin}
        currentYear={data.currentYear}
        team={data.team}
        holidays={data.holidays}
        memberCount={data.memberCount}
        initial={{
          bookingId: booking.id,
          ownDaysThisYear,
          membershipId: booking.membershipId,
          type: booking.type,
          start: span.start,
          end: span.end,
          startPart: span.startPart === "PM" ? "PM" : "FULL",
          endPart: span.endPart === "AM" ? "AM" : "FULL",
          note: booking.note ?? "",
        }}
      />
    </div>
  );
}
