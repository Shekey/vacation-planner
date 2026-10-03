import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./config";
import { messagesFor } from "./index";

/**
 * The language for this request: the signed-in user's saved choice, then the `lang` cookie,
 * then the browser's Accept-Language, then English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  // Loaded lazily: auth.ts imports the email code, which imports this file.
  const { auth } = await import("@/auth");
  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { locale: true } });
    if (isLocale(user?.locale)) return user.locale;
  }
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return negotiateLocale((await headers()).get("accept-language"));
});

/** The UI text for this request's language. */
export async function getMessages() {
  return messagesFor(await getLocale());
}

/** The saved language of whoever owns this email, for emails sent to them; null when unknown. */
export async function localeOfEmail(email: string): Promise<Locale | null> {
  const user = await db.user.findUnique({ where: { email }, select: { locale: true } });
  return isLocale(user?.locale) ? user.locale : null;
}

/** Like getLocale, but outside a request (crons) it quietly falls back to English. */
export async function requestLocaleOr(fallback: Locale = DEFAULT_LOCALE): Promise<Locale> {
  try {
    return await getLocale();
  } catch {
    return fallback;
  }
}
