import { ActionForm } from "@/components/action-form";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n/server";
import { outlookAvailable } from "@/lib/outlook";
import { connectOutlookAction, disconnectOutlookAction, stopAutoReplyAction } from "./actions";

const OUTCOMES = ["declined", "expired", "failed", "noAutoReply"] as const;

/** Approved time off in the person's own Outlook calendar, and the automatic reply (#35). */
export async function OutlookSection({ userId, locale, outcome }: { userId: string; locale: Locale; outcome: string | undefined }) {
  if (!outlookAvailable()) return null;
  const t = (await getMessages()).outlook;
  const [connection, membership] = await Promise.all([
    db.outlookConnection.findUnique({ where: { userId } }),
    db.membership.findFirst({ where: { userId, removedAt: null }, select: { workspace: { select: { timezone: true } } } }),
  ]);
  const problem = OUTCOMES.find((o) => o === outcome);
  const notice = problem && <p className="text-sm text-danger">{t.errors[problem]}</p>;

  const connectForm = (label: string, autoReply: boolean | null) => (
    <ActionForm action={connectOutlookAction} className="space-y-3">
      {autoReply === null ? (
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="autoReply" className="mt-0.5" aria-describedby="outlook-auto-reply-hint" />
            <span>{t.autoReplyOption}</span>
          </label>
          <p id="outlook-auto-reply-hint" className="pl-6 text-sm text-muted">
            {t.autoReplyHint}
          </p>
        </div>
      ) : (
        autoReply && <input type="hidden" name="autoReply" value="on" />
      )}
      <button className={autoReply === null || connection?.brokenAt ? "btn" : "btn-secondary"}>{label}</button>
    </ActionForm>
  );

  return (
    <section id="outlook" className="card space-y-3" aria-labelledby="outlook-heading">
      <h2 id="outlook-heading" className="font-medium">
        {t.heading}
      </h2>
      {!connection ? (
        <>
          <p className="text-sm text-muted">{t.intro}</p>
          {notice}
          {connectForm(t.connect, null)}
        </>
      ) : (
        <>
          <p className="text-sm">
            {t.connectedAs(connection.accountEmail)}{" "}
            <span className="text-muted">
              {connection.lastSyncedAt ? t.lastSynced(formatDateTime(connection.lastSyncedAt, locale, membership?.workspace.timezone ?? "UTC")) : t.notYet}
            </span>
          </p>
          <p className="text-sm text-muted">{t.what}</p>
          {notice}
          {connection.brokenAt ? (
            <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-900/20" role="alert">
              <p>{t.broken}</p>
              {connectForm(t.reconnect, connection.autoReply)}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">{connection.autoReply ? t.autoReplyOn : t.autoReplyOff}</p>
              {connection.autoReply ? (
                <ActionForm action={stopAutoReplyAction}>
                  <button className="btn-secondary">{t.turnOffAutoReply}</button>
                </ActionForm>
              ) : (
                <>
                  <p className="text-sm text-muted">{t.autoReplyHint}</p>
                  {connectForm(t.turnOnAutoReply, true)}
                </>
              )}
            </div>
          )}
          <ActionForm action={disconnectOutlookAction} confirm={t.disconnectConfirm}>
            <button className="text-sm text-muted hover:text-foreground hover:underline">{t.disconnect}</button>
          </ActionForm>
        </>
      )}
    </section>
  );
}
