import { defineMessages } from "../define";

export const signIn = defineMessages({
  en: {
    title: "Sign in",
    /** Codes Auth.js puts in ?error= when it sends someone back here, plus our own RateLimited. */
    errors: {
      Configuration: "Sign-in isn't set up correctly on the server, so no email was sent. Please tell your admin.",
      Verification: "That sign-in link has expired or was already used. Enter your email to get a new one.",
      AccessDenied: "You don't have access.",
      RateLimited: "We've already sent a few links to that address. Check your inbox and spam folder, or try again in 10 minutes.",
    } as Record<string, string>,
    defaultError: "Something went wrong signing you in. Please try again.",
    checkEmail: "Check your email",
    sentBody: "We sent you a sign-in link. It works once and expires in an hour. You can close this tab.",
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
        "Die Anmeldung ist auf dem Server nicht richtig eingerichtet, deshalb wurde keine E-Mail verschickt. Bitte sag deinem Admin Bescheid.",
      Verification: "Dieser Anmeldelink ist abgelaufen oder wurde schon benutzt. Gib deine E-Mail-Adresse ein, um einen neuen zu bekommen.",
      AccessDenied: "Du hast keinen Zugriff.",
      RateLimited:
        "Wir haben schon mehrere Links an diese Adresse geschickt. Schau in deinen Posteingang und Spam-Ordner oder versuch es in 10 Minuten noch einmal.",
    },
    defaultError: "Bei der Anmeldung ist etwas schiefgelaufen. Bitte versuch es noch einmal.",
    checkEmail: "Schau in dein Postfach",
    sentBody:
      "Wir haben dir einen Anmeldelink geschickt. Er funktioniert einmal und läuft nach einer Stunde ab. Du kannst diesen Tab schließen.",
    heading: "Anmelden",
    inviteIntro: "Melde dich an, um deine Einladung anzunehmen. Wir schicken dir einen Link per E-Mail.",
    intro: "Kein Passwort nötig. Wir schicken dir einen Link per E-Mail.",
    emailLabel: "Geschäftliche E-Mail-Adresse",
    emailPlaceholder: "du@firma.de",
    sending: "Link wird gesendet…",
    submit: "Link per E-Mail senden",
  },
});
