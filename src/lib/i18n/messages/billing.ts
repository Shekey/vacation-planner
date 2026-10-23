import { defineMessages } from "../define";

/** Plans, trial status and checkout. */
export const billing = defineMessages({
  en: {
    title: "Billing",
    eyebrow: "Workspace administration",
    subtitleBeta: "Your whole team is included in the free beta. No charges.",
    subtitle: "Your plan, what it covers and what the others cost.",
    currentBeta: "Current · Free beta",
    membersIncluded: (n: number) => `${n} ${n === 1 ? "member" : "members"} included`,
    betaAmountNote: "during beta · all team features",
    betaNoCharges: "No paid subscription or charges. We'll email you when beta ends, and you'll choose a plan yourself.",
    afterBeta: {
      title: "What happens after beta?",
      over: (n: number, max: number) =>
        `The Free plan includes ${max} people; your workspace has ${n}. Nothing is automatically deleted. Choose a suitable plan or remove people to fit the Free limit.`,
      fits: (max: number) => `Your team fits the Free plan, which includes up to ${max} people. Nothing is deleted either way.`,
    },
    plansAfter: "Plans after beta",
    notSubscribed: "Not subscribed",
    netNote: "Monthly net prices · German VAT 19% where applicable",
    tooSmall: (n: number) => `Too small for your ${n} ${n === 1 ? "member" : "members"}`,
    fitsMembers: (n: number) => `Fits your ${n} ${n === 1 ? "member" : "members"}`,
    fitsBadge: "Fits your team",
    founderBadge: (percent: number) => `${percent}% off · founder discount`,
    founderOnce: "With founder discount, once subscribed.",
    freeNote: (max: number) => `Available after beta for workspaces with up to ${max} people.`,
    freeNote2: "Your whole team stays free during beta.",
    suitable: (plan: string, n: number) => `${plan} is the suitable plan for ${n} ${n === 1 ? "person" : "people"}.`,
    details: {
      title: "After-beta details",
      overTitle: "If you're over the limit",
      overBody:
        "Sign-in, calendar access and cancellation continue. New bookings and invitations pause until you choose a suitable plan or remove people to meet the limit.",
      controlTitle: "You stay in control",
      controlBody:
        "We'll email you at beta end. You choose your plan yourself; there is no automatic paid subscription and no automatic deletion for being over the limit.",
      retentionTitle: "Data retention & deletion",
    },
    tax: {
      title: "Tax, migration & larger teams",
      vatTitle: "VAT & EU businesses",
      vatBody: "All prices are net. German VAT is 19%. EU businesses with a valid EU VAT ID can use reverse charge.",
      migrationTitle: "Assisted migration",
      migrationBody: (price: string) => `${price} once for assisted migration. Included with annual Business.`,
      largeTitle: (n: number) => `More than ${n} people?`,
      largeBody: "Contact support for a suitable arrangement.",
      contact: "Contact support",
    },
    planName: { FREE: "Free", TEAM: "Team", BUSINESS: "Business" },
    statusTrial: (days: number, max: number, endsOn: string) =>
      `Free trial: ${days} ${days === 1 ? "day" : "days"} left (until ${endsOn}), with everything for up to ${max} people.`,
    statusPaid: (plan: string, renews: string | null, pastDue: boolean, endsOn: string | null) =>
      `${plan} plan${endsOn ? `, cancelled, runs until ${endsOn}` : renews ? `, renews on ${renews}` : ""}${
        pastDue ? ". The last payment failed; update the payment method to keep the plan." : "."
      }`,
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
    betaNoPayments: "Payments aren't open yet: everything is free during the beta.",
    statusBeta: "Free beta: everything is included for your whole team, at no cost.",
    dataBeta: "Nothing is charged during the beta. When it ends we tell you by email, nothing is deleted, and you choose a plan yourself.",
    founderTitle: "Your founder discount",
    founderBody: (percent: number, team: string, business: string, teamList: string, businessList: string) =>
      `Your workspace joined during the beta, so it keeps ${percent}% off the regular price for good once you subscribe: Team ${team} instead of ${teamList} a month, Business ${business} instead of ${businessList}.`,
    betaPricesHeading: "Regular prices after the beta",
    setupNote: (price: string, email: string) =>
      `Moving a big team over? Import it yourself from Excel under Members, or we do it for you: ${price} once, included with a yearly Business plan. Write to ${email}.`,
    dataHeading: "What happens to your data",
    dataTrial: (date: string, max: number) =>
      `When the trial ends on ${date}, nothing is deleted. The workspace moves to the free plan, for up to ${max} people and without Teams and Slack posts.`,
    dataPaid: (max: number) =>
      `If you cancel, your plan runs until the end of the period you paid for. Then the workspace moves to the free plan, for up to ${max} people. Nothing is deleted.`,
    dataPastDue:
      "If the payment keeps failing, Stripe ends the subscription after a few retries and the workspace moves to the free plan. Nothing is deleted.",
    dataFree: "Everything your team entered is still here.",
    dataOverFree: (n: number, max: number) =>
      `With ${n} people you're over the ${max} the free plan covers: everyone can still sign in, see the calendar and cancel time off, but new bookings and invitations pause until you pick a plan or remove people.`,
    dataRetention: (years: number) =>
      `Data is only deleted when you delete the workspace in Settings, when someone deletes their own account, and bookings ${years} years after they end.`,
  },
  de: {
    title: "Abrechnung",
    eyebrow: "Workspace-Verwaltung",
    subtitleBeta: "Dein ganzes Team ist in der kostenlosen Beta enthalten. Keine Kosten.",
    subtitle: "Dein Tarif, was er abdeckt und was die anderen kosten.",
    currentBeta: "Aktuell · Kostenlose Beta",
    membersIncluded: (n: number) => `${n} ${n === 1 ? "Mitglied" : "Mitglieder"} inklusive`,
    betaAmountNote: "in der Beta · alle Team-Funktionen",
    betaNoCharges: "Kein kostenpflichtiges Abo, keine Abbuchungen. Wir schreiben dir per E-Mail, wenn die Beta endet, und du wählst selbst einen Tarif.",
    afterBeta: {
      title: "Was passiert nach der Beta?",
      over: (n: number, max: number) =>
        `Der Tarif Free umfasst ${max} Personen; dein Workspace hat ${n}. Es wird nichts automatisch gelöscht. Wähle einen passenden Tarif oder entferne Personen, damit ihr unter das Free-Limit passt.`,
      fits: (max: number) => `Dein Team passt in den Tarif Free, der bis zu ${max} Personen umfasst. Gelöscht wird in keinem Fall etwas.`,
    },
    plansAfter: "Tarife nach der Beta",
    notSubscribed: "Nicht abonniert",
    netNote: "Monatliche Nettopreise · 19 % deutsche USt., wo zutreffend",
    tooSmall: (n: number) => `Zu klein für ${n === 1 ? "dein Mitglied" : `deine ${n} Mitglieder`}`,
    fitsMembers: (n: number) => `Passt zu ${n === 1 ? "deinem Mitglied" : `deinen ${n} Mitgliedern`}`,
    fitsBadge: "Passt zu deinem Team",
    founderBadge: (percent: number) => `${percent} % Rabatt · Gründerrabatt`,
    founderOnce: "Mit Gründerrabatt, sobald du abonnierst.",
    freeNote: (max: number) => `Nach der Beta verfügbar für Workspaces mit bis zu ${max} Personen.`,
    freeNote2: "Dein ganzes Team bleibt in der Beta kostenlos.",
    suitable: (plan: string, n: number) => `${plan} ist der passende Tarif für ${n} ${n === 1 ? "Person" : "Personen"}.`,
    details: {
      title: "Details zur Zeit nach der Beta",
      overTitle: "Wenn ihr über dem Limit seid",
      overBody:
        "Anmelden, Kalender ansehen und Stornieren funktionieren weiter. Neue Buchungen und Einladungen pausieren, bis du einen passenden Tarif wählst oder Personen entfernst.",
      controlTitle: "Du behältst die Kontrolle",
      controlBody:
        "Wir schreiben dir per E-Mail, wenn die Beta endet. Du wählst deinen Tarif selbst; es gibt kein automatisches kostenpflichtiges Abo und keine automatische Löschung, weil ihr über dem Limit seid.",
      retentionTitle: "Aufbewahrung & Löschung",
    },
    tax: {
      title: "Steuern, Umzug & größere Teams",
      vatTitle: "USt. & Unternehmen in der EU",
      vatBody: "Alle Preise sind netto. Die deutsche USt. beträgt 19 %. Unternehmen in der EU mit gültiger USt-IdNr. erhalten Reverse Charge.",
      migrationTitle: "Begleiteter Umzug",
      migrationBody: (price: string) => `Einmalig ${price} für den begleiteten Umzug. Im Jahres-Tarif Business enthalten.`,
      largeTitle: (n: number) => `Mehr als ${n} Personen?`,
      largeBody: "Schreib dem Support, dann finden wir eine passende Lösung.",
      contact: "Support kontaktieren",
    },
    planName: { FREE: "Free", TEAM: "Team", BUSINESS: "Business" },
    statusTrial: (days: number, max: number, endsOn: string) =>
      `Kostenloser Test: noch ${days} ${days === 1 ? "Tag" : "Tage"} (bis ${endsOn}), mit allem für bis zu ${max} Personen.`,
    statusPaid: (plan: string, renews: string | null, pastDue: boolean, endsOn: string | null) =>
      `Tarif ${plan}${endsOn ? `, gekündigt, läuft bis ${endsOn}` : renews ? `, verlängert sich am ${renews}` : ""}${
        pastDue ? ". Die letzte Zahlung ist fehlgeschlagen. Aktualisiere die Zahlungsmethode, um den Tarif zu behalten." : "."
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
    betaNoPayments: "Zahlungen sind noch nicht geöffnet: In der Beta ist alles kostenlos.",
    statusBeta: "Kostenlose Beta: Alles ist für dein ganzes Team inklusive, ohne Kosten.",
    dataBeta: "In der Beta wird nichts abgebucht. Wenn sie endet, sagen wir dir per E-Mail Bescheid, es wird nichts gelöscht, und du wählst selbst einen Tarif.",
    founderTitle: "Dein Gründerrabatt",
    founderBody: (percent: number, team: string, business: string, teamList: string, businessList: string) =>
      `Dein Workspace ist in der Beta dabei, deshalb behält er dauerhaft ${percent} % Rabatt auf den regulären Preis, sobald du abonnierst: Team ${team} statt ${teamList} im Monat, Business ${business} statt ${businessList}.`,
    betaPricesHeading: "Reguläre Preise nach der Beta",
    setupNote: (price: string, email: string) =>
      `Ein großes Team zieht um? Importiere es selbst aus Excel unter Mitglieder, oder wir machen es für dich: einmalig ${price}, im Jahres-Tarif Business enthalten. Schreib an ${email}.`,
    dataHeading: "Was mit euren Daten passiert",
    dataTrial: (date: string, max: number) =>
      `Wenn die Testphase am ${date} endet, wird nichts gelöscht. Der Workspace wechselt in den Tarif Free, für bis zu ${max} Personen und ohne Posts in Teams und Slack.`,
    dataPaid: (max: number) =>
      `Wenn du kündigst, läuft dein Tarif bis zum Ende des bezahlten Zeitraums. Danach wechselt der Workspace in den Tarif Free, für bis zu ${max} Personen. Gelöscht wird nichts.`,
    dataPastDue:
      "Schlägt die Zahlung weiter fehl, beendet Stripe das Abo nach einigen Versuchen und der Workspace wechselt in den Tarif Free. Gelöscht wird nichts.",
    dataFree: "Alles, was euer Team eingetragen hat, ist noch da.",
    dataOverFree: (n: number, max: number) =>
      `Mit ${n} Personen seid ihr über den ${max}, die Free abdeckt: Alle können sich weiter anmelden, den Kalender sehen und Urlaub stornieren, aber neue Buchungen und Einladungen sind pausiert, bis du einen Tarif wählst oder Personen entfernst.`,
    dataRetention: (years: number) =>
      `Gelöscht wird nur, wenn du den Workspace in den Einstellungen löschst, wenn jemand sein eigenes Konto löscht, und Buchungen ${years} Jahre nach ihrem Ende.`,
  },
});
