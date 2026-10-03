import { defineMessages } from "../define";

/** Shared labels of the legal pages. The legal texts themselves live in the pages, in both languages. */
export const legal = defineMessages({
  en: {
    updated: "Last updated",
    draft: "Draft: not yet reviewed by a lawyer.",
    email: "Email",
    phone: "Phone",
    location: "Location",
    translationNote: "This is a translation for convenience. The German version is legally binding.",
    germanVersion: "Read the German version",
    englishVersion: "English version",
    titles: {
      impressum: "Legal notice (Impressum)",
      privacy: "Privacy policy",
      terms: "Terms and conditions",
      dpa: "Data processing agreement",
    },
  },
  de: {
    updated: "Stand",
    draft: "Entwurf: Dieser Text ist noch nicht anwaltlich geprüft.",
    email: "E-Mail",
    phone: "Telefon",
    location: "Ort",
    translationNote: "Dies ist eine Übersetzung zur besseren Verständlichkeit. Rechtsverbindlich ist die deutsche Fassung.",
    germanVersion: "Deutsche Fassung lesen",
    englishVersion: "English version",
    titles: {
      impressum: "Impressum",
      privacy: "Datenschutzerklärung",
      terms: "AGB",
      dpa: "Auftragsverarbeitungsvertrag",
    },
  },
});
