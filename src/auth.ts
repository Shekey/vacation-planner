import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: { signIn: "/sign-in", verifyRequest: "/sign-in?sent=1" },
  providers: [
    Resend({
      from: process.env.EMAIL_FROM ?? "Vacation Planner <onboarding@resend.dev>",
      // Without an API key, local development prints the link instead of emailing it.
      ...(process.env.AUTH_RESEND_KEY
        ? {}
        : {
            sendVerificationRequest: async ({ identifier, url }) => {
              if (process.env.NODE_ENV === "production" && !process.env.ALLOW_CONSOLE_EMAIL) {
                throw new Error("AUTH_RESEND_KEY is not set, so sign-in emails can't be sent.");
              }
              console.log(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
            },
          }),
    }),
  ],
});
