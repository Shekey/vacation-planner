import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { LEAVE_COLORS, TypeDot, type LeaveColor } from "@/components/badges";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import { archiveLeaveTypeAction, createLeaveTypeAction, restoreLeaveTypeAction, updateLeaveTypeAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).leaveTypes.title };
}

const card = "space-y-4 rounded-[18px] border border-border bg-surface p-5 sm:p-6";
const cardTitle = "text-[17px] font-semibold";
const field = "block space-y-1.5";
const label = "text-xs font-semibold";
const hint = "block text-xs text-muted";
const input = "input min-h-11 rounded-[10px] text-sm";

type Initial = { name: string; color: string; countsAsVacation: boolean; allowanceDays: number | null; needsApproval: boolean };

/** The fields for adding and changing a leave type; `id` keeps the inputs of several forms apart. */
function Fields({ id, initial, t }: { id: string; initial: Initial; t: Awaited<ReturnType<typeof getMessages>>["leaveTypes"] }) {
  return (
    <>
      <label className={field}>
        <span className={label}>{t.name}</span>
        <input name="name" required minLength={2} maxLength={40} defaultValue={initial.name} placeholder={t.namePlaceholder} className={input} />
      </label>
      <fieldset className="space-y-1.5">
        <legend className={label}>{t.color}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LEAVE_COLORS) as LeaveColor[]).map((c) => (
            <label key={c} className="cursor-pointer" title={t.colorName[c]}>
              <input type="radio" name="color" value={c} defaultChecked={initial.color === c} required className="peer sr-only" />
              <span
                aria-hidden
                className={`block size-8 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${LEAVE_COLORS[c]}`}
              />
              <span className="sr-only">{t.colorName[c]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="countsAsVacation" defaultChecked={initial.countsAsVacation} className="mt-0.5 size-4" />
        <span>
          <span className="block text-sm font-semibold">{t.countsAsVacation}</span>
          <span className={hint}>{t.countsAsVacationHint}</span>
        </span>
      </label>
      <label className={field} htmlFor={`${id}-allowance`}>
        <span className={`${label} block`}>{t.allowance}</span>
        <input
          id={`${id}-allowance`}
          name="allowanceDays"
          type="number"
          min={0.5}
          max={365}
          step={0.5}
          defaultValue={initial.allowanceDays ?? ""}
          className={`${input} w-28`}
        />
        <span className={hint}>{t.allowanceHint}</span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="needsApproval" defaultChecked={initial.needsApproval} className="mt-0.5 size-4" />
        <span>
          <span className="block text-sm font-semibold">{t.needsApproval}</span>
          <span className={hint}>{t.needsApprovalHint}</span>
        </span>
      </label>
    </>
  );
}

export default async function LeaveTypesPage({ params }: PageProps<"/w/[slug]/leave-types">) {
  const { slug } = await params;
  const { workspace } = await requireAdmin(slug);
  const locale = await getLocale();
  const { leaveTypes: t, common } = await getMessages();
  const rows = await db.leaveType.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } });
  const active = rows.filter((l) => !l.archivedAt);
  const archived = rows.filter((l) => l.archivedAt);
  const initialOf = (l: (typeof rows)[number]): Initial => ({ ...l, allowanceDays: l.allowanceDays === null ? null : Number(l.allowanceDays) });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="text-sm text-muted">{t.intro}</p>
      </div>

      <section className={card} aria-labelledby="built-in">
        <h3 id="built-in" className={cardTitle}>
          {t.builtIn}
        </h3>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {(["VACATION", "SICK", "SPECIAL", "OTHER"] as const).map((type) => (
            <li key={type} className="flex items-center gap-2">
              <TypeDot type={type} decorative locale={locale} /> {common.type[type]}
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="yours">
        <h3 id="yours" className={cardTitle}>
          {t.yours}
        </h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted">{t.none}</p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((l) => (
              <li key={l.id} className="space-y-3 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <TypeDot type="OTHER" leaveType={l} decorative locale={locale} />
                  <span className="font-medium">{l.name}</span>
                  <span className="text-xs text-muted">
                    {[
                      l.countsAsVacation && t.tagVacation,
                      l.allowanceDays !== null && t.tagAllowance(formatNumber(Number(l.allowanceDays), locale)),
                      !l.needsApproval && t.tagNoApproval,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-primary">{t.edit}</summary>
                  <ActionForm action={updateLeaveTypeAction.bind(null, slug, l.id)} className="mt-3 space-y-4">
                    <Fields id={l.id} initial={initialOf(l)} t={t} />
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="btn min-h-11 rounded-[10px] px-4 text-[13px]">{t.save}</button>
                    </div>
                  </ActionForm>
                  <ActionForm action={archiveLeaveTypeAction.bind(null, slug, l.id)} confirm={t.archiveConfirm} className="mt-2">
                    <button className="text-sm text-danger underline">{t.archive}</button>
                  </ActionForm>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} aria-labelledby="add">
        <h3 id="add" className={cardTitle}>
          {t.add}
        </h3>
        <ActionForm action={createLeaveTypeAction.bind(null, slug)} className="space-y-4">
          <Fields id="new" initial={{ name: "", color: "blue", countsAsVacation: false, allowanceDays: null, needsApproval: true }} t={t} />
          <button className="btn min-h-11 rounded-[10px] px-4 text-[13px]">{t.add}</button>
        </ActionForm>
      </section>

      {archived.length > 0 && (
        <section className={card} aria-labelledby="archived">
          <h3 id="archived" className={cardTitle}>
            {t.archived}
          </h3>
          <ul className="divide-y divide-border">
            {archived.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex items-center gap-2 opacity-70">
                  <TypeDot type="OTHER" leaveType={l} decorative locale={locale} /> {l.name}
                </span>
                <ActionForm action={restoreLeaveTypeAction.bind(null, slug, l.id)}>
                  <button className="text-sm underline">{t.restore}</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
