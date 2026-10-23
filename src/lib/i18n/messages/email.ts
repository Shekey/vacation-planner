import { defineMessages } from "../define";

/** Emails: sign-in link, invitations, approval requests and decisions, trial reminders. */
export const email = defineMessages({
  en: {
    signIn: {
      subject: "Sign in to Urlaubflow",
      text: (url: string, minutes: number) =>
        `Sign in to Urlaubflow with this link:\n\n${url}\n\nThe link works once and expires in ${minutes} minutes. If you didn't ask for it, you can ignore this email.`,
    },
    invite: {
      subject: (inviter: string, workspace: string) => `${inviter} invited you to ${workspace} on Urlaubflow`,
      text: (inviter: string, workspace: string, url: string, days: number) =>
        `${inviter} invited you to join ${workspace}.\n\nAccept the invitation: ${url}\n\nThe link expires in ${days} days.`,
    },
    decision: {
      subject: (approved: boolean) => `Your time off was ${approved ? "approved" : "declined"}`,
      text: (range: string, workspace: string, approved: boolean) =>
        `Your request for ${range} in ${workspace} was ${approved ? "approved" : "declined"}.`,
      note: (note: string) => `Note: ${note}`,
    },
    reminder: {
      subject: (who: string, days: number) => `Still waiting: ${who}'s request (${days} days)`,
      text: (who: string, days: string, range: string, workspace: string, waited: number, urls: { approve: string; decline: string; all: string }) =>
        `${who} asked for ${days} off, ${range}, in ${workspace} ${waited} days ago and is still waiting for an answer.\n\nApprove: ${urls.approve}\n\nDecline: ${urls.decline}\n\nBoth links work for 7 days without signing in. Don't forward this email.\n\nAll open requests: ${urls.all}`,
    },
    stillPending: {
      subject: "Your request is still waiting",
      text: (range: string, workspace: string, names: string, url: string) =>
        `Your request for ${range} in ${workspace} hasn't been answered yet. We reminded ${names}.\n\nBetter not book anything you can't cancel until it's approved.\n\n${url}`,
    },
    autoApproved: (days: number) => `Nobody answered within ${days} days, so it was approved automatically, as your team set it up.`,
    request: {
      subject: (who: string) => `${who} requested time off`,
      text: (who: string, days: string, range: string, workspace: string, urls: { approve: string; decline: string; all: string }) =>
        `${who} requested ${days} off, ${range}, in ${workspace}.\n\nApprove: ${urls.approve}\n\nDecline: ${urls.decline}\n\nBoth links show who else is off first and work for 7 days without signing in. Don't forward this email.\n\nAll open requests: ${urls.all}`,
    },
    standIn: {
      subject: (who: string) => `You're covering for ${who}`,
      text: (who: string, range: string, workspace: string, url: string) =>
        `${who} is off ${range} in ${workspace}, and you're their stand-in. Talk to them before they go if anything needs handing over.\n\nTeam calendar: ${url}`,
    },
    sick: {
      subject: (who: string) => `${who} is off sick`,
      text: (who: string, range: string, workspace: string, url: string) =>
        `${who} reported sick for ${range} in ${workspace}. Colleagues only see "Other".\n\nCalendar: ${url}`,
    },
    welcome: {
      subject: (workspace: string) => `You're on Urlaubflow with ${workspace}`,
      text: (workspace: string, url: string) =>
        `Your team now plans time off in Urlaubflow, in the workspace ${workspace}.\n\nSign in with this email address: ${url}\n\nYou get a sign-in link by email, no password needed. There you see the team calendar and your days left, and you can book time off.`,
    },
    trialEnding: {
      subject: (workspace: string, date: string, last: boolean) =>
        `${last ? "Last reminder: the" : "The"} free trial of ${workspace} ends on ${date}`,
      text: (o: { workspace: string; date: string; people: number; freeMax: number; billingUrl: string; contact: string }) =>
        [
          `The free trial of ${o.workspace} on Urlaubflow ends on ${o.date}.`,
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
      subject: "Anmeldung bei Urlaubflow",
      text: (url: string, minutes: number) =>
        `Melde dich mit diesem Link bei Urlaubflow an:\n\n${url}\n\nDer Link funktioniert einmal und läuft in ${minutes} Minuten ab. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    },
    invite: {
      subject: (inviter: string, workspace: string) => `${inviter} hat dich zu ${workspace} in Urlaubflow eingeladen`,
      text: (inviter: string, workspace: string, url: string, days: number) =>
        `${inviter} hat dich eingeladen, ${workspace} beizutreten.\n\nEinladung annehmen: ${url}\n\nDer Link läuft in ${days} Tagen ab.`,
    },
    decision: {
      subject: (approved: boolean) => `Dein Urlaub wurde ${approved ? "genehmigt" : "abgelehnt"}`,
      text: (range: string, workspace: string, approved: boolean) =>
        `Dein Antrag für ${range} in ${workspace} wurde ${approved ? "genehmigt" : "abgelehnt"}.`,
      note: (note: string) => `Notiz: ${note}`,
    },
    reminder: {
      subject: (who: string, days: number) => `Wartet noch: Antrag von ${who} (${days} Tage)`,
      text: (who: string, days: string, range: string, workspace: string, waited: number, urls: { approve: string; decline: string; all: string }) =>
        `${who} hat vor ${waited} Tagen ${days} frei beantragt, ${range}, in ${workspace}, und wartet noch auf eine Antwort.\n\nGenehmigen: ${urls.approve}\n\nAblehnen: ${urls.decline}\n\nBeide Links gelten 7 Tage ohne Anmeldung. Leite diese E-Mail nicht weiter.\n\nAlle offenen Anträge: ${urls.all}`,
    },
    stillPending: {
      subject: "Dein Antrag wartet noch",
      text: (range: string, workspace: string, names: string, url: string) =>
        `Dein Antrag für ${range} in ${workspace} ist noch nicht beantwortet. Wir haben ${names} erinnert.\n\nBuche besser nichts, was du nicht stornieren kannst, bis er genehmigt ist.\n\n${url}`,
    },
    autoApproved: (days: number) => `Innerhalb von ${days} Tagen hat niemand geantwortet, deshalb wurde er automatisch genehmigt, so wie dein Team es eingestellt hat.`,
    request: {
      subject: (who: string) => `${who} hat frei beantragt`,
      text: (who: string, days: string, range: string, workspace: string, urls: { approve: string; decline: string; all: string }) =>
        `${who} hat ${days} frei beantragt, ${range}, in ${workspace}.\n\nGenehmigen: ${urls.approve}\n\nAblehnen: ${urls.decline}\n\nBeide Links zeigen erst, wer sonst abwesend ist, und gelten 7 Tage ohne Anmeldung. Leite diese E-Mail nicht weiter.\n\nAlle offenen Anträge: ${urls.all}`,
    },
    standIn: {
      subject: (who: string) => `Du vertrittst ${who}`,
      text: (who: string, range: string, workspace: string, url: string) =>
        `${who} ist ${range} in ${workspace} nicht da, und du bist die Vertretung. Sprecht euch vorher ab, falls etwas übergeben werden muss.\n\nTeamkalender: ${url}`,
    },
    sick: {
      subject: (who: string) => `${who} ist krank`,
      text: (who: string, range: string, workspace: string, url: string) =>
        `${who} hat sich für ${range} in ${workspace} krankgemeldet. Kolleginnen und Kollegen sehen nur „Sonstiges“.\n\nKalender: ${url}`,
    },
    welcome: {
      subject: (workspace: string) => `Du bist bei Urlaubflow im Team von ${workspace}`,
      text: (workspace: string, url: string) =>
        `Dein Team plant Urlaub jetzt in Urlaubflow, im Workspace ${workspace}.\n\nMelde dich mit dieser E-Mail-Adresse an: ${url}\n\nDu bekommst einen Anmeldelink per E-Mail, ein Passwort brauchst du nicht. Dort siehst du den Teamkalender und deine übrigen Urlaubstage und kannst Urlaub buchen.`,
    },
    trialEnding: {
      subject: (workspace: string, date: string, last: boolean) =>
        `${last ? "Letzte Erinnerung: Die" : "Die"} kostenlose Testphase von ${workspace} endet am ${date}`,
      text: (o: { workspace: string; date: string; people: number; freeMax: number; billingUrl: string; contact: string }) =>
        [
          `Die kostenlose Testphase von ${o.workspace} in Urlaubflow endet am ${o.date}.`,
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
