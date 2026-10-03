import type { Locale } from "./config";

/**
 * One namespace of UI text in every language. German must have exactly the same keys
 * (and the same function signatures for texts with numbers or names) as English.
 */
export function defineMessages<T extends object>(messages: { en: T; de: NoInfer<T> }): Record<Locale, T> {
  return messages;
}
