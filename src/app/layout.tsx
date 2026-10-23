import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Analytics } from "@/components/analytics";
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitch } from "@/components/language-switch";
import { Avatar, LogoMark } from "@/components/ui";
import { isBetaMode } from "@/lib/beta";
import { isIndexingAllowed } from "@/lib/indexing";
import { getLocale, getMessages } from "@/lib/i18n/server";
import "./globals.css";

// Self-hosted at build time by next/font: visitors' browsers never contact Google.
const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});
export async function generateMetadata(): Promise<Metadata> {
  const t = (await getMessages()).common;
  return {
    title: { default: t.appName, template: `%s · ${t.appName}` },
    description: t.appDescription,
    // Pages that set their own robots (operator pages) keep theirs; everything else follows the switch.
    ...(isIndexingAllowed() ? {} : { robots: { index: false, follow: false } }),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1719" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const label = session?.user?.name ?? session?.user?.email ?? "";
  const locale = await getLocale();
  const t = (await getMessages()).common;
  return (
    <html
      lang={locale}
      className={`h-full antialiased ${sans.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          <Analytics />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
          >
            {t.skipToContent}
          </a>
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
              <Link
                href="/"
                aria-label={t.appName}
                className="flex min-h-11 items-center gap-2 font-semibold tracking-tight"
              >
                <LogoMark />
                {/* Signed in on a phone, the logo alone leaves room for the account and sign-out. */}
                <span className={session?.user ? "hidden sm:inline" : ""}>
                  {t.appName}
                </span>
              </Link>
              {!session?.user && (
                <nav
                  aria-label={t.productNav.label}
                  className="hidden items-center gap-5 text-sm text-muted md:flex [&_a:hover]:text-foreground"
                >
                  <Link href="/#for-whom">{t.productNav.forWhom}</Link>
                  <Link href="/#features">{t.productNav.features}</Link>
                  <Link href="/#pricing">{t.productNav.pricing}</Link>
                  <Link href="/#faq">{t.productNav.faq}</Link>
                </nav>
              )}
              <div className="flex items-center gap-3">
                <LanguageSwitch locale={locale} />
                {!session?.user && (
                  <Link href="/sign-in" className="btn py-1.5 text-sm">
                    {t.signIn}
                  </Link>
                )}
                {session?.user && (
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/sign-in" });
                    }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <Link
                      href="/account"
                      className="flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                      title={t.yourProfile}
                    >
                      <Avatar
                        label={label}
                      />
                      <span className="hidden max-w-48 truncate sm:inline">
                        {label}
                      </span>
                    </Link>
                    <button className="min-h-11 px-1 text-muted hover:text-foreground">
                      {t.signOut}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </header>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none sm:py-8"
          >
            {children}
          </main>
          <footer className="border-t border-border">
            <nav
              aria-label={t.legalNav}
              className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 px-4 py-2 text-sm text-muted [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-foreground [&_a:hover]:underline"
            >
              <Link href="/impressum">{t.footer.impressum}</Link>
              <Link href="/datenschutz">{t.footer.privacy}</Link>
              <Link href="/agb">{t.footer.terms}</Link>
              <Link href="/avv">{t.footer.dpa}</Link>
              {isBetaMode() && (
                <span className="basis-full text-xs">{t.footer.beta}</span>
              )}
            </nav>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
