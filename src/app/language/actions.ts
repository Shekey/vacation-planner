"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

/** Saves the language on the profile when signed in, and in a cookie either way. */
export async function setLanguage(formData: FormData) {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const session = await auth();
  if (session?.user?.id) await db.user.update({ where: { id: session.user.id }, data: { locale } });
  revalidatePath("/", "layout");
}
