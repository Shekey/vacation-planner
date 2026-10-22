import { defineMessages } from "../define";

export const signIn = defineMessages({
  en: {
    title: "Sign in",
    /** Codes Auth.js puts in ?error= when it sends someone back here, plus our own RateLimited. */
    errors: {
      Configuration: "We couldn't send the sign-in email. This is a problem on our side, not with your address. Please try again in a few minutes.",
      Verification:
        "That sign-in link has expired or was already used. Links work once, for an hour; some company mail filters open links before you do. Enter your email to get a new one.",
      EmailSignInError: "We couldn't send an email to that address. Check it for typos, or try again in a few minutes.",
      AccessDenied: "You don't have access.",
      RateLimited: "Too many sign-in links were requested from your network. Please try again in an hour.",
    } as Record<string, string>,
    defaultError: "Something went wrong signing you in. Please try again.",
    checkEmail: "Check your email",
    sentTo: "We sent a sign-in link to",
    sentBody: "Open it on this device or any other. It works once and expires in an hour. You can close this tab.",
    alreadySent:
      "We've sent several links to this address in the last few minutes, so we didn't send another. Use the newest one; each works for an hour. You can ask for a new one again in 10 minutes.",
    notArrived: "Nothing after a few minutes? Check your spam or junk folder, or send a new link.",
    resend: "Send a new link",
    otherEmail: "Use a different email",
    confirm: {
      title: "Sign in to Urlaubflow",
      body: "Continue to sign in as",
      button: "Sign in",
      why: "This extra step stops company mail filters from using up your link before you click it.",
      broken: "This sign-in link is incomplete. Copy the whole link from the email, or ask for a new one.",
      newLink: "Get a new link",
    },
    heading: "Sign in",
    inviteIntro: "Sign in to accept your invitation. We'll email you a link.",
    intro: "No password needed. We'll email you a link.",
    emailLabel: "Work email",
    emailPlaceholder: "you@company.com",
    sending: "Sending link…",
    submit: "Email me a link",
  },
  de: {
    title: "Anmelden",
    errors: {
      Configuration:
        "Wir konnten die Anmelde-E-Mail nicht verschicken. Das liegt an uns, nicht an deiner Adresse. Bitte versuch es in ein paar Minuten noch einmal.",
      Verification:
        "Dieser Anmeldelink ist abgelaufen oder wurde schon benutzt. Links funktionieren einmal, für eine Stunde; manche Mailfilter in Firmen öffnen Links, bevor du es tust. Gib deine E-Mail-Adresse ein, um einen neuen zu bekommen.",
      EmailSignInError:
        "Wir konnten keine E-Mail an diese Adresse schicken. Prüf sie auf Tippfehler oder versuch es in ein paar Minuten noch einmal.",
      AccessDenied: "Du hast keinen Zugriff.",
      RateLimited: "Aus deinem Netzwerk wurden zu viele Anmeldelinks angefordert. Bitte versuch es in einer Stunde noch einmal.",
    },
    defaultError: "Bei der Anmeldung ist etwas schiefgelaufen. Bitte versuch es noch einmal.",
    checkEmail: "Schau in dein Postfach",
    sentTo: "Wir haben einen Anmeldelink geschickt an",
    sentBody: "Öffne ihn auf diesem oder einem anderen Gerät. Er funktioniert einmal und läuft nach einer Stunde ab. Du kannst diesen Tab schließen.",
    alreadySent:
      "Wir haben in den letzten Minuten schon mehrere Links an diese Adresse geschickt, deshalb kam kein weiterer. Nimm den neuesten; jeder gilt eine Stunde. In 10 Minuten kannst du wieder einen neuen anfordern.",
    notArrived: "Nach ein paar Minuten nichts da? Schau in den Spam- oder Junk-Ordner oder lass dir einen neuen Link schicken.",
    resend: "Neuen Link senden",
    otherEmail: "Andere E-Mail-Adresse verwenden",
    confirm: {
      title: "Bei Urlaubflow anmelden",
      body: "Weiter, um dich anzumelden als",
      button: "Anmelden",
      why: "Dieser Zwischenschritt verhindert, dass Mailfilter in Firmen deinen Link verbrauchen, bevor du klickst.",
      broken: "Dieser Anmeldelink ist unvollständig. Kopiere den ganzen Link aus der E-Mail oder fordere einen neuen an.",
      newLink: "Neuen Link anfordern",
    },
    heading: "Anmelden",
    inviteIntro: "Melde dich an, um deine Einladung anzunehmen. Wir schicken dir einen Link per E-Mail.",
    intro: "Kein Passwort nötig. Wir schicken dir einen Link per E-Mail.",
    emailLabel: "Geschäftliche E-Mail-Adresse",
    emailPlaceholder: "du@firma.de",
    sending: "Link wird gesendet…",
    submit: "Link per E-Mail senden",
  },
});
