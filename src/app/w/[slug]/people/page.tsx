import { typeColor, typeLabel } from "@/components/badges";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, spanOf } from "@/lib/bookings";
import { addDays, formatDate, formatRange, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireMembership } from "@/lib/session";
import { PeopleSearch, type PersonRow } from "./people-search";

export const metadata = { title: "People" };

export default async function PeoplePage({ params }: PageProps<"/w/[slug]/people">) {
  const { slug } = await params;
  const { workspace } = await requireMembership(slug);
  const today = todayIn(workspace.timezone);

  const [members, bookings] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
    }),
    activeBookingsBetween(workspace.id, today, addDays(today, 365)),
  ]);

  const people: PersonRow[] = members
    .map((m) => {
      const own = bookings.filter((b) => b.membershipId === m.id);
      const current = own.find((b) => portionOn(spanOf(b), today));
      let todayStatus: string | null = null;
      if (current) {
        const span = spanOf(current);
        const portion = portionOn(span, today);
        const kind = typeLabel(current.type).toLowerCase();
        todayStatus =
          portion === "AM"
            ? `Off this morning (${kind})`
            : portion === "PM"
              ? `Off this afternoon (${kind})`
              : span.end === today
                ? `Off today (${kind}), back tomorrow`
                : `Off (${kind}) until ${formatDate(span.end)}`;
      }
      return {
        id: m.id,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        todayStatus,
        upcoming: own.slice(0, 5).map((b) => {
          const span = spanOf(b);
          const half = halfDayLabel(span);
          const days = Number(b.daysCount);
          return {
            id: b.id,
            label: formatRange(span.start, span.end),
            detail: `${typeLabel(b.type)} · ${days} ${days === 1 ? "day" : "days"}${half ? ` · ${half}` : ""}`,
            pending: b.status === "PENDING",
            color: typeColor(b.type),
          };
        }),
      };
    })
    // People who are off come first, then alphabetical.
    .sort((a, b) => Number(Boolean(b.todayStatus)) - Number(Boolean(a.todayStatus)) || a.name.localeCompare(b.name));

  return <PeopleSearch people={people} />;
}
