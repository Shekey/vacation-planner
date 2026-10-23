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
  /** Legal form and who represents the business, e.g. "UG (haftungsbeschränkt), vertreten durch …"; empty for a sole trader. */
  representative: process.env.LEGAL_REPRESENTATIVE ?? "",
  /** Commercial register entry, e.g. "Amtsgericht Bielefeld, HRB 12345"; empty when not registered. */
  register: process.env.LEGAL_REGISTER ?? "",
  /** The data protection authority for the operator's federal state, named in the privacy policy. */
  supervisoryAuthority: process.env.LEGAL_SUPERVISORY_AUTHORITY ?? "[Data protection authority of your federal state, with address]",
  /** Person responsible for content under § 18 Abs. 2 MStV. */
  responsible: process.env.LEGAL_RESPONSIBLE ?? process.env.LEGAL_NAME ?? "[Name]",
  /** Set to "1" once a lawyer has checked the texts. */
  reviewed: process.env.LEGAL_REVIEWED === "1",
};

/**
 * Subprocessors listed in the privacy policy and DPA, with purpose and location in both languages.
 * `dpa: false` means the service never receives customers' employee data (it is only about visitors of the public
 * pages), so it is named in the privacy policy but not in the customer DPA.
 */
export const SUBPROCESSORS = [
  {
    name: "Vercel Inc.",
    dpa: true,
    purpose: { en: "Hosting of the application (region Frankfurt, EU)", de: "Hosting der Anwendung (Region Frankfurt, EU)" },
    location: {
      en: "EU (Frankfurt); USA for support, under EU standard contractual clauses",
      de: "EU (Frankfurt); USA für Support, auf Grundlage der EU-Standardvertragsklauseln",
    },
  },
  {
    name: "Neon Inc.",
    dpa: true,
    purpose: { en: "Database (region Frankfurt, EU)", de: "Datenbank (Region Frankfurt, EU)" },
    location: {
      en: "EU (Frankfurt); USA for support, under EU standard contractual clauses",
      de: "EU (Frankfurt); USA für Support, auf Grundlage der EU-Standardvertragsklauseln",
    },
  },
  {
    name: "Resend Inc.",
    dpa: true,
    purpose: { en: "Sending sign-in and notification emails", de: "Versand von Anmelde- und Benachrichtigungs-E-Mails" },
    location: { en: "USA, under EU standard contractual clauses", de: "USA, auf Grundlage der EU-Standardvertragsklauseln" },
  },
  {
    name: "Stripe Payments Europe Ltd.",
    dpa: true,
    purpose: {
      en: "Payments and invoices (admins of paying workspaces only)",
      de: "Zahlungen und Rechnungen (nur Admins zahlender Workspaces)",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
  {
    name: "Functional Software, Inc. (Sentry)",
    dpa: true,
    purpose: {
      en: "Error monitoring (error reports with email addresses, tokens and request contents removed before they are sent)",
      de: "Fehlerüberwachung (Fehlerberichte, aus denen E-Mail-Adressen, Tokens und Anfrageinhalte vor dem Senden entfernt werden)",
    },
    location: {
      en: "EU region; USA for support, under EU standard contractual clauses",
      de: "EU-Region; USA für Support, auf Grundlage der EU-Standardvertragsklauseln",
    },
  },
  {
    name: "PostHog Inc.",
    dpa: false,
    purpose: {
      en: "Anonymous, cookieless usage statistics of the public pages and page counts in the app (EU cloud)",
      de: "Anonyme Nutzungsstatistik ohne Cookies für die öffentlichen Seiten und Seitenaufrufe in der App (EU-Cloud)",
    },
    location: {
      en: "EU (Frankfurt); USA for support, under EU standard contractual clauses",
      de: "EU (Frankfurt); USA für Support, auf Grundlage der EU-Standardvertragsklauseln",
    },
  },
  {
    name: "Microsoft Ireland Operations Ltd.",
    dpa: true,
    purpose: {
      en: "Microsoft Teams posts, only when a workspace connects Teams; sign-in with Microsoft, only for people who choose it; reading names and email addresses from a company's Microsoft 365, only when its admin connects it; time off in a person's own Outlook calendar, only when they connect it",
      de: "Nachrichten in Microsoft Teams, nur wenn ein Workspace Teams verbindet; Anmeldung mit Microsoft, nur wenn jemand sie wählt; Lesen von Namen und E-Mail-Adressen aus dem Microsoft 365 einer Firma, nur wenn deren Admin es verbindet; Abwesenheit im eigenen Outlook-Kalender, nur wenn jemand ihn verbindet",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
  {
    name: "Google Ireland Limited",
    dpa: false,
    purpose: {
      en: "Sign-in with Google, only for people who choose it (name and email address)",
      de: "Anmeldung mit Google, nur wenn jemand sie wählt (Name und E-Mail-Adresse)",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
  {
    name: "Slack Technologies Ltd.",
    dpa: true,
    purpose: {
      en: "Slack posts, only when a workspace connects Slack",
      de: "Nachrichten in Slack, nur wenn ein Workspace Slack verbindet",
    },
    location: { en: "Ireland, EU", de: "Irland, EU" },
  },
] as const;
