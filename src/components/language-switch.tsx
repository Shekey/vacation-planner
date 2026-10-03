import { setLanguage } from "@/app/language/actions";
import { LOCALE_NAMES, LOCALES, messagesFor, type Locale } from "@/lib/i18n";

/** EN | DE toggle for the header; works without JavaScript. */
export function LanguageSwitch({ locale }: { locale: Locale }) {
  const t = messagesFor(locale).common;
  return (
    <form action={setLanguage} className="flex items-center rounded-full border border-border p-0.5 text-xs font-medium" aria-label={t.language}>
      {LOCALES.map((l) => (
        <button
          key={l}
          name="locale"
          value={l}
          lang={l}
          aria-pressed={l === locale}
          title={LOCALE_NAMES[l]}
          aria-label={LOCALE_NAMES[l]}
          className={`rounded-full px-2 py-0.5 uppercase transition-colors ${
            l === locale ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </form>
  );
}
