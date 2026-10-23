import { defineMessages } from "../define";

/** Microsoft Teams and Slack posts, in the workspace's language. */
export const chat = defineMessages({
  en: {
    verb: {
      requested: "requested time off",
      off: "is off",
      changedRequest: "changed a request",
      changed: "changed time off",
    },
    kind: { VACATION: "vacation", SICK: "sick leave", SPECIAL: "special leave", OTHER: "time off" },
    booking: (who: string, verb: string, range: string, days: string, kind: string) => `${who} ${verb}: ${range} (${days}, ${kind})`,
    openCalendar: "Open team calendar",
    reviewRequest: "Review request",
    feed: {
      title: (workspace: string) => `${workspace} time off`,
      type: { VACATION: "vacation", SICK: "sick leave", SPECIAL: "special leave", OTHER: "time off" },
      pending: "pending",
      holiday: (name: string) => `Holiday: ${name}`,
    },
    digest: {
      title: (workspace: string) => `Out today in ${workspace}:`,
      morning: "morning",
      afternoon: "afternoon",
      today: "today",
      until: (date: string) => `until ${date}`,
      waiting: (count: number, oldestDays: number) =>
        `${count === 1 ? "1 request is" : `${count} requests are`} waiting for approval${oldestDays > 0 ? `, the oldest for ${oldestDays} ${oldestDays === 1 ? "day" : "days"}` : ""}.`,
    },
  },
  de: {
    verb: {
      requested: "hat frei beantragt",
      off: "ist abwesend",
      changedRequest: "hat einen Antrag geändert",
      changed: "hat eine Abwesenheit geändert",
    },
    kind: { VACATION: "Urlaub", SICK: "krank", SPECIAL: "Sonderurlaub", OTHER: "Abwesenheit" },
    booking: (who: string, verb: string, range: string, days: string, kind: string) => `${who} ${verb}: ${range} (${days}, ${kind})`,
    openCalendar: "Teamkalender öffnen",
    reviewRequest: "Antrag ansehen",
    feed: {
      title: (workspace: string) => `${workspace} Abwesenheiten`,
      type: { VACATION: "Urlaub", SICK: "krank", SPECIAL: "Sonderurlaub", OTHER: "abwesend" },
      pending: "offen",
      holiday: (name: string) => `Feiertag: ${name}`,
    },
    digest: {
      title: (workspace: string) => `Heute abwesend in ${workspace}:`,
      morning: "vormittags",
      afternoon: "nachmittags",
      today: "heute",
      until: (date: string) => `bis ${date}`,
      waiting: (count: number, oldestDays: number) =>
        `${count === 1 ? "1 Antrag wartet" : `${count} Anträge warten`} auf Freigabe${oldestDays > 0 ? `, der älteste seit ${oldestDays} ${oldestDays === 1 ? "Tag" : "Tagen"}` : ""}.`,
    },
  },
});
