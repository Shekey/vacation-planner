import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vacation Planner",
  description: "Plan and book team vacations",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              Vacation Planner
            </Link>
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
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
