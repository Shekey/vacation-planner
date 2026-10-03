import { defineMessages } from "../define";

/** The public product page at /. */
export const landing = defineMessages({
  en: {
    hero: {
      eyebrow: "Vacation planning for teams",
      title: "Know who's out, and how many days everyone has left.",
      body: "Book vacation in a few taps, see the whole team on one calendar, and stop counting days in spreadsheets. Built for teams in Germany, with every state's public holidays.",
      cta: "Create your team's workspace",
      more: "See what it does",
      invite: "Got an invite? Sign in with the email it was sent to.",
    },
    preview: {
      label:
        "Example team calendar for two weeks: Anna on vacation for five days, Ben off for two half days with two days pending approval, Clara on vacation for two days, Deniz away for a week, and Emil taking two other days off.",
      vacation: "Vacation",
      other: "Other",
      pending: "Pending",
    },
    features: {
      title: "Everything a team needs for time off",
      subtitle: "No HR suite, no training. Just the parts people actually use.",
      items: [
        {
          title: "Days left, always visible",
          body: "Set a yearly allowance per person. Everyone sees what they've taken, what's pending and what's left, with unused days carried over up to your cap.",
        },
        {
          title: "Half days",
          body: "Book a morning or an afternoon. Half days count as half, in the allowance and on the calendar.",
        },
        {
          title: "Public holidays by region",
          body: "Import holidays for your country, then let each person pick where they work. Berlin and Bielefeld get their own days off, automatically.",
        },
        {
          title: "Approvals when you want them",
          body: "Turn on approvals per workspace and admins approve or decline with a note. Leave it off and bookings go straight in.",
        },
        {
          title: "One calendar for the team",
          body: "See the whole month at a glance and get a warning before too many people are out on the same day.",
        },
        {
          title: "Microsoft Teams and Slack updates",
          body: "Bookings and approvals post to your Teams or Slack channel, and every weekday morning it says who's out.",
        },
        {
          title: "In your own calendar",
          body: "A private calendar feed puts your team's time off into Outlook, Google Calendar or Apple Calendar.",
        },
        {
          title: "Long-weekend tips",
          body: "It spots bridge days next to public holidays, so one booked day can turn into four days off.",
        },
        {
          title: "No passwords, invite only",
          body: "People sign in with a link sent to their email. Nobody gets into your workspace unless an admin invites them.",
        },
      ],
    },
    numbers: {
      title: "The numbers, worked out for you",
      subtitle: "Weekends, half days, holidays and carry-over are counted automatically.",
    },
    ring: {
      label: "Allowance of 30 days: 12 taken, 3 pending, 15 left",
      left: "15 days left",
      detail: "of 30 · 12 taken · 3 pending",
    },
    bridge: {
      label: "Thursday 6 May 2027 is Ascension Day, you book Friday, then the weekend follows",
      holiday: "Ascension Day",
      booked: "1 day booked",
      weekend: "Weekend",
      result: "1 day booked, 4 days off",
      note: "Tips like this show up on your overview, based on your region's holidays.",
    },
    regions: {
      berlin: "Berlin",
      berlinExtra: "International Women's Day",
      bielefeld: "Bielefeld (North Rhine-Westphalia)",
      bielefeldExtra: "Corpus Christi and All Saints' Day",
      count: (n: number) => `${n} public holidays`,
      breakdown: (nationwide: number, extra: string) => `${nationwide} nationwide, plus ${extra}`,
      note: "Same company, different days off. Each person's holidays follow where they work, and never count against their allowance.",
    },
    steps: {
      title: "Up and running in five minutes",
      items: [
        { title: "Create a workspace", body: "Name your team, pick your time zone and set a default yearly allowance." },
        { title: "Invite your team", body: "Paste their emails. Each person gets a sign-in link, no account setup needed." },
        { title: "Book and plan", body: "People book days off, the calendar fills in, and Teams keeps everyone in the loop." },
      ],
    },
    pricing: {
      title: "Simple prices for the whole team",
      subtitle: (trialDays: number) =>
        `One flat price per team, not per person. Every new workspace gets ${trialDays} days with everything, no card needed.`,
      perMonth: " / month",
      upTo: (people: number) => `Up to ${people} people`,
      orYearly: (price: string) => `, or ${price} a year`,
      withChat: "Everything, including Teams and Slack.",
      withoutChat: "Everything except Teams and Slack posts.",
      footnote: (people: number) => `Prices plus VAT. More than ${people} people? Get in touch for an offer.`,
    },
    faq: {
      title: "Questions",
      items: [
        {
          q: "Who can see my bookings?",
          a: "Only people in your workspace, and they only see dates and whether it's vacation or other time off. There are no sick days and no notes, so nothing sensitive is stored.",
        },
        {
          q: "Where is our data stored?",
          a: "In data centres in Frankfurt, in the EU. We sign a data processing agreement (DPA) with every customer and use no tracking cookies.",
        },
        {
          q: "Does it work for part-time staff and new starters?",
          a: "Yes. Set the days someone works and days off only count on those. In the year someone starts, the allowance is 1/12 per full month.",
        },
        {
          q: "Does it handle different German states?",
          a: "Yes. Import Germany's holidays, choose the team's main state, and anyone working elsewhere picks their own state.",
        },
        {
          q: "Can we change allowances later?",
          a: "Yes. Admins can change anyone's yearly allowance at any time, for one person or for everyone at once.",
        },
        {
          q: "Do people need a password?",
          a: "No. They enter their email and click the link we send them.",
        },
      ],
    },
    cta: {
      title: "Plan the next holiday season together",
      body: "Create a workspace, invite your team and book the first days off today.",
      button: "Get started",
    },
  },
  de: {
    hero: {
      eyebrow: "Urlaubsplanung für Teams",
      title: "Wissen, wer fehlt, und wie viele Urlaubstage jeder noch hat.",
      body: "Urlaub in wenigen Klicks eintragen, das ganze Team in einem Kalender sehen und nie mehr Tage in Excel zählen. Gemacht für Teams in Deutschland, mit den Feiertagen aller Bundesländer.",
      cta: "Workspace für dein Team anlegen",
      more: "Funktionen ansehen",
      invite: "Du wurdest eingeladen? Melde dich mit der E-Mail-Adresse an, an die die Einladung ging.",
    },
    preview: {
      label:
        "Beispiel eines Teamkalenders über zwei Wochen: Anna hat fünf Tage Urlaub, Ben zwei halbe Tage frei und zwei Tage zur Freigabe offen, Clara zwei Tage Urlaub, Deniz ist eine Woche weg und Emil nimmt zwei Tage sonstige Abwesenheit.",
      vacation: "Urlaub",
      other: "Sonstiges",
      pending: "Offen",
    },
    features: {
      title: "Alles, was ein Team für die Urlaubsplanung braucht",
      subtitle: "Keine HR-Suite, keine Schulung. Nur das, was im Alltag wirklich gebraucht wird.",
      items: [
        {
          title: "Resturlaub immer im Blick",
          body: "Leg pro Person einen Jahresurlaub fest. Alle sehen, was sie genommen haben, was noch offen ist und was übrig bleibt. Nicht genommene Tage werden bis zu deiner Obergrenze übertragen.",
        },
        {
          title: "Halbe Tage",
          body: "Nur den Vormittag oder Nachmittag frei? Halbe Tage zählen als halbe Tage, im Urlaubskonto und im Kalender.",
        },
        {
          title: "Feiertage nach Region",
          body: "Importiere die Feiertage deines Landes, und jede Person wählt, wo sie arbeitet. Berlin und Bielefeld bekommen automatisch ihre eigenen freien Tage.",
        },
        {
          title: "Freigaben, wenn du sie willst",
          body: "Schalte Freigaben pro Workspace ein, und Admins genehmigen oder lehnen mit einer Notiz ab. Ohne Freigabe sind Buchungen sofort eingetragen.",
        },
        {
          title: "Ein Kalender fürs ganze Team",
          body: "Sieh den ganzen Monat auf einen Blick und bekomm eine Warnung, bevor zu viele Leute am selben Tag fehlen.",
        },
        {
          title: "Nachrichten in Microsoft Teams und Slack",
          body: "Buchungen und Freigaben landen in deinem Teams- oder Slack-Kanal, und jeden Werktag morgens steht dort, wer fehlt.",
        },
        {
          title: "In deinem eigenen Kalender",
          body: "Ein privater Kalender-Feed bringt die Abwesenheiten deines Teams in Outlook, Google Kalender oder Apple Kalender.",
        },
        {
          title: "Tipps für lange Wochenenden",
          body: "Erkennt Brückentage neben Feiertagen, sodass aus einem Urlaubstag vier freie Tage werden können.",
        },
        {
          title: "Ohne Passwörter, nur mit Einladung",
          body: "Die Anmeldung läuft über einen Link per E-Mail. Niemand kommt in deinen Workspace, ohne dass ein Admin ihn einlädt.",
        },
      ],
    },
    numbers: {
      title: "Wir rechnen, du planst",
      subtitle: "Wochenenden, halbe Tage, Feiertage und Übertrag werden automatisch berücksichtigt.",
    },
    ring: {
      label: "Jahresurlaub von 30 Tagen: 12 genommen, 3 offen, 15 übrig",
      left: "Noch 15 Tage",
      detail: "von 30 · 12 genommen · 3 offen",
    },
    bridge: {
      label: "Donnerstag, 6. Mai 2027, ist Christi Himmelfahrt, du nimmst den Freitag frei, danach folgt das Wochenende",
      holiday: "Christi Himmelfahrt",
      booked: "1 Tag Urlaub",
      weekend: "Wochenende",
      result: "1 Urlaubstag, 4 Tage frei",
      note: "Solche Tipps erscheinen in deiner Übersicht, passend zu den Feiertagen deiner Region.",
    },
    regions: {
      berlin: "Berlin",
      berlinExtra: "Internationaler Frauentag",
      bielefeld: "Bielefeld (Nordrhein-Westfalen)",
      bielefeldExtra: "Fronleichnam und Allerheiligen",
      count: (n: number) => `${n} Feiertage`,
      breakdown: (nationwide: number, extra: string) => `${nationwide} bundesweit, dazu ${extra}`,
      note: "Gleiche Firma, andere freie Tage. Die Feiertage jeder Person richten sich nach ihrem Arbeitsort und zählen nie gegen den Urlaub.",
    },
    steps: {
      title: "In fünf Minuten startklar",
      items: [
        { title: "Workspace anlegen", body: "Gib deinem Team einen Namen, wähle die Zeitzone und leg den Standard-Jahresurlaub fest." },
        {
          title: "Team einladen",
          body: "E-Mail-Adressen einfügen, fertig. Jede Person bekommt einen Anmeldelink, ganz ohne Registrierung.",
        },
        {
          title: "Buchen und planen",
          body: "Alle tragen ihren Urlaub ein, der Kalender füllt sich, und Teams hält alle auf dem Laufenden.",
        },
      ],
    },
    pricing: {
      title: "Einfache Preise fürs ganze Team",
      subtitle: (trialDays: number) =>
        `Ein fester Preis pro Team, nicht pro Person. Jeder neue Workspace kann ${trialDays} Tage lang alles nutzen, ohne Kreditkarte.`,
      perMonth: " / Monat",
      upTo: (people: number) => `Bis zu ${people} Personen`,
      orYearly: (price: string) => ` oder ${price} im Jahr`,
      withChat: "Alle Funktionen, inklusive Teams und Slack.",
      withoutChat: "Alle Funktionen außer Nachrichten in Teams und Slack.",
      footnote: (people: number) => `Preise zzgl. MwSt. Mehr als ${people} Personen? Sprich uns an, wir machen dir ein Angebot.`,
    },
    faq: {
      title: "Häufige Fragen",
      items: [
        {
          q: "Wer kann meine Buchungen sehen?",
          a: "Nur Personen in deinem Workspace, und die sehen nur die Daten und ob es Urlaub oder eine sonstige Abwesenheit ist. Es gibt keine Krankheitstage und keine Notizen, also werden keine sensiblen Daten gespeichert.",
        },
        {
          q: "Wo werden unsere Daten gespeichert?",
          a: "In Rechenzentren in Frankfurt, also in der EU. Wir schließen mit jedem Kunden einen Auftragsverarbeitungsvertrag (AVV) und verwenden keine Tracking-Cookies.",
        },
        {
          q: "Funktioniert das auch für Teilzeitkräfte und neue Mitarbeitende?",
          a: "Ja. Leg die Arbeitstage einer Person fest, dann zählen Urlaubstage nur an diesen Tagen. Im Eintrittsjahr gibt es 1/12 des Jahresurlaubs pro vollem Monat.",
        },
        {
          q: "Werden unterschiedliche Bundesländer berücksichtigt?",
          a: "Ja. Importiere die deutschen Feiertage, wähle das Bundesland des Teams, und wer woanders arbeitet, wählt einfach sein eigenes Bundesland.",
        },
        {
          q: "Können wir den Urlaubsanspruch später ändern?",
          a: "Ja. Admins können den Jahresurlaub jederzeit ändern, für eine Person oder für alle auf einmal.",
        },
        {
          q: "Brauchen die Leute ein Passwort?",
          a: "Nein. Sie geben ihre E-Mail-Adresse ein und klicken auf den Link, den wir ihnen schicken.",
        },
      ],
    },
    cta: {
      title: "Plant die nächste Urlaubssaison gemeinsam",
      body: "Workspace anlegen, Team einladen und noch heute die ersten freien Tage eintragen.",
      button: "Jetzt starten",
    },
  },
});
