import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countDays } from "@/lib/booking-days";
import { ACTIVE_STATUSES, spanOf } from "@/lib/bookings";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n/server";
import { can } from "@/lib/permissions";
import { requireMembership } from "@/lib/session";
import { saveBooking } from "../actions";
import { BookingForm } from "../booking-form";
import { loadBookingFormData } from "../load";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).book.editTitle };
}

export default async function EditBookingPage({ params }: PageProps<"/w/[slug]/book/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireMembership(slug);
  const booking = await db.booking.findFirst({
    where: { id, workspaceId: ctx.workspace.id, status: { in: ACTIVE_STATUSES } },
  });
  if (!booking) notFound();
  // Someone else's booking: admins and approvers, and someone else's sick days only admins (#77).
  if (
    booking.membershipId !== ctx.membership.id &&
    (!can(ctx.membership.role, "bookings:manage-all") || (booking.type === "SICK" && !can(ctx.membership.role, "sick:see")))
  ) {
    notFound();
  }

  const data = await loadBookingFormData(ctx);
  const t = (await getMessages()).book;
  const span = spanOf(booking);
  const member = data.members.find((m) => m.id === booking.membershipId);
  const region = member?.region ?? "";
  const holidaySet = new Set(data.holidays.filter((h) => h.region === "" || h.region === region).map((h) => h.date));
  const ownDaysThisYear =
    booking.type === "VACATION"
      ? countDays(
          span,
          { countWeekends: data.settings.countWeekends, workDays: member?.workDays, holidays: holidaySet },
          { from: `${data.currentYear}-01-01`, to: `${data.currentYear}-12-31` },
        )
      : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t.editTitle}</h2>
      <BookingForm
        action={saveBooking.bind(null, slug, booking.id)}
        members={data.members.filter((m) => m.id === booking.membershipId)}
        canChooseMember={false}
        settings={data.settings}
        roles={data.roles}
        currentYear={data.currentYear}
        team={data.team}
        holidays={data.holidays}
        memberCount={data.memberCount}
        initial={{
          bookingId: booking.id,
          ownDaysThisYear,
          membershipId: booking.membershipId,
          type: booking.type,
          specialReason: booking.specialReason,
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
