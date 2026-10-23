import { ArrowLeft, ArrowRight, Inbox, KeyRound, Mail, MailCheck, RotateCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { getMessages } from "@/lib/i18n/server";
import { safeRedirectPath } from "@/lib/security";
import { sendSignInLinkAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages()).signIn.title };
}

const action = "min-h-[50px] w-full gap-[9px] rounded-[12px] px-[18px] py-3 text-[15px]";

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { sent, again, callbackUrl, email, error } = await searchParams;
  const t = (await getMessages()).signIn;

  const redirectTo = safeRedirectPath(callbackUrl);
  const address = typeof email === "string" ? email : "";
  const back = `/sign-in?${new URLSearchParams({ callbackUrl: redirectTo })}`;

  if (sent) {
    return (
      <AuthShell>
        <Link href={back} className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-primary-ink">
          <ArrowLeft aria-hidden className="size-4" />
          {t.back}
        </Link>
        <div className="space-y-5 pt-2">
          <span aria-hidden className="grid size-[68px] place-items-center rounded-[22px] bg-primary-soft text-primary">
            <MailCheck className="size-8" strokeWidth={1.5} />
          </span>
          <h1 className="text-[30px] leading-[1.15] font-normal">{t.checkEmail}</h1>
          <p className="text-[15px] text-muted">{t.sentTo}</p>
          {address && (
            <div className="flex items-center justify-between gap-3 font-semibold">
              <span className="min-w-0 text-[15px] break-words">{address}</span>
              <Link
                href={`/sign-in?${new URLSearchParams({ callbackUrl: redirectTo, email: address })}`}
                aria-label={t.changeLabel}
                className="inline-flex min-h-11 shrink-0 items-center text-[13px] text-primary-ink"
              >
                {t.change}
              </Link>
            </div>
          )}
        </div>
        <div className="space-y-4 rounded-[18px] border border-border bg-surface p-5">
          <h2 className="text-[17px] font-semibold">{t.openTitle}</h2>
          <p className="text-[15px] text-muted">{again ? t.alreadySent : t.openBody}</p>
          <hr className="border-border" />
          <p className="flex gap-2.5 text-[13px] text-muted">
            <Inbox aria-hidden className="mt-0.5 size-[18px] shrink-0" />
            {t.notArrived}
          </p>
        </div>
        {address && (
          <form action={sendSignInLinkAction} className="space-y-2.5">
            <input type="hidden" name="email" value={address} />
            <input type="hidden" name="callbackUrl" value={redirectTo} />
            <SubmitButton className={`btn-secondary ${action}`} pending={t.sending}>
              <RotateCw aria-hidden className="size-[18px] text-primary" />
              {t.resend}
            </SubmitButton>
            <p className="text-center text-xs text-muted">{t.resendNote}</p>
          </form>
        )}
        <p className="border-t border-border pt-5 text-xs text-muted">{t.differentAddress}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="space-y-7" action={sendSignInLinkAction}>
        <input type="hidden" name="callbackUrl" value={redirectTo} />
        <div className="space-y-3 pt-4">
          <h1 className="text-[32px] leading-[1.15] font-normal">
            {t.hero[0]}
            <br />
            {t.hero[1]}
          </h1>
          <p className="text-[15px] text-muted">{redirectTo.startsWith("/invite/") ? t.inviteIntro : t.intro}</p>
        </div>
        {typeof error === "string" && (
          <p role="alert" className="rounded-[12px] bg-danger-soft p-3 text-sm text-danger">
            {(Object.hasOwn(t.errors, error) ? t.errors[error] : undefined) ?? t.defaultError}
          </p>
        )}
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-[13px] font-semibold">{t.emailLabel}</span>
            <span className="relative block">
              <input
                className="input h-[52px] rounded-[12px] bg-surface px-3.5 pr-11 text-[15px]"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder={t.emailPlaceholder}
                defaultValue={address || undefined}
              />
              <Mail aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-[18px] -translate-y-1/2 text-muted" />
            </span>
          </label>
          <SubmitButton className={`btn ${action}`} pending={t.sending}>
            <ArrowRight aria-hidden className="size-[18px]" />
            {t.submit}
          </SubmitButton>
        </div>
        <p className="flex gap-2.5 text-[13px] text-muted">
          <KeyRound aria-hidden className="mt-0.5 size-[18px] shrink-0 text-primary" />
          {t.inviteHint}
        </p>
      </form>
    </AuthShell>
  );
}
