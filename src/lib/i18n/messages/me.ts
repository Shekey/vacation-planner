import { defineMessages } from "../define";

/** "My time off": your allowance, bookings and calendar feed. */
export const me = defineMessages({
  en: {
    title: "My time off",
    adminNote: (note: string) => `Admin: “${note}”`,
    change: "Change",
    cancelConfirm: "Cancel this booking?",
    cancel: "Cancel",
    upcoming: "Upcoming",
    nothingPlanned: "Nothing planned yet.",
    bookTimeOff: "Book time off",
    feedTitle: "Team calendar in your calendar app",
    feedBody:
      "Subscribe to this link in Google Calendar (Other calendars → From URL), Outlook or Apple Calendar. It shows everyone's time off and holidays. Keep it private: anyone with the link can see the team calendar.",
    newLinkConfirm: "Make a new link? The current one will stop working.",
    newLink: "Make a new link",
    turnOff: "Turn off",
    feedPitch: "See the team's time off and holidays next to your meetings.",
    getLink: "Get a calendar link",
    past: "Past",
  },
  de: {
    title: "Mein Urlaub",
    adminNote: (note: string) => `Admin: „${note}“`,
    change: "Ändern",
    cancelConfirm: "Diese Buchung stornieren?",
    cancel: "Stornieren",
    upcoming: "Geplant",
    nothingPlanned: "Noch nichts geplant.",
    bookTimeOff: "Urlaub buchen",
    feedTitle: "Teamkalender in deiner Kalender-App",
    feedBody:
      "Abonniere diesen Link in Google Kalender (Weitere Kalender → Per URL), Outlook oder Apple Kalender. Er zeigt Urlaube und Feiertage des ganzen Teams. Halte ihn privat: Wer den Link hat, sieht den Teamkalender.",
    newLinkConfirm: "Neuen Link erstellen? Der aktuelle funktioniert dann nicht mehr.",
    newLink: "Neuen Link erstellen",
    turnOff: "Deaktivieren",
    feedPitch: "Sieh Urlaube und Feiertage des Teams direkt neben deinen Terminen.",
    getLink: "Kalenderlink holen",
    past: "Vergangen",
  },
});
