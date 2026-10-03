import { defineMessages } from "../define";

export const invite = defineMessages({
  en: {
    problems: {
      invalid: "This invitation link isn't valid.",
      expired: "This invitation has expired. Ask an admin to send a new one.",
      used: "This invitation was already used.",
      revoked: "This invitation was withdrawn.",
    },
    unavailable: "Invitation unavailable",
    goHome: "Go to your workspaces",
    wrongAccount: "Wrong account",
    wrongAccountBody: {
      before: "This invitation to",
      after: (invited: string, current: string) => `is for ${invited}, but you're signed in as ${current}.`,
    },
    switchAccount: "Sign out and switch account",
    join: (workspace: string) => `Join ${workspace}`,
    invitedAs: (admin: boolean) => `You've been invited as ${admin ? "an admin" : "a member"}.`,
    accept: "Accept invitation",
  },
  de: {
    problems: {
      invalid: "Dieser Einladungslink ist ungültig.",
      expired: "Diese Einladung ist abgelaufen. Bitte einen Admin, dir eine neue zu schicken.",
      used: "Diese Einladung wurde schon benutzt.",
      revoked: "Diese Einladung wurde zurückgezogen.",
    },
    unavailable: "Einladung nicht verfügbar",
    goHome: "Zu deinen Workspaces",
    wrongAccount: "Falsches Konto",
    wrongAccountBody: {
      before: "Diese Einladung zu",
      after: (invited: string, current: string) => `ist für ${invited}, aber du bist als ${current} angemeldet.`,
    },
    switchAccount: "Abmelden und Konto wechseln",
    join: (workspace: string) => `${workspace} beitreten`,
    invitedAs: (admin: boolean) => `Du wurdest als ${admin ? "Admin" : "Mitglied"} eingeladen.`,
    accept: "Einladung annehmen",
  },
});
