import { typeColor, typeLabel } from "@/components/badges";
import { halfDayLabel, portionOn } from "@/lib/booking-days";
import { activeBookingsBetween, forViewer, spanOf } from "@/lib/bookings";
import { addDays, formatDate, formatRange, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireMembership, settingsOf } from "@/lib/session";
import { PeopleSearch, type PersonRow } from "./people-search";

export async function generateMetadata() {
  return { title: (await getMessages()).people.title };
}

export default async function PeoplePage({ params }: PageProps<"/w/[slug]/people">) {
  const { slug } = await params;
  const { workspace, membership } = await requireMembership(slug);
  const locale = await getLocale();
  const { common, people: t } = await getMessages();
  const today = todayIn(workspace.timezone);

  const [members, bookings] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId: workspace.id, removedAt: null },
      include: { user: { select: { name: true, email: true } } },
    }),
    activeBookingsBetween(workspace.id, today, addDays(today, 365)).then((bs) =>
      forViewer(bs, { membershipId: membership.id, role: membership.role }, settingsOf(workspace)),
    ),
  ]);

  const people: PersonRow[] = members
    .map((m) => {
      const own = bookings.filter((b) => b.membershipId === m.id);
      const current = own.find((b) => portionOn(spanOf(b), today));
      let todayStatus: string | null = null;
      if (current) {
        const span = spanOf(current);
        const portion = portionOn(span, today);
        const kind = typeLabel(current.type, locale);
        todayStatus =
          portion === "AM"
            ? t.offMorning(kind)
            : portion === "PM"
              ? t.offAfternoon(kind)
              : span.end === today
                ? t.offTodayBackTomorrow(kind)
                : t.offUntil(kind, formatDate(span.end, undefined, locale));
      }
      return {
        id: m.id,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        todayStatus,
        upcoming: own.slice(0, 5).map((b) => {
          const span = spanOf(b);
          const half = halfDayLabel(span, locale);
          const days = Number(b.daysCount);
          return {
            id: b.id,
            label: formatRange(span.start, span.end, locale),
            detail: `${typeLabel(b.type, locale)} · ${common.days(formatNumber(days, locale))}${half ? ` · ${half}` : ""}`,
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
