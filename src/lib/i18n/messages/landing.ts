import { defineMessages } from "../define";

/** The public product page at /. */
export const landing = defineMessages({
  en: {
    hero: {
      eyebrow: "Vacation planning for teams in Germany and Europe",
      title: "Everyone's time off in one place. Without Excel, without WhatsApp.",
      body: "Your team books vacation in a few taps, you approve it with one click, and the calendar warns you before too many people are out. Made for practices, care services, Kitas, trades businesses and offices.",
      cta: (days: number) => `Try it free for ${days} days`,
      pricing: "See prices",
      ticks: ["No credit card", "Ready in 5 minutes", "German and English"],
      invite: "Got an invite? Sign in with the email it was sent to.",
      toastApproved: "Approved: Anna, 5 days",
      toastLeft: "15 days left in 2027",
      toastWarning: "Only 2 people in on Friday",
    },
    trust: {
      label: "Why teams trust us",
      items: [
        { icon: "🇪🇺", text: "Data stored in Frankfurt, EU" },
        { icon: "📄", text: "Data processing agreement (DPA) included" },
        { icon: "🗓️", text: "Holidays for all 16 German states" },
        { icon: "🍪", text: "No tracking cookies" },
        { icon: "🔑", text: "No passwords, sign-in by email link" },
      ],
    },
    audiences: {
      title: "Made for teams that can't all be off at once",
      subtitle: "Most vacation tools are built for software companies. This one is built for teams where someone has to be at the front desk, in the treatment room or on the shift.",
      example: "Example",
      items: [
        {
          icon: "🩺",
          title: "Medical and dental practices",
          story: "A dental practice with 9 people: two dentists, five assistants, two at reception. Approvals are on, and the calendar warns before fewer than 6 people are in, so the practice never has to close at short notice in summer.",
          tags: ["Approvals", "Minimum staffing", "Half days"],
        },
        {
          icon: "🤝",
          title: "Care services and care homes",
          story: "An outpatient care service with 22 staff, many part-time and working weekends. Each person's work days are set, so a week off for someone on a 3-day contract costs exactly 3 days.",
          tags: ["Part-time work days", "Weekend shifts", "Teams or Slack"],
        },
        {
          icon: "🧸",
          title: "Kitas and daycare",
          story: "A Kita with 14 educators plans the summer early: everyone requests their weeks in January, the manager approves them in one list and sees straight away which weeks are too thin.",
          tags: ["Approvals", "Team calendar", "Carry-over deadline"],
        },
        {
          icon: "🔧",
          title: "Trades and workshops",
          story: "A carpentry business with 12 people and staff in two states. Each person gets their own region's holidays, and the boss sees on one screen who's on the building site next week.",
          tags: ["Regional holidays", "Overview", "Calendar feed"],
        },
        {
          icon: "🍽️",
          title: "Restaurants, hotels and shops",
          story: "A restaurant with 18 people keeps the high season covered: the minimum staffing warning shows up as soon as a request would leave the kitchen short.",
          tags: ["Minimum staffing", "Approvals", "Mobile"],
        },
        {
          icon: "💼",
          title: "Offices, agencies and tax firms",
          story: "A tax office with 8 people: bookings go straight in, everyone sees their days left, and Outlook shows who's away during the busy filing season.",
          tags: ["Days left", "Outlook feed", "Bridge-day tips"],
        },
      ],
    },
    compare: {
      title: "Before and after",
      beforeTitle: "Today",
      afterTitle: "With Vacation Planner",
      before: [
        "Requests by WhatsApp, on paper or shouted across the room",
        "An Excel sheet only one person really understands",
        "Days left worked out by hand at the end of the year",
        "Finding out on Monday that three people are off",
        "Holidays of different states mixed up",
      ],
      after: [
        "Everyone books from their phone in a few taps",
        "One calendar that the whole team sees",
        "Days left, carry-over and half days counted automatically",
        "A warning before too many people are out",
        "The right public holidays for every person",
      ],
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
      subtitle: "No HR suite, no training, no IT department needed. Just the parts people actually use.",
      items: [
        {
          icon: "📊",
          title: "Days left, always visible",
          body: "Set a yearly allowance per person. Everyone sees what they've taken, what's pending and what's left, with unused days carried over up to your cap.",
        },
        {
          icon: "🌗",
          title: "Half days",
          body: "Book a morning or an afternoon. Half days count as half, in the allowance and on the calendar.",
        },
        {
          icon: "🗺️",
          title: "Public holidays by region",
          body: "Import holidays for your country, then let each person pick where they work. Berlin and Bielefeld get their own days off, automatically.",
        },
        {
          icon: "✅",
          title: "Approvals when you want them",
          body: "Turn on approvals per workspace and admins approve or decline with a note. Leave it off and bookings go straight in.",
        },
        {
          icon: "📅",
          title: "One calendar for the team",
          body: "See the whole month at a glance and get a warning before too many people are out on the same day.",
        },
        {
          icon: "💬",
          title: "Microsoft Teams and Slack updates",
          body: "Bookings and approvals post to your Teams or Slack channel, and every weekday morning it says who's out.",
        },
        {
          icon: "📲",
          title: "In your own calendar",
          body: "A private calendar feed puts your team's time off into Outlook, Google Calendar or Apple Calendar.",
        },
        {
          icon: "✨",
          title: "Long-weekend tips",
          body: "It spots bridge days next to public holidays, so one booked day can turn into four days off.",
        },
        {
          icon: "🔒",
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
      title: "One flat price for the whole team",
      subtitle: (trialDays: number) =>
        `Not per person, so adding a new colleague costs nothing extra. Every new workspace gets ${trialDays} days with everything, no card needed.`,
      perMonth: " / month",
      upTo: (people: number) => `Up to ${people} people`,
      orYearly: (price: string) => `or ${price} a year, two months free`,
      perPerson: (price: string) => `That's ${price} per person at full team size`,
      popular: "Most popular",
      start: "Start free trial",
      startFree: "Start for free",
      features: {
        FREE: ["Team calendar and days left", "Half days and public holidays", "Approvals and staffing warning", "Calendar feed for Outlook and Google"],
        TEAM: ["Everything in Free", "Microsoft Teams and Slack posts", "Morning summary of who's out", "Email support"],
        BUSINESS: ["Everything in Team", "For larger practices and companies", "Several locations and states", "Priority support"],
      },
      footnote: (people: number) =>
        `Prices plus VAT. Pay monthly or yearly by card or SEPA direct debit, cancel any time. More than ${people} people? Get in touch for an offer.`,
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
        {
          q: "Our staff work shifts and weekends. Does that work?",
          a: "Yes. Set the days each person works, including Saturdays and Sundays, and time off only counts on those days.",
        },
        {
          q: "Do we need an IT department to set it up?",
          a: "No. It runs in the browser on any phone or computer. Create a workspace, paste your team's emails, done.",
        },
        {
          q: "What happens after the trial?",
          a: "You pick a plan, or the workspace continues on Free for up to 5 people. Nothing is deleted and you can cancel a paid plan any time.",
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
      eyebrow: "Urlaubsplanung für Teams in Deutschland und Europa",
      title: "Alle Abwesenheiten an einem Ort. Ohne Excel, ohne WhatsApp.",
      body: "Dein Team trägt Urlaub in wenigen Klicks ein, du gibst ihn mit einem Klick frei, und der Kalender warnt, bevor zu viele fehlen. Gemacht für Praxen, Pflegedienste, Kitas, Handwerksbetriebe und Büros.",
      cta: (days: number) => `${days} Tage kostenlos testen`,
      pricing: "Preise ansehen",
      ticks: ["Ohne Kreditkarte", "In 5 Minuten startklar", "Deutsch und Englisch"],
      invite: "Du wurdest eingeladen? Melde dich mit der E-Mail-Adresse an, an die die Einladung ging.",
      toastApproved: "Freigegeben: Anna, 5 Tage",
      toastLeft: "Noch 15 Tage für 2027",
      toastWarning: "Freitag nur 2 Leute da",
    },
    trust: {
      label: "Warum Teams uns vertrauen",
      items: [
        { icon: "🇪🇺", text: "Daten in Frankfurt, EU" },
        { icon: "📄", text: "Auftragsverarbeitungsvertrag (AVV) inklusive" },
        { icon: "🗓️", text: "Feiertage aller 16 Bundesländer" },
        { icon: "🍪", text: "Keine Tracking-Cookies" },
        { icon: "🔑", text: "Ohne Passwörter, Anmeldung per E-Mail-Link" },
      ],
    },
    audiences: {
      title: "Für Teams, die nicht alle gleichzeitig fehlen können",
      subtitle: "Die meisten Urlaubstools sind für Softwarefirmen gebaut. Dieses ist für Teams, in denen jemand am Empfang, im Behandlungsraum oder in der Schicht stehen muss.",
      example: "Beispiel",
      items: [
        {
          icon: "🩺",
          title: "Arzt- und Zahnarztpraxen",
          story: "Eine Zahnarztpraxis mit 9 Leuten: zwei Zahnärztinnen, fünf ZFA, zwei am Empfang. Freigaben sind an, und der Kalender warnt, bevor weniger als 6 Leute da sind. So muss die Praxis im Sommer nie kurzfristig schließen.",
          tags: ["Freigaben", "Mindestbesetzung", "Halbe Tage"],
        },
        {
          icon: "🤝",
          title: "Pflegedienste und Pflegeheime",
          story: "Ein ambulanter Pflegedienst mit 22 Mitarbeitenden, viele in Teilzeit und am Wochenende im Dienst. Für jede Person sind die Arbeitstage hinterlegt, also kostet eine freie Woche bei einer 3-Tage-Stelle genau 3 Urlaubstage.",
          tags: ["Teilzeit-Arbeitstage", "Wochenenddienste", "Teams oder Slack"],
        },
        {
          icon: "🧸",
          title: "Kitas und Kindertagespflege",
          story: "Eine Kita mit 14 Fachkräften plant den Sommer früh: Alle beantragen ihre Wochen im Januar, die Leitung gibt sie in einer Liste frei und sieht sofort, welche Wochen zu dünn besetzt sind.",
          tags: ["Freigaben", "Teamkalender", "Verfall des Resturlaubs"],
        },
        {
          icon: "🔧",
          title: "Handwerk und Werkstätten",
          story: "Eine Tischlerei mit 12 Leuten und Mitarbeitenden in zwei Bundesländern. Jede Person bekommt die Feiertage ihrer Region, und der Chef sieht auf einen Blick, wer nächste Woche auf der Baustelle ist.",
          tags: ["Regionale Feiertage", "Übersicht", "Kalender-Feed"],
        },
        {
          icon: "🍽️",
          title: "Gastronomie, Hotels und Läden",
          story: "Ein Restaurant mit 18 Leuten hält die Hochsaison besetzt: Die Warnung zur Mindestbesetzung erscheint, sobald ein Antrag die Küche zu knapp machen würde.",
          tags: ["Mindestbesetzung", "Freigaben", "Mobil"],
        },
        {
          icon: "💼",
          title: "Büros, Agenturen und Kanzleien",
          story: "Eine Steuerkanzlei mit 8 Leuten: Buchungen sind sofort eingetragen, alle sehen ihren Resturlaub, und Outlook zeigt, wer in der Abgabezeit fehlt.",
          tags: ["Resturlaub", "Outlook-Feed", "Brückentag-Tipps"],
        },
      ],
    },
    compare: {
      title: "Vorher und nachher",
      beforeTitle: "Heute",
      afterTitle: "Mit Vacation Planner",
      before: [
        "Anträge per WhatsApp, auf Zetteln oder zwischen Tür und Angel",
        "Eine Excel-Tabelle, die nur eine Person wirklich versteht",
        "Resturlaub am Jahresende von Hand nachgerechnet",
        "Am Montag merken, dass drei Leute gleichzeitig fehlen",
        "Feiertage verschiedener Bundesländer durcheinander",
      ],
      after: [
        "Alle tragen ihren Urlaub in wenigen Klicks am Handy ein",
        "Ein Kalender, den das ganze Team sieht",
        "Resturlaub, Übertrag und halbe Tage automatisch gezählt",
        "Eine Warnung, bevor zu viele fehlen",
        "Die richtigen Feiertage für jede Person",
      ],
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
      subtitle: "Keine HR-Suite, keine Schulung, keine IT-Abteilung nötig. Nur das, was im Alltag wirklich gebraucht wird.",
      items: [
        {
          icon: "📊",
          title: "Resturlaub immer im Blick",
          body: "Leg pro Person einen Jahresurlaub fest. Alle sehen, was sie genommen haben, was noch offen ist und was übrig bleibt. Nicht genommene Tage werden bis zu deiner Obergrenze übertragen.",
        },
        {
          icon: "🌗",
          title: "Halbe Tage",
          body: "Nur den Vormittag oder Nachmittag frei? Halbe Tage zählen als halbe Tage, im Urlaubskonto und im Kalender.",
        },
        {
          icon: "🗺️",
          title: "Feiertage nach Region",
          body: "Importiere die Feiertage deines Landes, und jede Person wählt, wo sie arbeitet. Berlin und Bielefeld bekommen automatisch ihre eigenen freien Tage.",
        },
        {
          icon: "✅",
          title: "Freigaben, wenn du sie willst",
          body: "Schalte Freigaben pro Workspace ein, und Admins genehmigen oder lehnen mit einer Notiz ab. Ohne Freigabe sind Buchungen sofort eingetragen.",
        },
        {
          icon: "📅",
          title: "Ein Kalender fürs ganze Team",
          body: "Sieh den ganzen Monat auf einen Blick und bekomm eine Warnung, bevor zu viele Leute am selben Tag fehlen.",
        },
        {
          icon: "💬",
          title: "Nachrichten in Microsoft Teams und Slack",
          body: "Buchungen und Freigaben landen in deinem Teams- oder Slack-Kanal, und jeden Werktag morgens steht dort, wer fehlt.",
        },
        {
          icon: "📲",
          title: "In deinem eigenen Kalender",
          body: "Ein privater Kalender-Feed bringt die Abwesenheiten deines Teams in Outlook, Google Kalender oder Apple Kalender.",
        },
        {
          icon: "✨",
          title: "Tipps für lange Wochenenden",
          body: "Erkennt Brückentage neben Feiertagen, sodass aus einem Urlaubstag vier freie Tage werden können.",
        },
        {
          icon: "🔒",
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
      title: "Ein fester Preis fürs ganze Team",
      subtitle: (trialDays: number) =>
        `Nicht pro Person, eine neue Kollegin kostet also nichts extra. Jeder neue Workspace kann ${trialDays} Tage lang alles nutzen, ohne Kreditkarte.`,
      perMonth: " / Monat",
      upTo: (people: number) => `Bis zu ${people} Personen`,
      orYearly: (price: string) => `oder ${price} im Jahr, zwei Monate geschenkt`,
      perPerson: (price: string) => `Das sind ${price} pro Person bei voller Teamgröße`,
      popular: "Am beliebtesten",
      start: "Kostenlos testen",
      startFree: "Kostenlos starten",
      features: {
        FREE: ["Teamkalender und Resturlaub", "Halbe Tage und Feiertage", "Freigaben und Besetzungswarnung", "Kalender-Feed für Outlook und Google"],
        TEAM: ["Alles aus Free", "Nachrichten in Microsoft Teams und Slack", "Morgens eine Übersicht, wer fehlt", "Support per E-Mail"],
        BUSINESS: ["Alles aus Team", "Für größere Praxen und Betriebe", "Mehrere Standorte und Bundesländer", "Bevorzugter Support"],
      },
      footnote: (people: number) =>
        `Preise zzgl. MwSt. Monatlich oder jährlich per Karte oder SEPA-Lastschrift, jederzeit kündbar. Mehr als ${people} Personen? Sprich uns an, wir machen dir ein Angebot.`,
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
        {
          q: "Unsere Leute arbeiten im Schichtdienst und am Wochenende. Geht das?",
          a: "Ja. Leg für jede Person ihre Arbeitstage fest, auch Samstag und Sonntag, dann zählt Urlaub nur an diesen Tagen.",
        },
        {
          q: "Brauchen wir eine IT-Abteilung für die Einrichtung?",
          a: "Nein. Es läuft im Browser auf jedem Handy und Computer. Workspace anlegen, E-Mail-Adressen des Teams einfügen, fertig.",
        },
        {
          q: "Was passiert nach dem Test?",
          a: "Du wählst einen Tarif, oder der Workspace läuft mit Free für bis zu 5 Personen weiter. Nichts wird gelöscht, und einen bezahlten Tarif kannst du jederzeit kündigen.",
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
