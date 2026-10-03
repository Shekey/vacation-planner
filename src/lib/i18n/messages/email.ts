import { defineMessages } from "../define";

/** Emails: sign-in link, invitations, approval requests and decisions. */
export const email = defineMessages({
  en: {
    signIn: {
      subject: "Sign in to Vacation Planner",
      text: (url: string, minutes: number) =>
        `Sign in to Vacation Planner with this link:\n\n${url}\n\nThe link works once and expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
    },
    invite: {
      subject: (inviter: string, workspace: string) => `${inviter} invited you to ${workspace} on Vacation Planner`,
      text: (inviter: string, workspace: string, url: string, days: number) =>
        `${inviter} invited you to join ${workspace}.\n\nAccept the invitation: ${url}\n\nThe link expires in ${days} days.`,
    },
    decision: {
      subject: (approved: boolean) => `Your time off was ${approved ? "approved" : "declined"}`,
      text: (range: string, workspace: string, approved: boolean) =>
        `Your request for ${range} in ${workspace} was ${approved ? "approved" : "declined"}.`,
      note: (note: string) => `Note: ${note}`,
    },
    request: {
      subject: (who: string) => `${who} requested time off`,
      text: (who: string, days: string, range: string, workspace: string, url: string) =>
        `${who} requested ${days} off, ${range}, in ${workspace}.\n\nReview it: ${url}`,
    },
  },
  de: {
    signIn: {
      subject: "Anmeldung bei Vacation Planner",
      text: (url: string, minutes: number) =>
        `Melde dich mit diesem Link bei Vacation Planner an:\n\n${url}\n\nDer Link funktioniert einmal und läuft in ${minutes} Minuten ab. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    },
    invite: {
      subject: (inviter: string, workspace: string) => `${inviter} hat dich zu ${workspace} in Vacation Planner eingeladen`,
      text: (inviter: string, workspace: string, url: string, days: number) =>
        `${inviter} hat dich eingeladen, ${workspace} beizutreten.\n\nEinladung annehmen: ${url}\n\nDer Link läuft in ${days} Tagen ab.`,
    },
    decision: {
      subject: (approved: boolean) => `Dein Urlaub wurde ${approved ? "genehmigt" : "abgelehnt"}`,
      text: (range: string, workspace: string, approved: boolean) =>
        `Dein Antrag für ${range} in ${workspace} wurde ${approved ? "genehmigt" : "abgelehnt"}.`,
      note: (note: string) => `Notiz: ${note}`,
    },
    request: {
      subject: (who: string) => `${who} hat frei beantragt`,
      text: (who: string, days: string, range: string, workspace: string, url: string) =>
        `${who} hat ${days} frei beantragt, ${range}, in ${workspace}.\n\nAntrag ansehen: ${url}`,
    },
  },
});
