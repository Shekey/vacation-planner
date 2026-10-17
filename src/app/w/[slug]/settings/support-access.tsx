import { ActionForm } from "@/components/action-form";
import { formatDateTime } from "@/lib/dates";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { supportAccessActive } from "@/lib/superadmin";
import { setSupportAccessAction } from "./support-actions";

/** The admin's switch for the operator's support access. */
export async function SupportAccess({ slug, until, timezone }: { slug: string; until: Date | null; timezone: string }) {
  const t = (await getMessages()).settings;
  const on = supportAccessActive(until);
  const locale = await getLocale();
  return (
    <section className="card space-y-3">
      <h2 className="font-medium">{t.supportHeading}</h2>
      <p className="text-sm opacity-70">{t.supportBody}</p>
      {on && until && <p className="text-sm font-medium">{t.supportOn(formatDateTime(until, locale, timezone))}</p>}
      <ActionForm action={setSupportAccessAction.bind(null, slug, !on)}>
        <button className="btn-secondary">{on ? t.supportRevoke : t.supportGrant}</button>
      </ActionForm>
    </section>
  );
}
