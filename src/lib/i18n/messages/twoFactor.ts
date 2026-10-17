import { defineMessages } from "../define";

/** Second-factor sign-in for the operator's team. */
export const twoFactor = defineMessages({
  en: {
    title: "Two-factor sign-in",
    setupIntro:
      "The super-admin area needs a second factor. Scan this code with an authenticator app (1Password, Authy, Google Authenticator, Microsoft Authenticator), then type the 6-digit code it shows.",
    scanAlt: "QR code for your authenticator app",
    orType: "Can't scan? Type this key into the app instead:",
    codeLabel: "6-digit code",
    turnOn: "Turn on",
    verifyIntro: "Type the 6-digit code from your authenticator app. Lost your phone? Use one of your recovery codes instead.",
    verifyLabel: "Code or recovery code",
    verify: "Continue",
    recoveryLeft: (n: number) => `${n} recovery ${n === 1 ? "code" : "codes"} left.`,
    recoveryTitle: "Your recovery codes",
    recoveryBody:
      "Save these somewhere safe, for example in your password manager. Each works once if you lose your phone. They are shown only now.",
    recoveryDone: "I've saved them, continue",
    verifiedTitle: "You're signed in with two factors",
    verifiedBody: "This sign-in stays verified for 12 hours.",
    toAdmin: "To the super-admin area",
    newCodes: "Make new recovery codes",
    newCodesHint: "The old ones stop working.",
    errors: {
      wrong: "That code isn't right. Check the time on your phone and try again.",
      locked: "Too many wrong codes. Try again in 15 minutes.",
      notSetUp: "Two-factor isn't set up yet. Reload this page.",
      empty: "Enter the code.",
    },
  },
  de: {
    title: "Anmeldung mit zwei Faktoren",
    setupIntro:
      "Für den Super-Admin-Bereich brauchst du einen zweiten Faktor. Scanne diesen Code mit einer Authenticator-App (1Password, Authy, Google Authenticator, Microsoft Authenticator) und gib dann den 6-stelligen Code ein, den sie anzeigt.",
    scanAlt: "QR-Code für deine Authenticator-App",
    orType: "Scannen geht nicht? Gib stattdessen diesen Schlüssel in der App ein:",
    codeLabel: "6-stelliger Code",
    turnOn: "Einschalten",
    verifyIntro: "Gib den 6-stelligen Code aus deiner Authenticator-App ein. Handy verloren? Nimm stattdessen einen deiner Wiederherstellungscodes.",
    verifyLabel: "Code oder Wiederherstellungscode",
    verify: "Weiter",
    recoveryLeft: (n: number) => `Noch ${n} ${n === 1 ? "Wiederherstellungscode" : "Wiederherstellungscodes"}.`,
    recoveryTitle: "Deine Wiederherstellungscodes",
    recoveryBody:
      "Speichere sie sicher, zum Beispiel in deinem Passwort-Manager. Wenn du dein Handy verlierst, funktioniert jeder einmal. Sie werden nur jetzt angezeigt.",
    recoveryDone: "Ich habe sie gespeichert, weiter",
    verifiedTitle: "Du bist mit zwei Faktoren angemeldet",
    verifiedBody: "Diese Anmeldung bleibt 12 Stunden bestätigt.",
    toAdmin: "Zum Super-Admin-Bereich",
    newCodes: "Neue Wiederherstellungscodes erstellen",
    newCodesHint: "Die alten funktionieren dann nicht mehr.",
    errors: {
      wrong: "Dieser Code stimmt nicht. Prüfe die Uhrzeit auf deinem Handy und versuche es noch einmal.",
      locked: "Zu viele falsche Codes. Versuche es in 15 Minuten wieder.",
      notSetUp: "Zwei Faktoren sind noch nicht eingerichtet. Lade die Seite neu.",
      empty: "Gib den Code ein.",
    },
  },
});
