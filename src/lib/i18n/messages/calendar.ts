import { defineMessages } from "../define";

/** The team month calendar. */
export const calendar = defineMessages({
  en: {
    title: "Calendar",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    today: "Today",
    member: "Member",
    you: " (you)",
    /** One letter per weekday, Sunday first. */
    weekdayLetters: ["S", "M", "T", "W", "T", "F", "S"],
    /** Tooltip line for a booking; `type` and `part` are the capitalised labels. */
    booking: (name: string, type: string, part: string | null, pending: boolean) =>
      `${name}: ${type.toLowerCase()}${part ? ` (${part.toLowerCase()})` : ""}${pending ? ", pending" : ""}`,
    holiday: (name: string) => `Holiday: ${name}`,
    bookDay: (date: string, name: string) => `Book ${date} for ${name}`,
    changeBooking: (name: string, date: string) => `Change ${name}'s booking on ${date}`,
    hint: "Tap an empty day to book it, or a booking to change it.",
    swipe: " Swipe sideways to see the whole month.",
  },
  de: {
    title: "Kalender",
    previousMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    today: "Heute",
    member: "Mitglied",
    you: " (du)",
    weekdayLetters: ["S", "M", "D", "M", "D", "F", "S"],
    booking: (name: string, type: string, part: string | null, pending: boolean) =>
      `${name}: ${type}${part ? ` (${part})` : ""}${pending ? ", offen" : ""}`,
    holiday: (name: string) => `Feiertag: ${name}`,
    bookDay: (date: string, name: string) => `${date} für ${name} buchen`,
    changeBooking: (name: string, date: string) => `Buchung von ${name} am ${date} ändern`,
    hint: "Tippe auf einen freien Tag, um ihn zu buchen, oder auf eine Buchung, um sie zu ändern.",
    swipe: " Wische zur Seite, um den ganzen Monat zu sehen.",
  },
});
