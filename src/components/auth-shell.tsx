import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark } from "@/components/ui";
import { getLocale, getMessages } from "@/lib/i18n/server";

/** The sign-in pages: brand on top, one column of content, language and privacy below. Replaces the site header and footer (see `.auth-page` in globals.css). */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const [locale, m] = await Promise.all([getLocale(), getMessages()]);
  return (
    <div className="auth-page flex min-h-dvh justify-center px-6 pt-7 pb-6">
      <div className="flex w-full max-w-[420px] flex-col gap-8">
        <Link href="/" aria-label={m.common.appName} className="flex min-h-11 items-center gap-2.5 text-lg">
          <LogoMark className="size-9 rounded-[11px]" />
          {m.common.appName}
        </Link>
        <div className="flex-1 space-y-7">{children}</div>
        <div className="space-y-4 border-t border-border pt-5 text-xs text-muted">
          <div className="flex items-center justify-between gap-3">
            <LanguageSwitch locale={locale} />
            <Link href="/datenschutz" className="inline-flex min-h-11 items-center font-medium text-primary-ink hover:underline">
              {m.signIn.privacy}
            </Link>
          </div>
          <p>{m.signIn.hosting}</p>
        </div>
      </div>
    </div>
  );
}
