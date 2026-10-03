import { ActionForm } from "@/components/action-form";
import { accountDeletionPlan } from "@/lib/account";
import { db } from "@/lib/db";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { setLanguage } from "../language/actions";
import { requireUser } from "@/lib/session";
import { deleteAccountAction, saveNameAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages()).account.title };
}

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { id } = await requireUser();
  const { next } = await searchParams;
  const [user, plan] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id },
      select: { name: true, email: true },
    }),
    accountDeletionPlan(id),
  ]);
  const locale = await getLocale();
  const t = (await getMessages()).account;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{user.name ? t.heading : t.headingNoName}</h1>
      <ActionForm action={saveNameAction} className="space-y-3">
        <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t.name}</span>
          <input
            name="name"
            className="input"
            required
            minLength={2}
            maxLength={60}
            defaultValue={user.name ?? ""}
            placeholder={t.namePlaceholder}
            autoFocus
          />
        </label>
        <p className="text-sm opacity-70">{t.nameHint(user.email)}</p>
        <button className="btn">{t.save}</button>
      </ActionForm>

      <section className="card space-y-2">
        <h2 className="font-medium">{t.language}</h2>
        <form action={setLanguage} className="flex flex-wrap items-center gap-2">
          {LOCALES.map((l) => (
            <button key={l} name="locale" value={l} aria-pressed={l === locale} className={l === locale ? "btn" : "btn-secondary"}>
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </form>
        <p className="text-sm opacity-70">{t.languageHint}</p>
      </section>

      {user.name && (
        <>
          <section className="card space-y-2">
            <h2 className="font-medium">{t.yourData}</h2>
            <p className="text-sm opacity-70">{t.yourDataBody}</p>
            <a href="/api/account/export" className="btn-secondary inline-block" download>
              {t.download}
            </a>
          </section>

          <section className="card space-y-3 border-red-500/40">
            <h2 className="font-medium text-red-600">{t.deleteHeading}</h2>
            <p className="text-sm opacity-70">
              {t.deleteBody}
              {plan.alone.length > 0 && t.aloneIn(plan.alone.map((w) => w.name).join(", "), plan.alone.length)}
            </p>
            {plan.blocked.length > 0 ? (
              <p className="text-sm">
                {t.blockedBefore}{" "}
                {plan.blocked.map((w, i) => (
                  <span key={w.slug}>
                    {i > 0 && ", "}
                    <a className="text-primary hover:underline" href={`/w/${w.slug}/members`}>
                      {w.name}
                    </a>
                  </span>
                ))}
                {t.blockedAfter(plan.blocked.length)}
              </p>
            ) : (
              <ActionForm action={deleteAccountAction} className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">{t.typeToConfirm(user.email)}</span>
                  <input name="confirmEmail" type="email" className="input" required autoComplete="off" />
                </label>
                <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  {t.deleteButton}
                </button>
              </ActionForm>
            )}
          </section>
        </>
      )}
    </div>
  );
}
