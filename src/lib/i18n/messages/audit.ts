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
  },
});
