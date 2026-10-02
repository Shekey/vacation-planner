import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vacation Planner",
  description:
    "Team vacation planning with yearly allowances, half days, regional public holidays, approvals and Microsoft Teams updates.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              Vacation Planner
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
                <Link href="/account" className="max-w-40 truncate opacity-70 hover:underline sm:max-w-none">
                  {session.user.name ?? session.user.email}
                </Link>
                <button className="underline">Sign out</button>
              </form>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none">{children}</main>
      </body>
    </html>
  );
}
