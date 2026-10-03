import { defineMessages } from "../define";

/** The workspace overview: greeting, stats, who's out, upcoming time off and long-weekend tips. */
export const overview = defineMessages({
  en: {
    title: "Overview",
    greeting: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
    pendingRequests: (n: number) => `${n} request${n === 1 ? "" : "s"} waiting for your approval`,
    daysLeftIn: (year: number) => `Days left in ${year}`,
    taken: (n: string) => `${n} taken`,
    of: (total: string) => `of ${total}`,
    pendingSuffix: (n: string) => ` · ${n} pending`,
    noAllowance: "No yearly allowance set",
    nextTimeOff: "Your next time off",
    nothingBooked: "Nothing booked",
    offNow: "You're off now 🌴",
    starts: (when: string) => `Starts ${when}`,
    planTimeOff: "Plan some time off →",
    nextHoliday: "Next public holiday",
    noneAdded: "None added",
    seeHolidays: "See the holidays page",
    atRisk: (risk: string, left: string, carry: string | null, nextYear: number, deadline: string | null) =>
      `${risk} of your ${left} days left will be lost on 31 Dec${
        carry ? ` (only ${carry} carry over to ${nextYear}${deadline ? `, to be taken by ${deadline}` : ""})` : ""
      }. Plan them now →`,
    carryOverDeadline: (n: string, one: boolean, fromYear: number, date: string, when: string) =>
      `${n} ${one ? "day" : "days"} carried over from ${fromYear} must be taken by ${date} (${when}) or ${one ? "it is" : "they are"} lost. Plan them now →`,
    outToday: "Out today",
    everyoneIn: "Everyone's in today.",
    pendingParen: " (pending)",
    until: (date: string) => `until ${date}`,
    nextTwoWeeks: "Next two weeks",
    fullCalendar: "Full calendar →",
    nobodyPlanned: "Nobody has time off planned.",
    pendingDot: " · pending",
    tipsTitle: "Long-weekend tips",
    /** Plain and bold segments alternate: plain, bold, plain, bold, plain. */
    tip: (days: string, length: number, range: string, cost: number) => [
      "Take ",
      days,
      " off and get ",
      `${length} days`,
      ` in a row (${range}), using ${cost} ${cost === 1 ? "day" : "days"}.`,
    ],
    bookIt: "Book it",
    and: "and",
  },
  de: {
    title: "Übersicht",
    greeting: { morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend" },
    pendingRequests: (n: number) => `${n} ${n === 1 ? "Antrag wartet" : "Anträge warten"} auf deine Freigabe`,
    daysLeftIn: (year: number) => `Resturlaub ${year}`,
    taken: (n: string) => `${n} genommen`,
    of: (total: string) => `von ${total}`,
    pendingSuffix: (n: string) => ` · ${n} offen`,
    noAllowance: "Kein Jahresurlaub festgelegt",
    nextTimeOff: "Dein nächster Urlaub",
    nothingBooked: "Nichts gebucht",
    offNow: "Du hast gerade frei 🌴",
    starts: (when: string) => `Beginnt ${when}`,
    planTimeOff: "Urlaub planen →",
    nextHoliday: "Nächster Feiertag",
    noneAdded: "Keine eingetragen",
    seeHolidays: "Zu den Feiertagen",
    atRisk: (risk: string, left: string, carry: string | null, nextYear: number, deadline: string | null) =>
      `Von ${left === "1" ? "deinem 1 Tag" : `deinen ${left} Tagen`} Resturlaub ${risk === "1" ? "verfällt 1 Tag" : `verfallen ${risk} Tage`} am 31. Dezember${
        carry ? ` (nur ${carry} ${carry === "1" ? "Tag wird" : "Tage werden"} nach ${nextYear} übertragen${deadline ? ` und ${carry === "1" ? "muss" : "müssen"} bis ${deadline} genommen werden` : ""})` : ""
      }. Jetzt verplanen →`,
    carryOverDeadline: (n: string, one: boolean, fromYear: number, date: string, when: string) =>
      `${one ? "1 übertragener Tag" : `${n} übertragene Tage`} aus ${fromYear} ${one ? "muss" : "müssen"} bis ${date} (${when}) genommen werden, sonst ${one ? "verfällt er" : "verfallen sie"}. Jetzt verplanen →`,
    outToday: "Heute abwesend",
    everyoneIn: "Heute sind alle da.",
    pendingParen: " (offen)",
    until: (date: string) => `bis ${date}`,
    nextTwoWeeks: "Nächste zwei Wochen",
    fullCalendar: "Ganzer Kalender →",
    nobodyPlanned: "Niemand hat Urlaub geplant.",
    pendingDot: " · offen",
    tipsTitle: "Tipps für lange Wochenenden",
    tip: (days: string, length: number, range: string, cost: number) => [
      "Nimm ",
      days,
      " frei und hab ",
      `${length} Tage am Stück`,
      ` (${range}), für nur ${cost} ${cost === 1 ? "Urlaubstag" : "Urlaubstage"}.`,
    ],
    bookIt: "Buchen",
    and: "und",
  },
});
