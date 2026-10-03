"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, messagesFor, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Hands the request's language to client components; the root layout sets it. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The language and UI text inside client components. */
export function useI18n() {
  const locale = useContext(LocaleContext);
  return { locale, t: messagesFor(locale) };
}
