import { formatDate, todayIn } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { isLocale, LOCALES, messagesFor, type Locale } from "@/lib/i18n";
import { OPERATOR } from "@/lib/legal";
import { PLANS, trialReminderDue } from "@/lib/plans";

/**
 * Emails a workspace's admins a week before its trial ends and again in the last two days, saying that
 * nothing is deleted and what the free plan means for them. Runs from the daily cron; each email goes
 * out once, even if two runs overlap, because the run that marks it sent is the one that sends it.
 */
export async function sendTrialReminders(origin: string, now = new Date()) {
  const soon = new Date(now.getTime() + 8 * 86_400_000);
  const workspaces = await db.workspace.findMany({
    where: { trialEndsAt: { gt: now, lte: soon }, OR: [{ trialReminder7SentAt: null }, { trialReminder1SentAt: null }] },
    include: { settings: { select: { locale: true } } },
  });

  let sent = 0;
  for (const ws of workspaces) {
    const due = trialReminderDue(ws, now);
    if (!due) continue;
    // Claim it first. A missed first reminder is marked too, so it never arrives after the last one.
    const claimed = await db.workspace.updateMany({
      where: { id: ws.id, ...(due === "first" ? { trialReminder7SentAt: null } : { trialReminder1SentAt: null }) },
      data: due === "first" ? { trialReminder7SentAt: now } : { trialReminder1SentAt: now, trialReminder7SentAt: ws.trialReminder7SentAt ?? now },
    });
    if (claimed.count === 0) continue;

    const [admins, people] = await Promise.all([
      db.membership.findMany({
        where: { workspaceId: ws.id, role: "ADMIN", removedAt: null, isSample: false },
        select: { user: { select: { email: true, locale: true } } },
      }),
      db.membership.count({ where: { workspaceId: ws.id, removedAt: null, isSample: false } }),
    ]);
    const fallback: Locale = isLocale(ws.settings?.locale) ? ws.settings.locale : "en";
    const endsOn = todayIn(ws.timezone, ws.trialEndsAt!);
    // One email per language, so every admin reads it in theirs.
    for (const locale of LOCALES) {
      const to = admins.filter((a) => (isLocale(a.user.locale) ? a.user.locale : fallback) === locale).map((a) => a.user.email);
      if (to.length === 0) continue;
      const t = messagesFor(locale).email.trialEnding;
      const date = formatDate(endsOn, { weekday: "long", day: "numeric", month: "long" }, locale);
      const result = await sendEmail({
        to,
        subject: t.subject(ws.name, date, due === "last"),
        text: t.text({
          workspace: ws.name,
          date,
          people,
          freeMax: PLANS.FREE.maxMembers,
          billingUrl: `${origin}/w/${ws.slug}/billing`,
          contact: OPERATOR.email,
        }),
      });
      if (result.ok) sent++;
    }
  }
  return sent;
}
