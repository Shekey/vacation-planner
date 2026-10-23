import { recordAudit, bookingDetail } from "@/lib/audit";
import { approveLinkUrl } from "@/lib/approve-link";
import { availableDeciders, spanOf } from "@/lib/bookings";
import { formatRange, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isLocale, messagesFor, type Locale } from "@/lib/i18n";

const DAY = 86_400_000;

/** Whole days a request has waited. Requests from before #80 have no pendingSince and count from when they were made. */
export function waitingDays(b: { pendingSince: Date | null; createdAt: Date }, now: Date): number {
  return Math.floor((now.getTime() - (b.pendingSince ?? b.createdAt).getTime()) / DAY);
}

/** What the daily run does with one request: approve it, remind about it, or leave it. */
export function pendingStep(
  b: { pendingSince: Date | null; createdAt: Date; remindedAt: Date | null },
  settings: { reminderDays: number | null; autoApproveDays: number | null },
  now: Date,
): "autoApprove" | "remind" | null {
  const days = waitingDays(b, now);
  if (settings.autoApproveDays && days >= settings.autoApproveDays) return "autoApprove";
  if (settings.reminderDays && days >= settings.reminderDays && !b.remindedAt) return "remind";
  return null;
}

type Locales = { locale?: string | null };
const localeOf = (user: Locales, fallback: Locale): Locale => (isLocale(user.locale) ? user.locale : fallback);

/**
 * Requests nobody answered (#80), from the daily cron: after `reminderDays` the approvers who aren't away get one
 * reminder with the one-click links and the person hears that it's still pending and who was reminded; after
 * `autoApproveDays` (off unless a workspace turns it on) the request is approved automatically.
 */
export async function handlePendingRequests(origin: string, now = new Date()) {
  const workspaces = await db.workspace.findMany({
    where: {
      deletedAt: null,
      settings: { approvalsEnabled: true, OR: [{ reminderDays: { not: null } }, { autoApproveDays: { not: null } }] },
      bookings: { some: { status: "PENDING" } },
    },
    include: { settings: true },
  });

  let reminded = 0;
  let autoApproved = 0;
  for (const ws of workspaces) {
    const settings = { reminderDays: ws.settings?.reminderDays ?? null, autoApproveDays: ws.settings?.autoApproveDays ?? null };
    const fallback: Locale = isLocale(ws.settings?.locale) ? ws.settings.locale : "en";
    const today = todayIn(ws.timezone);
    const pending = await db.booking.findMany({
      where: { workspaceId: ws.id, status: "PENDING", membership: { removedAt: null } },
      include: { membership: { include: { user: true } } },
    });
    const deciders = await db.membership.findMany({
      where: { workspaceId: ws.id, role: { in: ["ADMIN", "APPROVER"] }, removedAt: null, isSample: false },
      include: { user: true },
    });

    for (const b of pending) {
      const step = pendingStep(b, settings, now);
      const person = b.membership.user;
      const who = person.name ?? person.email;
      const span = spanOf(b);

      if (step === "autoApprove") {
        // Only while still pending, so a decision made at the same moment wins.
        const { count } = await db.booking.updateMany({
          where: { id: b.id, status: "PENDING" },
          data: { status: "APPROVED", decidedAt: now, decidedById: null },
        });
        if (count === 0) continue;
        autoApproved++;
        await recordAudit({ workspaceId: ws.id, actorId: null, action: "booking.auto_approved", targetLabel: who, detail: bookingDetail(span) });
        const locale = localeOf(person, fallback);
        const t = messagesFor(locale).email;
        await sendEmail({
          to: person.email,
          subject: t.decision.subject(true),
          text: [
            t.decision.text(formatRange(span.start, span.end, locale), ws.name, true),
            t.autoApproved(settings.autoApproveDays!),
            `${origin}/w/${ws.slug}/me`,
          ].join("\n\n"),
        });
        continue;
      }

      if (step === "remind") {
        const claimed = await db.booking.updateMany({ where: { id: b.id, status: "PENDING", remindedAt: null }, data: { remindedAt: now } });
        if (claimed.count === 0) continue;
        const to = availableDeciders(
          deciders.filter((d) => d.id !== b.membershipId),
          today,
        );
        if (to.length === 0) continue;
        reminded++;
        const days = waitingDays(b, now);
        for (const d of to) {
          const locale = localeOf(d.user, fallback);
          const { email, common } = messagesFor(locale);
          const link = { bookingId: b.id, membershipId: d.id };
          await sendEmail({
            to: d.user.email,
            subject: email.reminder.subject(who, days),
            text: email.reminder.text(who, common.days(String(Number(b.daysCount))), formatRange(span.start, span.end, locale), ws.name, days, {
              approve: approveLinkUrl(origin, link, "approve", now),
              decline: approveLinkUrl(origin, link, "decline", now),
              all: `${origin}/w/${ws.slug}/approvals`,
            }),
          });
        }
        const locale = localeOf(person, fallback);
        const t = messagesFor(locale).email;
        await sendEmail({
          to: person.email,
          subject: t.stillPending.subject,
          text: t.stillPending.text(
            formatRange(span.start, span.end, locale),
            ws.name,
            to.map((d) => d.user.name ?? d.user.email).join(", "),
            `${origin}/w/${ws.slug}/me`,
          ),
        });
      }
    }
  }
  return { reminded, autoApproved };
}
