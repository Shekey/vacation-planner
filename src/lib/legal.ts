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

/** Subprocessors listed in the privacy policy and DPA. */
export const SUBPROCESSORS = [
  { name: "Vercel Inc.", purpose: "Hosting of the application (region Frankfurt, EU)", location: "EU (Frankfurt); USA for support, under EU standard contractual clauses" },
  { name: "Neon Inc.", purpose: "Database (region Frankfurt, EU)", location: "EU (Frankfurt); USA for support, under EU standard contractual clauses" },
  { name: "Resend Inc.", purpose: "Sending sign-in and notification emails", location: "USA, under EU standard contractual clauses" },
  { name: "Stripe Payments Europe Ltd.", purpose: "Payments and invoices (admins of paying workspaces only)", location: "Ireland, EU" },
  { name: "Microsoft Ireland Operations Ltd.", purpose: "Microsoft Teams posts, only when a workspace connects Teams", location: "Ireland, EU" },
  { name: "Slack Technologies Ltd.", purpose: "Slack posts, only when a workspace connects Slack", location: "Ireland, EU" },
] as const;
