import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { emailFrom, sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { localeOfEmail, requestLocaleOr } from "@/lib/i18n/server";
import { MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/sign-in-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  // Errors land back on the sign-in page as ?error=<code> instead of Auth.js's bare error page.
  pages: { signIn: "/sign-in", verifyRequest: "/sign-in?sent=1", error: "/sign-in" },
  providers: [
    Resend({
      maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
      from: emailFrom(),
      // Our own email instead of Auth.js's, so it comes in the person's language.
      // Without an API key, local development prints the link instead of emailing it.
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!process.env.AUTH_RESEND_KEY) {
          if (process.env.NODE_ENV === "production" && !process.env.ALLOW_CONSOLE_EMAIL) {
            throw new Error("AUTH_RESEND_KEY is not set, so sign-in emails can't be sent.");
          }
          console.log(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
          return;
        }
        const t = messagesFor((await localeOfEmail(identifier)) ?? (await requestLocaleOr())).email.signIn;
        const sent = await sendEmail({ to: identifier, subject: t.subject, text: t.text(url, MAGIC_LINK_MAX_AGE_SECONDS / 60) });
        // Auth.js then sends the person to its error page instead of "check your email".
        if (!sent.ok) throw new Error(sent.error);
      },
    }),
  ],
});
