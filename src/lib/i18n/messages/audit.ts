import { defineMessages } from "../define";

/** The activity log for admins, and the list of recently cancelled bookings. */
export const audit = defineMessages({
  en: {
    title: "Activity",
    intro: "Who did what in this workspace. Entries are kept for 12 months. They only hold names, dates and roles, no notes.",
    empty: "Nothing yet. Removing people, cancelling and approving bookings and role changes show up here.",
    someone: "Someone",
    event: (action: string, actor: string, target: string, detail: string | null) => {
      const on = detail ? ` (${detail})` : "";
      switch (action) {
        case "member.removed":
          return `${actor} removed ${target}`;
        case "member.restored":
          return `${actor} restored ${target}`;
        case "member.role_changed":
          return `${actor} made ${target} ${({ ADMIN: "an admin", APPROVER: "an approver", VIEWER: "view only" } as Record<string, string>)[detail ?? ""] ?? "a member"}`;
        case "member.added_without_email":
          return `${actor} added ${target} without an email address`;
        case "member.email_added":
          return `${actor} added an email address for ${target}`;
        case "booking.cancelled":
          return `${actor} cancelled the booking of ${target}${on}`;
        case "booking.restored":
          return `${actor} restored the booking of ${target}${on}`;
        case "booking.approved":
          return `${actor} approved the request of ${target}${on}`;
        case "booking.declined":
          return `${actor} declined the request of ${target}${on}`;
        case "booking.auto_approved":
          return `The request of ${target} was approved automatically after nobody answered${on}`;
        case "booking.past_changed":
          return `${actor} changed time off of ${target} that had already ended${on}`;
        case "booking.vacation_returned":
          return `${actor} gave ${target} vacation days back for sick days${on}`;
        case "workspace.deleted":
          return `${actor} deleted the workspace`;
        case "workspace.restored":
          return `${actor} restored the workspace`;
        case "import.people":
          return `${actor} imported ${detail} ${detail === "1" ? "person" : "people"} from a list`;
        case "import.timeoff":
          return `${actor} imported ${detail} ${detail === "1" ? "booking" : "bookings"} from a list`;
        case "support.access_granted":
          return `${actor} allowed support access (24 hours)`;
        case "support.access_revoked":
          return `${actor} turned support access off`;
        case "support.access_used":
          return `Support (${actor}) looked at the workspace`;
        case "support.trial_extended":
          return `Support (${actor}) extended the trial${detail ? ` by ${detail} days` : ""}`;
        case "support.workspace_restored":
          return `Support (${actor}) restored the workspace`;
        default:
          return `${actor}: ${action}`;
      }
    },
    cancelledHeading: "Recently cancelled bookings",
    cancelledHint: "Cancelled by mistake? Undo it within 30 days and the booking is back as it was.",
    cancelledEmpty: "No bookings were cancelled in the last 30 days.",
    restore: "Undo cancel",
    daysLeft: (n: number) => `${n} ${n === 1 ? "day" : "days"} left`,
    eyebrow: "Workspace administration",
    subtitle: "A clear record of cancellations and workspace changes.",
    cancelledPeriod: "Last 30 days",
    cancellations: (n: number) => `${n} ${n === 1 ? "cancellation" : "cancellations"}`,
    cancelledEmptyTitle: "No cancellations in the last 30 days",
    cancelledEmptyBody: "Cancelled bookings will appear here. You can undo a cancellation for 30 days.",
    nothingToRestore: "There's nothing to restore right now.",
    historyHeading: "Workspace history",
    recorded: (n: number) => `${n} recorded ${n === 1 ? "event" : "events"}`,
    upToDate: "You're up to date. No other recorded events are shown.",
    record: {
      title: "What stays in the record",
      retentionTitle: "12-month history",
      retentionBody: "Entries are retained for 12 months.",
      essentialsTitle: "Just the essentials",
      essentialsBody: "Names, dates and roles only. Notes are not stored in the activity record.",
      recoveryTitle: "Cancellation recovery",
      recoveryBody: "Undo is available for 30 days after a booking is cancelled.",
    },
    shortcut: {
      title: "Looking for your own bookings?",
      body: "Your requests and approved time off stay in your personal workspace.",
      link: "Go to My time off →",
    },
  },
  de: {
    title: "Verlauf",
    intro: "Wer in diesem Workspace was getan hat. Einträge bleiben 12 Monate erhalten. Sie enthalten nur Namen, Daten und Rollen, keine Notizen.",
    empty: "Noch nichts. Entfernte Personen, stornierte und freigegebene Buchungen und Rollenwechsel erscheinen hier.",
    someone: "Jemand",
    event: (action: string, actor: string, target: string, detail: string | null) => {
      const on = detail ? ` (${detail})` : "";
      switch (action) {
        case "member.removed":
          return `${actor} hat ${target} entfernt`;
        case "member.restored":
          return `${actor} hat ${target} wiederhergestellt`;
        case "member.role_changed":
          return `${actor} hat die Rolle von ${target} auf ${({ ADMIN: "Admin", APPROVER: "Genehmiger:in", VIEWER: "Nur ansehen" } as Record<string, string>)[detail ?? ""] ?? "Mitglied"} gesetzt`;
        case "member.added_without_email":
          return `${actor} hat ${target} ohne E-Mail-Adresse hinzugefügt`;
        case "member.email_added":
          return `${actor} hat eine E-Mail-Adresse für ${target} eingetragen`;
        case "booking.cancelled":
          return `${actor} hat die Buchung von ${target} storniert${on}`;
        case "booking.restored":
          return `${actor} hat die Buchung von ${target} wiederhergestellt${on}`;
        case "booking.approved":
          return `${actor} hat den Antrag von ${target} genehmigt${on}`;
        case "booking.declined":
          return `${actor} hat den Antrag von ${target} abgelehnt${on}`;
        case "booking.auto_approved":
          return `Der Antrag von ${target} wurde automatisch genehmigt, weil niemand geantwortet hat${on}`;
        case "booking.past_changed":
          return `${actor} hat eine schon vergangene Abwesenheit von ${target} geändert${on}`;
        case "booking.vacation_returned":
          return `${actor} hat ${target} Urlaubstage für Krankheitstage zurückgegeben${on}`;
        case "workspace.deleted":
          return `${actor} hat den Workspace gelöscht`;
        case "workspace.restored":
          return `${actor} hat den Workspace wiederhergestellt`;
        case "import.people":
          return `${actor} hat ${detail} ${detail === "1" ? "Person" : "Personen"} aus einer Liste importiert`;
        case "import.timeoff":
          return `${actor} hat ${detail} ${detail === "1" ? "Buchung" : "Buchungen"} aus einer Liste importiert`;
        case "support.access_granted":
          return `${actor} hat den Support-Zugriff erlaubt (24 Stunden)`;
        case "support.access_revoked":
          return `${actor} hat den Support-Zugriff ausgeschaltet`;
        case "support.access_used":
          return `Support (${actor}) hat sich den Workspace angesehen`;
        case "support.trial_extended":
          return `Support (${actor}) hat die Testphase${detail ? ` um ${detail} Tage` : ""} verlängert`;
        case "support.workspace_restored":
          return `Support (${actor}) hat den Workspace wiederhergestellt`;
        default:
          return `${actor}: ${action}`;
      }
    },
    cancelledHeading: "Kürzlich stornierte Buchungen",
    cancelledHint: "Aus Versehen storniert? Mach es innerhalb von 30 Tagen rückgängig, dann ist die Buchung wieder wie vorher da.",
    cancelledEmpty: "In den letzten 30 Tagen wurde keine Buchung storniert.",
    restore: "Storno rückgängig",
    daysLeft: (n: number) => `noch ${n} ${n === 1 ? "Tag" : "Tage"}`,
    eyebrow: "Workspace-Verwaltung",
    subtitle: "Eine klare Übersicht über Stornos und Änderungen im Workspace.",
    cancelledPeriod: "Letzte 30 Tage",
    cancellations: (n: number) => `${n} ${n === 1 ? "Storno" : "Stornos"}`,
    cancelledEmptyTitle: "Keine Stornos in den letzten 30 Tagen",
    cancelledEmptyBody: "Stornierte Buchungen erscheinen hier. Du kannst ein Storno 30 Tage lang rückgängig machen.",
    nothingToRestore: "Im Moment gibt es nichts wiederherzustellen.",
    historyHeading: "Workspace-Verlauf",
    recorded: (n: number) => `${n} ${n === 1 ? "erfasstes Ereignis" : "erfasste Ereignisse"}`,
    upToDate: "Du bist auf dem neuesten Stand. Weitere erfasste Ereignisse gibt es nicht.",
    record: {
      title: "Was im Verlauf bleibt",
      retentionTitle: "12 Monate Verlauf",
      retentionBody: "Einträge bleiben 12 Monate erhalten.",
      essentialsTitle: "Nur das Nötigste",
      essentialsBody: "Nur Namen, Daten und Rollen. Notizen werden im Verlauf nicht gespeichert.",
      recoveryTitle: "Storno rückgängig machen",
      recoveryBody: "Ein Storno lässt sich 30 Tage lang rückgängig machen.",
    },
    shortcut: {
      title: "Suchst du deine eigenen Buchungen?",
      body: "Deine Anträge und genehmigten Abwesenheiten findest du in deinem persönlichen Bereich.",
      link: "Zu Meine Abwesenheit →",
    },
  },
});
