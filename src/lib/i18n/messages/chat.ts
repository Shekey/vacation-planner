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
    kind: { VACATION: "vacation", SICK: "sick leave", OTHER: "time off" },
    booking: (who: string, verb: string, range: string, days: string, kind: string) => `${who} ${verb}: ${range} (${days}, ${kind})`,
    openCalendar: "Open team calendar",
    feed: {
      title: (workspace: string) => `${workspace} time off`,
      type: { VACATION: "vacation", SICK: "sick leave", OTHER: "time off" },
      pending: "pending",
      holiday: (name: string) => `Holiday: ${name}`,
    },
    digest: {
      title: (workspace: string) => `Out today in ${workspace}:`,
      morning: "morning",
      afternoon: "afternoon",
      today: "today",
      until: (date: string) => `until ${date}`,
    },
  },
  de: {
    verb: {
      requested: "hat frei beantragt",
      off: "ist abwesend",
      changedRequest: "hat einen Antrag geändert",
      changed: "hat eine Abwesenheit geändert",
    },
    kind: { VACATION: "Urlaub", SICK: "krank", OTHER: "Abwesenheit" },
    booking: (who: string, verb: string, range: string, days: string, kind: string) => `${who} ${verb}: ${range} (${days}, ${kind})`,
    openCalendar: "Teamkalender öffnen",
    feed: {
      title: (workspace: string) => `${workspace} Abwesenheiten`,
      type: { VACATION: "Urlaub", SICK: "krank", OTHER: "abwesend" },
      pending: "offen",
      holiday: (name: string) => `Feiertag: ${name}`,
    },
    digest: {
      title: (workspace: string) => `Heute abwesend in ${workspace}:`,
      morning: "vormittags",
      afternoon: "nachmittags",
      today: "heute",
      until: (date: string) => `bis ${date}`,
    },
  },
});
