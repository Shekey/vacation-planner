import { defineMessages } from "../define";

/** Plans, trial status and checkout. */
export const billing = defineMessages({
  en: {
    title: "Billing",
    planName: { FREE: "Free", TEAM: "Team", BUSINESS: "Business" },
    statusTrial: (days: number, max: number) =>
      `Free trial: ${days} ${days === 1 ? "day" : "days"} left, with everything for up to ${max} people.`,
    statusPaid: (plan: string, renews: string | null, pastDue: boolean) =>
      `${plan} plan${renews ? `, renews on ${renews}` : ""}${pastDue ? ". The last payment failed; update the card to keep the plan." : "."}`,
    statusFree: (max: number) => `Free plan, for up to ${max} people, without Teams and Slack posts.`,
    thanks: "Thanks! Your plan is active as soon as Stripe confirms the payment, usually within a few seconds.",
    yourPlan: "Your plan",
    peopleCount: (n: number, max: number) => `${n} of ${max} people`,
    overLimit: ". New bookings are paused until you upgrade or remove people.",
    portal: "Invoices, card and cancelling",
    plans: "Plans",
    upTo: (n: number) => `Up to ${n} people`,
    perMonth: " / month",
    orYearly: (price: string) => `or ${price} / year (2 months free)`,
    featureAllowances: "Allowances, half days, holidays per state",
    featureApprovals: "Approvals and calendar feeds",
    chatYes: "Microsoft Teams and Slack posts",
    chatNo: "No Teams or Slack posts",
    fits: (n: number) => `Fits your team of ${n}`,
    current: "Current plan",
    monthly: "Monthly",
    yearly: "Yearly",
    notReady: (email: string) => `Online payment isn't switched on yet. Write to ${email} to upgrade.`,
    vatNote: (max: number, email: string) =>
      `Prices are net; German VAT (19%) is added for German customers, and EU businesses with a VAT ID get reverse charge. More than ${max} people? Write to ${email} for an offer with invoice billing.`,
    noSubscription: "There is no subscription yet.",
  },
  de: {
    title: "Abrechnung",
    planName: { FREE: "Free", TEAM: "Team", BUSINESS: "Business" },
    statusTrial: (days: number, max: number) =>
      `Kostenloser Test: noch ${days} ${days === 1 ? "Tag" : "Tage"}, mit allem für bis zu ${max} Personen.`,
    statusPaid: (plan: string, renews: string | null, pastDue: boolean) =>
      `Tarif ${plan}${renews ? `, verlängert sich am ${renews}` : ""}${
        pastDue ? ". Die letzte Zahlung ist fehlgeschlagen. Aktualisiere die Karte, um den Tarif zu behalten." : "."
      }`,
    statusFree: (max: number) => `Tarif Free, für bis zu ${max} Personen, ohne Posts in Teams und Slack.`,
    thanks: "Danke! Dein Tarif ist aktiv, sobald Stripe die Zahlung bestätigt, meist innerhalb weniger Sekunden.",
    yourPlan: "Dein Tarif",
    peopleCount: (n: number, max: number) => `${n} von ${max} Personen`,
    overLimit: ". Neue Buchungen sind pausiert, bis du einen größeren Tarif wählst oder Personen entfernst.",
    portal: "Rechnungen, Karte und Kündigung",
    plans: "Tarife",
    upTo: (n: number) => `Bis zu ${n} Personen`,
    perMonth: " / Monat",
    orYearly: (price: string) => `oder ${price} / Jahr (2 Monate gratis)`,
    featureAllowances: "Urlaubsanspruch, halbe Tage, Feiertage je Bundesland",
    featureApprovals: "Freigaben und Kalender-Feeds",
    chatYes: "Posts in Microsoft Teams und Slack",
    chatNo: "Keine Posts in Teams oder Slack",
    fits: (n: number) => `Passt zu deinem Team mit ${n} Personen`,
    current: "Aktueller Tarif",
    monthly: "Monatlich",
    yearly: "Jährlich",
    notReady: (email: string) => `Online-Zahlung ist noch nicht eingeschaltet. Schreib an ${email}, um zu upgraden.`,
    vatNote: (max: number, email: string) =>
      `Alle Preise sind netto. Kunden in Deutschland zahlen zusätzlich 19 % USt., Unternehmen in der EU mit USt-IdNr. erhalten Reverse Charge. Mehr als ${max} Personen? Schreib an ${email} für ein Angebot mit Zahlung auf Rechnung.`,
    noSubscription: "Es gibt noch kein Abo.",
  },
});
