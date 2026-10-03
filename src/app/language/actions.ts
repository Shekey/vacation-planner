"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

/**
 * Saves the language on the profile when signed in, and in a cookie either way.
 * "system" forgets the choice, so the browser's language applies again.
 */
export async function setLanguage(formData: FormData) {
  const value = formData.get("locale");
  const locale = isLocale(value) ? value : value === "system" ? null : undefined;
  if (locale === undefined) return;
  const jar = await cookies();
  if (locale) jar.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  else jar.delete(LOCALE_COOKIE);
  const session = await auth();
  if (session?.user?.id) await db.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidatePath("/", "layout");
}
