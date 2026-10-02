import { isISODate } from "@/lib/dates";
import { requireMembership } from "@/lib/session";
import { saveBooking } from "./actions";
import { BookingForm } from "./booking-form";
import { loadBookingFormData } from "./load";

export default async function BookPage({ params, searchParams }: PageProps<"/w/[slug]/book">) {
  const { slug } = await params;
  const query = await searchParams;
  const ctx = await requireMembership(slug);
  const data = await loadBookingFormData(ctx);

  const start = isISODate(query.start) ? query.start : data.today;
  const end = isISODate(query.end) && query.end >= start ? query.end : start;
  const requested = typeof query.member === "string" ? query.member : null;
  const membershipId = data.members.some((m) => m.id === requested) ? requested! : ctx.membership.id;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Book time off</h2>
      <BookingForm
        action={saveBooking.bind(null, slug, null)}
        members={data.members}
        canChooseMember={data.isAdmin && data.members.length > 1}
        settings={data.settings}
        isAdmin={data.isAdmin}
        currentYear={data.currentYear}
        team={data.team}
        holidays={data.holidays}
        memberCount={data.memberCount}
        initial={{ membershipId, type: "VACATION", start, end, startPart: "FULL", endPart: "FULL", note: "" }}
      />
    </div>
  );
}
