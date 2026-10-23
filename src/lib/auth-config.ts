import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { emailFrom, sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { localeOfEmail, requestLocaleOr } from "@/lib/i18n/server";
import { isPlaceholderEmail } from "@/lib/no-email";
import { enabledOAuthProviders, keepNoTokens, oauthProfile, verifiedEmail } from "@/lib/oauth";
import { MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/sign-in-limit";
import { confirmPageUrl } from "@/lib/sign-in-link";

/** Auth.js settings, apart from `src/auth.ts` so tests can run sign-ins through them. Providers follow the env when called. */
export function authConfig(): NextAuthConfig {
  return {
    adapter: PrismaAdapter(db),
    session: { strategy: "database" },
    // Errors land back on the sign-in page as ?error=<code> instead of Auth.js's bare error page.
    pages: {
      signIn: "/sign-in",
      verifyRequest: "/sign-in?sent=1",
      error: "/sign-in",
    },
    callbacks: {
      signIn: ({ user, account, profile }) => {
        // Google and Microsoft match people to their account by email, so only an email the provider vouches for counts.
        if (account?.type === "oidc" && !verifiedEmail(account.provider, profile ?? {})) return "/sign-in?error=EmailNotVerified";
        // Sample team members are placeholders and never get a sign-in link.
        return !isPlaceholderEmail(user.email ?? "");
      },
    },
    providers: [
      ...enabledOAuthProviders().map((id) => {
        // Linking by email is safe here because the sign-in callback above refuses unverified emails.
        const options = {
          allowDangerousEmailAccountLinking: true,
          account: keepNoTokens,
        };
        return id === "google"
          ? Google({
              ...options,
              profile: (claims) => oauthProfile("google", claims),
            })
          : // `common` lets any Microsoft 365 organisation and personal Microsoft accounts sign in. Without User.Read
            // Auth.js can't fetch the profile photo, and organisations don't need an admin to approve the app.
            MicrosoftEntraID({
              ...options,
              issuer: "https://login.microsoftonline.com/common/v2.0",
              authorization: { params: { scope: "openid profile email" } },
              profile: (claims) => oauthProfile("microsoft-entra-id", claims),
            });
      }),
      Resend({
        maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
        from: emailFrom(),
        // Our own email instead of Auth.js's, so it comes in the person's language.
        // Without an API key, local development prints the link instead of emailing it.
        sendVerificationRequest: async ({ identifier, url: callbackUrl }) => {
          const url = confirmPageUrl(callbackUrl);
          if (!process.env.AUTH_RESEND_KEY) {
            if (process.env.NODE_ENV === "production" && !process.env.ALLOW_CONSOLE_EMAIL) {
              throw new Error("AUTH_RESEND_KEY is not set, so sign-in emails can't be sent.");
            }
            console.log(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
            return;
          }
          const t = messagesFor((await localeOfEmail(identifier)) ?? (await requestLocaleOr())).email.signIn;
          const sent = await sendEmail({
            to: identifier,
            subject: t.subject,
            text: t.text(url, MAGIC_LINK_MAX_AGE_SECONDS / 60),
          });
          // Auth.js then sends the person to its error page instead of "check your email".
          if (!sent.ok) throw new Error(sent.error);
        },
      }),
    ],
  };
}
