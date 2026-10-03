import Link from "next/link";
import type { ReactNode } from "react";
import { intlLocale, isLocale, messagesFor, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { OPERATOR, SUBPROCESSORS } from "@/lib/legal";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The language of a legal page: `?lang=de` or `?lang=en` forces one (so English readers can open the
 * binding German original), otherwise the visitor's language.
 */
export async function legalLocale(searchParams: SearchParams): Promise<{ locale: Locale; forced: boolean }> {
  const { lang } = await searchParams;
  if (isLocale(lang)) return { locale: lang, forced: true };
  return { locale: await getLocale(), forced: false };
}

/** A link to another legal page that keeps a forced language. */
export function legalHref(path: string, locale: Locale, forced: boolean) {
  return forced ? `${path}?lang=${locale}` : path;
}

/**
 * Frame for the legal texts, with a draft notice until a lawyer has checked them. The German text is the
 * binding original; the English one says so and links to it.
 */
export function LegalPage({
  locale,
  path,
  title,
  updated,
  children,
}: {
  locale: Locale;
  /** This page's path, for the link to the other language. */
  path: string;
  title: string;
  /** ISO date, e.g. "2026-10-03". */
  updated: string;
  children: ReactNode;
}) {
  const t = messagesFor(locale).legal;
  const date = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${updated}T00:00:00Z`),
  );
  return (
    <article lang={locale} className="legal mx-auto max-w-2xl space-y-4">
      {!OPERATOR.reviewed && <p className="card border-amber-400/60 bg-amber-50 text-sm dark:bg-amber-900/20">{t.draft}</p>}
      {locale === "en" ? (
        <p className="text-sm">
          {t.translationNote}{" "}
          <Link href={`${path}?lang=de`} hrefLang="de">
            {t.germanVersion}
          </Link>
        </p>
      ) : (
        <p className="text-sm">
          <Link href={`${path}?lang=en`} hrefLang="en" lang="en">
            {t.englishVersion}
          </Link>
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted">
        {t.updated}: {date}
      </p>
      {children}
    </article>
  );
}

export function Operator({ locale }: { locale: Locale }) {
  const t = messagesFor(locale).legal;
  return (
    <p>
      {OPERATOR.name}
      <br />
      {OPERATOR.address}
      <br />
      {t.email}: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      {OPERATOR.phone && (
        <>
          <br />
          {t.phone}: {OPERATOR.phone}
        </>
      )}
    </p>
  );
}

/** The subprocessors with purpose and location, as list items. */
export function SubprocessorList({ locale }: { locale: Locale }) {
  const t = messagesFor(locale).legal;
  return (
    <ul>
      {SUBPROCESSORS.map((s) => (
        <li key={s.name}>
          {s.name}: {s.purpose[locale]}. {t.location}: {s.location[locale]}.
        </li>
      ))}
    </ul>
  );
}
