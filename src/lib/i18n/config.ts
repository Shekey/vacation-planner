/** Languages the app is translated into. Client-safe: no server imports. */
export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that remembers the choice for visitors who aren't signed in (and on this device for those who are). */
export const LOCALE_COOKIE = "lang";

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", de: "Deutsch" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The first supported language in an Accept-Language header, e.g. "de-DE,de;q=0.9,en;q=0.8" → "de". */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((x) => x.lang && !Number.isNaN(x.q) && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return ranked.map((x) => x.lang).find(isLocale) ?? DEFAULT_LOCALE;
}

/** The BCP 47 tag for Intl formatting: British English (day before month) and German. */
export function intlLocale(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-GB";
}

/** 1 → "1", 1.5 → "1.5" in English and "1,5" in German. */
export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 }).format(n);
}
