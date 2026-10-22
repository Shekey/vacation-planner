import { defineMessages } from "../define";

/** Importing a team and its time off from Excel or CSV. */
export const importer = defineMessages({
  en: {
    title: "Import from Excel",
    intro:
      "Move your team over in a few minutes. Copy the cells from Excel and paste them here, or open a CSV file. You see what will happen for every row before anything is saved.",
    tabs: { people: "1. People", timeOff: "2. Time off" },
    backToMembers: "← Back to Members",
    peopleHelp:
      "One row per person, with a header row. Columns can be in any order: Name (or First name and Last name), Email, Vacation days, Left over (days still open from last year), Work days, Start date, State, Role. Only the email is required. Work days like Mo-Fr or Mo, We, Fr; dates like 01.03.2024 or 2024-03-01; role Admin or Member. Without a header row, the email, name and days are recognised by their content.",
    timeOffHelp:
      "One row per absence, with a header row: Email, From, To, Type, Half day. “To” can stay empty for a single day. Type is Vacation (the default) or Other. Half day is morning or afternoon and works for a single day. The people must already be in the workspace, so import them first. Sick days aren't imported: old ones aren't needed, and new ones are entered in the app.",
    templateLink: "Download a template",
    templatePeople:
      "Name,Email,Vacation days,Left over,Work days,Start date,State,Role\nAnna Schmidt,anna@example.com,28,5,Mo-Fr,01.03.2024,Berlin,Admin\nBen Meyer,ben@example.com,30,,Mo-Th,2025-01-15,,",
    templateTimeOff:
      "Email,From,To,Type,Half day\nanna@example.com,2026-12-21,2026-12-31,Vacation,\nben@example.com,2026-11-13,,Vacation,afternoon",
    pasteLabel: "Paste the cells from Excel here",
    pastePlaceholder: "Name\tEmail\tVacation days\nAnna Schmidt\tanna@example.com\t28",
    chooseFile: "or choose a CSV file",
    check: "Check",
    checking: "Checking…",
    welcomeLabel: "Email the new people where to sign in",
    welcomeHint:
      "People are added right away and see the team calendar when they sign in with their email address. Untick this if you'd rather tell them yourself first.",
    columns: { row: "Row", person: "Person", details: "Details", result: "Result" },
    leftOver: (days: string) => `${days} left over`,
    status: {
      new: "New",
      exists: "Already in, skipped",
      removed: "Was removed, skipped",
      ok: "Will be added",
      error: "Problem",
    },
    regionIgnored: "The state column was left out because this workspace has no holiday country yet. Import holidays first, then set states on the Members page.",
    removedHint: "People removed in the last 30 days can be restored under Members.",
    peopleSummary: (n: number, exists: number, removed: number, errors: number) =>
      `${n} new ${n === 1 ? "person" : "people"}${exists ? `, ${exists} already in` : ""}${removed ? `, ${removed} removed earlier` : ""}${errors ? `, ${errors} with problems` : ""}.`,
    room: (max: number, current: number, adding: number) =>
      `Your plan covers up to ${max} people. You have ${current} now and would have ${current + adding}.`,
    roomOver: " That's too many: upgrade under Billing first, or leave some rows out.",
    timeOffSummary: (ok: number, days: number, errors: number) =>
      `${ok} ${ok === 1 ? "booking" : "bookings"} (${days} ${days === 1 ? "day" : "days"})${errors ? `, ${errors} with problems that will be left out` : ""}.`,
    addPeople: (n: number) => `Add ${n} ${n === 1 ? "person" : "people"}`,
    addTimeOff: (n: number) => `Add ${n} ${n === 1 ? "booking" : "bookings"}`,
    adding: "Adding…",
    nothingToCheck: "Paste some rows first.",
    doneNothing: "Nothing to add: every row is already in or has a problem.",
    donePeople: (n: number, emailed: number, failed: number) =>
      `${n} ${n === 1 ? "person" : "people"} added${emailed ? `, ${emailed} emailed` : ""}.${failed ? ` ${failed} emails didn't go out, so tell them to sign in themselves.` : ""}`,
    doneTimeOff: (n: number, days: number) => `${n} ${n === 1 ? "booking" : "bookings"} added (${days} ${days === 1 ? "day" : "days"}). Have a look at the calendar.`,
    nextTimeOff: "Next: import their time off",
    seeCalendar: "Open the calendar",
    errors: {
      limit: (plan: string, max: number, current: number, adding: number) =>
        `${plan} covers up to ${max} people, and ${current} + ${adding} is too many. Upgrade under Billing first.`,
      tooMany: (max: number) => `At most ${max} rows at a time. Split the list.`,
      overLimit: "This workspace has more people than its plan allows, so new bookings are paused. Upgrade under Billing first.",
      conflict: "Someone booked the same days while you were checking. Press Check again.",
    },
    rowErrors: {
      noEmail: () => "No email address",
      badEmail: (v?: string) => `“${v}” isn't an email address`,
      sampleEmail: () => "Sample addresses can't be imported",
      duplicate: () => "Listed twice, the first one counts",
      allowance: (v?: string) => `Vacation days “${v}”: use a number like 28 or 28,5`,
      carriedOver: (v?: string) => `Left over from last year “${v}”: use a number like 5 or 2,5`,
      workDays: (v?: string) => `Work days “${v}”: use for example Mo-Fr or Mo, We, Fr`,
      date: (v?: string) => `Date “${v}”: use 31.12.2026 or 2026-12-31`,
      dateAmbiguous: (v?: string) => `Date “${v}” could be day/month or month/day: use 31.12.2026 or 2026-12-31`,
      region: (v?: string) => `State “${v}” isn't one of this workspace's holiday regions`,
      role: (v?: string) => `Role “${v}”: use Admin or Member`,
      noStart: () => "No start date",
      endBeforeStart: () => "The end is before the start",
      type: (v?: string) => `Type “${v}”: use Vacation or Other`,
      sick: () => "Sick days aren't imported; enter them in the app",
      half: (v?: string) => `Half day “${v}”: use morning or afternoon`,
      halfRange: () => "A half day only works for a single day",
      halfDaysOff: () => "Half days are turned off in Settings",
      noWorkingDays: () => "No working days in that range (weekend or holiday)",
      outOfRange: () => "Dates must be between last year and two years ahead",
      overlap: () => "Overlaps another booking of this person",
      notMember: (v?: string) => `${v} isn't in the workspace yet: import the people first`,
      removedMember: (v?: string) => `${v} was removed: restore them under Members first`,
    },
    link: "Import many people from Excel",
    linkHint: "For teams of 20 or more: paste a list with names, vacation days and work days, and later their time off.",
    assisted: (price: string, email: string) =>
      `Rather not do it yourself? We import your Excel or your old tool's export for you: ${price} once, included with a yearly Business plan. Write to ${email}.`,
  },
  de: {
    title: "Import aus Excel",
    intro:
      "Hol dein Team in wenigen Minuten rüber. Kopiere die Zellen aus Excel und füge sie hier ein, oder öffne eine CSV-Datei. Du siehst für jede Zeile, was passiert, bevor etwas gespeichert wird.",
    tabs: { people: "1. Personen", timeOff: "2. Urlaub" },
    backToMembers: "← Zurück zu Mitglieder",
    peopleHelp:
      "Eine Zeile pro Person, mit Kopfzeile. Die Spalten können in beliebiger Reihenfolge stehen: Name (oder Vorname und Nachname), E-Mail, Urlaubstage, Resturlaub (noch offene Tage aus dem Vorjahr), Arbeitstage, Eintritt, Bundesland, Rolle. Nur die E-Mail ist Pflicht. Arbeitstage wie Mo-Fr oder Mo, Mi, Fr; Datum wie 01.03.2024 oder 2024-03-01; Rolle Admin oder Mitglied. Ohne Kopfzeile werden E-Mail, Name und Tage am Inhalt erkannt.",
    timeOffHelp:
      "Eine Zeile pro Abwesenheit, mit Kopfzeile: E-Mail, Von, Bis, Art, Halbtag. „Bis“ kann bei einem einzelnen Tag leer bleiben. Art ist Urlaub (Standard) oder Sonstiges. Halbtag ist vormittags oder nachmittags und geht bei einem einzelnen Tag. Die Personen müssen schon im Workspace sein, importiere sie also zuerst. Krankheitstage werden nicht importiert: Alte braucht es nicht, neue trägst du in der App ein.",
    templateLink: "Vorlage herunterladen",
    templatePeople:
      "Name;E-Mail;Urlaubstage;Resturlaub;Arbeitstage;Eintritt;Bundesland;Rolle\nAnna Schmidt;anna@beispiel.de;28;5;Mo-Fr;01.03.2024;Berlin;Admin\nBen Meyer;ben@beispiel.de;30;;Mo-Do;15.01.2025;;",
    templateTimeOff:
      "E-Mail;Von;Bis;Art;Halbtag\nanna@beispiel.de;21.12.2026;31.12.2026;Urlaub;\nben@beispiel.de;13.11.2026;;Urlaub;nachmittags",
    pasteLabel: "Füge die Zellen aus Excel hier ein",
    pastePlaceholder: "Name\tE-Mail\tUrlaubstage\nAnna Schmidt\tanna@beispiel.de\t28",
    chooseFile: "oder wähle eine CSV-Datei",
    check: "Prüfen",
    checking: "Wird geprüft…",
    welcomeLabel: "Den neuen Personen per E-Mail schreiben, wo sie sich anmelden",
    welcomeHint:
      "Die Personen werden sofort angelegt und sehen den Teamkalender, sobald sie sich mit ihrer E-Mail-Adresse anmelden. Nimm den Haken raus, wenn du es ihnen lieber erst selbst sagst.",
    columns: { row: "Zeile", person: "Person", details: "Angaben", result: "Ergebnis" },
    leftOver: (days: string) => `${days} Resturlaub`,
    status: {
      new: "Neu",
      exists: "Schon dabei, übersprungen",
      removed: "Wurde entfernt, übersprungen",
      ok: "Wird angelegt",
      error: "Problem",
    },
    regionIgnored: "Die Bundesland-Spalte wurde weggelassen, weil dieser Workspace noch kein Feiertagsland hat. Importiere zuerst die Feiertage und stelle die Bundesländer dann unter Mitglieder ein.",
    removedHint: "Personen, die in den letzten 30 Tagen entfernt wurden, kannst du unter Mitglieder wiederherstellen.",
    peopleSummary: (n: number, exists: number, removed: number, errors: number) =>
      `${n} ${n === 1 ? "neue Person" : "neue Personen"}${exists ? `, ${exists} schon dabei` : ""}${removed ? `, ${removed} früher entfernt` : ""}${errors ? `, ${errors} mit Problemen` : ""}.`,
    room: (max: number, current: number, adding: number) =>
      `Dein Tarif umfasst bis zu ${max} Personen. Du hast jetzt ${current} und hättest danach ${current + adding}.`,
    roomOver: " Das sind zu viele: wähle zuerst unter Abrechnung einen größeren Tarif oder lass Zeilen weg.",
    timeOffSummary: (ok: number, days: number, errors: number) =>
      `${ok} ${ok === 1 ? "Buchung" : "Buchungen"} (${days} ${days === 1 ? "Tag" : "Tage"})${errors ? `, ${errors} mit Problemen, die weggelassen werden` : ""}.`,
    addPeople: (n: number) => `${n} ${n === 1 ? "Person" : "Personen"} anlegen`,
    addTimeOff: (n: number) => `${n} ${n === 1 ? "Buchung" : "Buchungen"} anlegen`,
    adding: "Wird angelegt…",
    nothingToCheck: "Füge zuerst ein paar Zeilen ein.",
    doneNothing: "Nichts anzulegen: Jede Zeile ist schon dabei oder hat ein Problem.",
    donePeople: (n: number, emailed: number, failed: number) =>
      `${n} ${n === 1 ? "Person" : "Personen"} angelegt${emailed ? `, ${emailed} per E-Mail benachrichtigt` : ""}.${failed ? ` ${failed} E-Mails sind nicht rausgegangen, sag ihnen also selbst, dass sie sich anmelden sollen.` : ""}`,
    doneTimeOff: (n: number, days: number) => `${n} ${n === 1 ? "Buchung" : "Buchungen"} angelegt (${days} ${days === 1 ? "Tag" : "Tage"}). Schau dir den Kalender an.`,
    nextTimeOff: "Als Nächstes: ihren Urlaub importieren",
    seeCalendar: "Kalender öffnen",
    errors: {
      limit: (plan: string, max: number, current: number, adding: number) =>
        `${plan} umfasst bis zu ${max} Personen, und ${current} + ${adding} sind zu viele. Wähle zuerst unter Abrechnung einen größeren Tarif.`,
      tooMany: (max: number) => `Höchstens ${max} Zeilen auf einmal. Teile die Liste auf.`,
      overLimit: "Dieser Workspace hat mehr Personen, als sein Tarif erlaubt, deshalb sind neue Buchungen pausiert. Wähle zuerst unter Abrechnung einen größeren Tarif.",
      conflict: "Jemand hat dieselben Tage gebucht, während du geprüft hast. Drück noch einmal auf Prüfen.",
    },
    rowErrors: {
      noEmail: () => "Keine E-Mail-Adresse",
      badEmail: (v?: string) => `„${v}“ ist keine E-Mail-Adresse`,
      sampleEmail: () => "Beispiel-Adressen lassen sich nicht importieren",
      duplicate: () => "Doppelt aufgeführt, die erste zählt",
      allowance: (v?: string) => `Urlaubstage „${v}“: nimm eine Zahl wie 28 oder 28,5`,
      carriedOver: (v?: string) => `Resturlaub „${v}“: nimm eine Zahl wie 5 oder 2,5`,
      workDays: (v?: string) => `Arbeitstage „${v}“: nimm zum Beispiel Mo-Fr oder Mo, Mi, Fr`,
      date: (v?: string) => `Datum „${v}“: nimm 31.12.2026 oder 2026-12-31`,
      dateAmbiguous: (v?: string) => `Datum „${v}“ kann Tag/Monat oder Monat/Tag sein: nimm 31.12.2026 oder 2026-12-31`,
      region: (v?: string) => `Bundesland „${v}“ gehört nicht zu den Feiertagsregionen dieses Workspaces`,
      role: (v?: string) => `Rolle „${v}“: nimm Admin oder Mitglied`,
      noStart: () => "Kein Startdatum",
      endBeforeStart: () => "Das Ende liegt vor dem Start",
      type: (v?: string) => `Art „${v}“: nimm Urlaub oder Sonstiges`,
      sick: () => "Krankheitstage werden nicht importiert; trag sie in der App ein",
      half: (v?: string) => `Halbtag „${v}“: nimm vormittags oder nachmittags`,
      halfRange: () => "Ein halber Tag geht nur bei einem einzelnen Tag",
      halfDaysOff: () => "Halbe Tage sind in den Einstellungen ausgeschaltet",
      noWorkingDays: () => "In diesem Zeitraum liegt kein Arbeitstag (Wochenende oder Feiertag)",
      outOfRange: () => "Das Datum muss zwischen letztem Jahr und zwei Jahren in der Zukunft liegen",
      overlap: () => "Überschneidet sich mit einer anderen Buchung dieser Person",
      notMember: (v?: string) => `${v} ist noch nicht im Workspace: importiere zuerst die Personen`,
      removedMember: (v?: string) => `${v} wurde entfernt: stelle die Person zuerst unter Mitglieder wieder her`,
    },
    link: "Viele Personen aus Excel importieren",
    linkHint: "Für Teams ab etwa 20: füge eine Liste mit Namen, Urlaubstagen und Arbeitstagen ein, später auch den Urlaub.",
    assisted: (price: string, email: string) =>
      `Lieber nicht selbst machen? Wir importieren deine Excel-Datei oder den Export deines alten Tools für dich: einmalig ${price}, im Jahres-Tarif Business enthalten. Schreib an ${email}.`,
  },
});
