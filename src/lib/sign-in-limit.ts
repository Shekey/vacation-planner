import { db } from "@/lib/db";

/** How long a magic link stays valid (Auth.js defaults to a day). Used by src/auth.ts. */
export const MAGIC_LINK_MAX_AGE_SECONDS = 60 * 60;

const WINDOW_MINUTES = 10;
const MAX_LINKS_PER_WINDOW = 3;

/**
 * True when this address already got several sign-in links in the last few minutes,
 * so the sign-in form can't be used to flood someone's inbox.
 * Auth.js stores one VerificationToken per link that expires MAGIC_LINK_MAX_AGE_SECONDS
 * after it was sent, so a token sent in the window expires after this cutoff.
 */
export async function tooManySignInLinks(email: string): Promise<boolean> {
  const identifier = email.trim().toLowerCase();
  if (!identifier) return false;
  const sentAfter = Date.now() - WINDOW_MINUTES * 60 * 1000;
  const recent = await db.verificationToken.count({
    where: { identifier, expires: { gt: new Date(sentAfter + MAGIC_LINK_MAX_AGE_SECONDS * 1000) } },
  });
  return recent >= MAX_LINKS_PER_WINDOW;
}
