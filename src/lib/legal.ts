/**
 * Who runs the service, shown in the Impressum, privacy policy, terms and DPA.
 * Fill these in before taking payments; the legal pages show a draft notice until `reviewed` is true.
 */
export const OPERATOR = {
  name: process.env.LEGAL_NAME ?? "[Name or company]",
  address: process.env.LEGAL_ADDRESS ?? "[Street and number], [Postcode] [City], Germany",
  email: process.env.LEGAL_EMAIL ?? "support@[your-domain].de",
  phone: process.env.LEGAL_PHONE ?? "",
  /** USt-IdNr., if registered for VAT. */
  vatId: process.env.LEGAL_VAT_ID ?? "",
  /** Person responsible for content under § 18 Abs. 2 MStV. */
  responsible: process.env.LEGAL_RESPONSIBLE ?? process.env.LEGAL_NAME ?? "[Name]",
  /** Set to "1" once a lawyer has checked the texts. */
  reviewed: process.env.LEGAL_REVIEWED === "1",
};

/** Subprocessors listed in the privacy policy and DPA, with purpose and location in both languages. */
export const SUBPROCESSORS = [
  {
    name: "Vercel Inc.",
    purpose: { en: "Hosting of the application (region Frankfurt, EU)", de: "Hosting der Anwendung (Region Frankfurt, EU)" },
    location: {
      en: "EU (Frankfurt); USA for support, under EU standard contractual clauses",
      de: "EU (Frankfurt); USA für Support, auf Grundlage der EU-Standardvertragsklauseln",
    },
  },
  {
    name: "Neon Inc.",
    purpose: { en: "Database (region Frankfurt, EU)", de: "Datenbank (Region Frankfurt, EU)" },
    location: {
      en: "EU (Frankfurt); USA for support, under EU standard contractual clauses",
      de: "EU (Frankfurt); USA für Support, auf Grundlage der EU-Standardvertragsklauseln",
    },
  },
  {
    name: "Resend Inc.",
    purpose: { en: "Sending sign-in and notification emails", de: "Versand von Anmelde- und Benachrichtigungs-E-Mails" },
    location: { en: "USA, under EU standard contractual clauses", de: "USA, auf Grundlage der EU-Standardvertragsklauseln" },
  },
  {
    name: "Stripe Payments Europe Ltd.",
    purpose: {
      en: "Payments and invoices (admins of paying workspaces only)",
      de: "Zahlungen und Rechnungen (nur Admins zahlender Workspaces)",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
  {
    name: "Microsoft Ireland Operations Ltd.",
    purpose: {
      en: "Microsoft Teams posts, only when a workspace connects Teams",
      de: "Nachrichten in Microsoft Teams, nur wenn ein Workspace Teams verbindet",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
  {
    name: "Slack Technologies Ltd.",
    purpose: {
      en: "Slack posts, only when a workspace connects Slack",
      de: "Nachrichten in Slack, nur wenn ein Workspace Slack verbindet",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
] as const;
