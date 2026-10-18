import { defineMessages } from "../define";

/** Emails: sign-in link, invitations, approval requests and decisions, trial reminders. */
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
    welcome: {
      subject: (workspace: string) => `You're on the vacation planner of ${workspace}`,
      text: (workspace: string, url: string) =>
        `Your team now plans time off in Vacation Planner, in the workspace ${workspace}.\n\nSign in with this email address: ${url}\n\nYou get a sign-in link by email, no password needed. There you see the team calendar and your days left, and you can book time off.`,
    },
    trialEnding: {
      subject: (workspace: string, date: string, last: boolean) =>
        `${last ? "Last reminder: the" : "The"} free trial of ${workspace} ends on ${date}`,
      text: (o: { workspace: string; date: string; people: number; freeMax: number; billingUrl: string; contact: string }) =>
        [
          `The free trial of ${o.workspace} on Vacation Planner ends on ${o.date}.`,
          [
            "What happens then:",
            "• Nothing is deleted. People, bookings, allowances and holidays all stay as they are.",
            `• ${o.workspace} moves to the free plan: up to ${o.freeMax} people, without Microsoft Teams and Slack posts.`,
            o.people > o.freeMax
              ? `• You have ${o.people} people, more than the free plan covers. Everyone can still sign in, see the calendar and cancel time off, but new bookings and invitations pause until you pick a plan or remove people.`
              : `• With ${o.people} ${o.people === 1 ? "person" : "people"} you can keep using it for free.`,
          ].join("\n"),
          `To keep everything as it is, pick a plan: ${o.billingUrl}`,
          `Questions? Write to ${o.contact}.`,
        ].join("\n\n"),
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
    welcome: {
      subject: (workspace: string) => `Du bist im Urlaubsplaner von ${workspace}`,
      text: (workspace: string, url: string) =>
        `Dein Team plant Urlaub jetzt im Vacation Planner, im Workspace ${workspace}.\n\nMelde dich mit dieser E-Mail-Adresse an: ${url}\n\nDu bekommst einen Anmeldelink per E-Mail, ein Passwort brauchst du nicht. Dort siehst du den Teamkalender und deine übrigen Urlaubstage und kannst Urlaub buchen.`,
    },
    trialEnding: {
      subject: (workspace: string, date: string, last: boolean) =>
        `${last ? "Letzte Erinnerung: Die" : "Die"} kostenlose Testphase von ${workspace} endet am ${date}`,
      text: (o: { workspace: string; date: string; people: number; freeMax: number; billingUrl: string; contact: string }) =>
        [
          `Die kostenlose Testphase von ${o.workspace} in Vacation Planner endet am ${o.date}.`,
          [
            "Was dann passiert:",
            "• Es wird nichts gelöscht. Personen, Buchungen, Urlaubsansprüche und Feiertage bleiben, wie sie sind.",
            `• ${o.workspace} wechselt in den Tarif Free: bis zu ${o.freeMax} Personen, ohne Posts in Microsoft Teams und Slack.`,
            o.people > o.freeMax
              ? `• Ihr seid ${o.people} Personen, mehr als Free abdeckt. Alle können sich weiter anmelden, den Kalender sehen und Urlaub stornieren, aber neue Buchungen und Einladungen sind pausiert, bis du einen Tarif wählst oder Personen entfernst.`
              : `• Mit ${o.people} ${o.people === 1 ? "Person" : "Personen"} könnt ihr kostenlos weitermachen.`,
          ].join("\n"),
          `Damit alles so bleibt, wie es ist, wähl einen Tarif: ${o.billingUrl}`,
          `Fragen? Schreib an ${o.contact}.`,
        ].join("\n\n"),
    },
  },
});
