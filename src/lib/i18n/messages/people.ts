import { defineMessages } from "../define";

/** The people directory: who's off today and what everyone has planned. */
export const people = defineMessages({
  en: {
    title: "People",
    /** `kind` is the capitalised booking type label. */
    offMorning: (kind: string) => `Off this morning (${kind.toLowerCase()})`,
    offAfternoon: (kind: string) => `Off this afternoon (${kind.toLowerCase()})`,
    offTodayBackTomorrow: (kind: string) => `Off today (${kind.toLowerCase()}), back tomorrow`,
    offUntil: (kind: string, date: string) => `Off (${kind.toLowerCase()}) until ${date}`,
    searchPlaceholder: "Search by name or email",
    searchLabel: "Search people",
    noMatch: (query: string) => `Nobody matches “${query}”.`,
    inToday: "In today",
    pending: " · pending",
    noTimeOff: "No time off planned.",
  },
  de: {
    title: "Team",
    offMorning: (kind: string) => `Heute Vormittag abwesend (${kind})`,
    offAfternoon: (kind: string) => `Heute Nachmittag abwesend (${kind})`,
    offTodayBackTomorrow: (kind: string) => `Heute abwesend (${kind}), morgen zurück`,
    offUntil: (kind: string, date: string) => `Abwesend (${kind}) bis ${date}`,
    searchPlaceholder: "Nach Name oder E-Mail suchen",
    searchLabel: "Personen suchen",
    noMatch: (query: string) => `Niemand passt zu „${query}“.`,
    inToday: "Heute da",
    pending: " · offen",
    noTimeOff: "Kein Urlaub geplant.",
  },
});
