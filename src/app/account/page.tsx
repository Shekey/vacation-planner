import { ActionForm } from "@/components/action-form";
import { accountDeletionPlan } from "@/lib/account";
import { db } from "@/lib/db";
import { isLocale, LOCALE_NAMES, LOCALES } from "@/lib/i18n";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { setLanguage } from "../language/actions";
import { requireUser } from "@/lib/session";
import { tokensOfUser } from "@/lib/personal-tokens";
import { appOrigin } from "@/lib/url";
import { deleteAccountAction, revokeAssistantTokenAction, saveNameAction } from "./actions";
import { AssistantTokenForm } from "./assistant-token-form";

export async function generateMetadata() {
  return { title: (await getMessages()).account.title };
}

export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const { id } = await requireUser();
  const { next } = await searchParams;
  const [user, plan, memberships, tokens, origin] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id },
      select: { name: true, email: true, locale: true },
    }),
    accountDeletionPlan(id),
    db.membership.findMany({
      where: { userId: id, removedAt: null, isSample: false, workspace: { deletedAt: null } },
      select: { id: true, workspace: { select: { name: true, settings: { select: { assistantAccess: true } } } } },
      orderBy: { joinedAt: "asc" },
    }),
    tokensOfUser(id),
    appOrigin(),
  ]);
  const locale = await getLocale();
  // No saved choice means the app follows the browser's language.
  const saved = isLocale(user.locale) ? user.locale : null;
  const messages = await getMessages();
  const t = messages.account;
  const ta = messages.assistant;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const assistantOn = memberships.filter((m) => m.workspace.settings?.assistantAccess ?? true);
  const assistantOff = memberships.filter((m) => !(m.workspace.settings?.assistantAccess ?? true));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">
        {user.name ? t.heading : t.headingNoName}
      </h1>
      <ActionForm action={saveNameAction} className="space-y-3">
        <input
          type="hidden"
          name="next"
          value={typeof next === "string" ? next : ""}
        />
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
        <p className="text-sm text-muted">{t.nameHint(user.email)}</p>
        <button className="btn">{t.save}</button>
      </ActionForm>

      <section className="card space-y-2">
        <h2 className="font-medium">{t.language}</h2>
        <form
          action={setLanguage}
          className="flex flex-wrap items-center gap-2"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              name="locale"
              value={l}
              aria-pressed={l === saved}
              className={l === saved ? "btn" : "btn-secondary"}
            >
              {LOCALE_NAMES[l]}
            </button>
          ))}
          <button
            name="locale"
            value="system"
            aria-pressed={saved === null}
            className={saved === null ? "btn" : "btn-secondary"}
          >
            {t.languageSystem(LOCALE_NAMES[locale])}
          </button>
        </form>
        <p className="text-sm text-muted">{t.languageHint}</p>
      </section>

      {user.name && (
        <>
          {memberships.length > 0 && (
            <section className="card space-y-3" aria-labelledby="assistant-title">
              <h2 id="assistant-title" className="font-medium">
                {ta.heading}
              </h2>
              <p className="text-sm text-muted">{ta.intro}</p>
              <p className="text-sm text-muted">{ta.privacy}</p>
              {assistantOff.map((m) => (
                <p key={m.id} className="text-sm text-muted">
                  {ta.turnedOff(m.workspace.name)}
                </p>
              ))}
              {assistantOn.length > 0 && (
                <AssistantTokenForm
                  workspaces={assistantOn.map((m) => ({ membershipId: m.id, name: m.workspace.name }))}
                  endpoint={`${origin}/api/mcp`}
                />
              )}
              <h3 className="pt-2 text-sm font-medium">{ta.yourTokens}</h3>
              {tokens.length === 0 ? (
                <p className="text-sm text-muted">{ta.none}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {tokens.map((k) => (
                    <li key={k.id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0 text-sm">
                        <p className="font-medium break-words">{k.name}</p>
                        <p className="text-muted">
                          {[
                            memberships.length > 1 ? k.membership.workspace.name : null,
                            k.lastUsedAt ? ta.lastUsed(date.format(k.lastUsedAt)) : ta.neverUsed,
                            k.expiresAt < new Date() ? ta.expired : ta.expiresOn(date.format(k.expiresAt)),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <ActionForm action={revokeAssistantTokenAction.bind(null, k.id)} confirm={ta.revokeConfirm}>
                        <button className="btn-secondary px-3 py-1 text-sm">{ta.revoke}</button>
                      </ActionForm>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="card space-y-2">
            <h2 className="font-medium">{t.yourData}</h2>
            <p className="text-sm text-muted">{t.yourDataBody}</p>
            <a
              href="/api/account/export"
              className="btn-secondary inline-block"
              download
            >
              {t.download}
            </a>
          </section>

          <section className="card space-y-3 border-red-500/40">
            <h2 className="font-medium text-danger">
              {t.deleteHeading}
            </h2>
            <p className="text-sm text-muted">
              {t.deleteBody}
              {plan.alone.length > 0 &&
                t.aloneIn(
                  plan.alone.map((w) => w.name).join(", "),
                  plan.alone.length,
                )}
            </p>
            {plan.blocked.length > 0 ? (
              <p className="text-sm">
                {t.blockedBefore}{" "}
                {plan.blocked.map((w, i) => (
                  <span key={w.slug}>
                    {i > 0 && ", "}
                    <a
                      className="text-primary hover:underline"
                      href={`/w/${w.slug}/members`}
                    >
                      {w.name}
                    </a>
                  </span>
                ))}
                {t.blockedAfter(plan.blocked.length)}
              </p>
            ) : (
              <ActionForm action={deleteAccountAction} className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">
                    {t.typeToConfirm(user.email)}
                  </span>
                  <input
                    name="confirmEmail"
                    type="email"
                    className="input"
                    required
                    autoComplete="off"
                  />
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
