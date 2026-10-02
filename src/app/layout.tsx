import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Avatar, LogoMark } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vacation Planner", template: "%s · Vacation Planner" },
  description:
    "Team vacation planning with yearly allowances, half days, regional public holidays, approvals and Microsoft Teams updates.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0f14" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const label = session?.user?.name ?? session?.user?.email ?? "";
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <LogoMark />
              <span>Vacation Planner</span>
            </Link>
            {!session?.user && (
              <Link href="/sign-in" className="btn py-1.5 text-sm">
                Sign in
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
                  title="Your profile"
                >
                  <Avatar label={label} seed={session.user.email ?? label} />
                  <span className="hidden max-w-48 truncate sm:inline">{label}</span>
                </Link>
                <button className="text-muted hover:text-foreground">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none sm:py-8">{children}</main>
      </body>
    </html>
  );
}
