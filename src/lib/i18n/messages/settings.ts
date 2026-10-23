import { defineMessages } from "../define";

export const settings = defineMessages({
  en: {
    title: "Settings",
    eyebrow: "Workspace administration",
    subtitle: "Workspace defaults and booking rules, grouped so nothing gets missed.",
    saveChanges: "Save changes",
    saveNote: "Changes take effect when saved.",
    notice: {
      title: "Workspace settings",
      body: (name: string) =>
        `These settings apply to ${name}. Individual member details stay in Members unless you explicitly apply a new allowance to current members.`,
    },
    cards: {
      workspace: "Workspace & notifications",
      allowance: "Allowance & carryover",
      rules: "Booking rules & coverage",
      integrations: "Integrations",
    },
    integrationsBody: "Send team updates to Microsoft Teams or Slack. You can use one or both.",
    on: "On",
    off: "Off",
    approvalsWarn: {
      title: "Before turning approval off",
      body: "Turning this off approves all pending requests. Review the queue before saving this change.",
    },
    individual: {
      title: "Individual allowances",
      body: "Set exceptions in Members, without changing workspace defaults.",
    },
    workspaceName: "Workspace name",
    timezone: "Timezone",
    timezoneHint: 'Decides what "today" is on the calendar.',
    language: "Language for Teams, Slack and emails",
    languageHint: "Used for Teams and Slack posts, the daily who's out post, and emails to people who haven't picked a language.",
    defaultAllowance: "Default yearly allowance for new members",
    defaultAllowanceHint: "Leave empty to not track allowances by default. You can override it per member.",
    applyToAll: "Also set it for everyone already in the workspace, you included",
    carryOver: "Carry over unused days (max)",
    carryOverPlaceholder: "none",
    carryOverHint:
      "Unused vacation days, up to this many, are added to the next year. Moving over from Excel? Enter each person's days left from last year under Members, or as a “Left over” column in the import.",
    expiry: {
      legend: "Carried-over days must be taken by",
      day: "Day",
      month: "Month",
      never: "Never expire",
      hint: "Carried-over days are used first. Whatever is left of them after this day is lost, e.g. 31 March as is common in Germany.",
    },
    minPeople: "Minimum people in",
    minPeoplePlaceholder: "off",
    minPeopleHint: "Warns when a booking would leave fewer people working on a day. It warns, it doesn't block.",
    features: "Features",
    approvals: "Require approval",
    approvalsHint: "Bookings by members wait for an admin or approver to approve them. Turning this off approves everything pending.",
    assistantAccess: "AI assistants",
    assistantAccessHint:
      "People can connect Claude, Copilot or another AI assistant with a personal token, to see who is away and book or cancel their own time off. Turning this off stops every token at once.",
    reminderDays: "Remind approvers after",
    reminderHint: "Once per request, to the admins and approvers who aren't away; the person hears that it's still waiting. Empty: no reminders.",
    autoApproveDays: "Approve automatically after",
    autoApproveHint: "If nobody answers in time, the request is approved and the activity log says so. Useful with only one admin. Empty: never (recommended).",
    daysUnit: "days",
    halfDays: "Allow half days",
    halfDaysHint: "Members can book mornings or afternoons.",
    weekends: "Count weekends as days off",
    weekendsHint: "Turn on if your team works weekends. Applies to new and changed bookings.",
    chatUpsell: "Teams and Slack posts are part of the Team and Business plans.",
    seePlans: "See plans →",
    teamsUrl: "Microsoft Teams webhook URL",
    teamsHint:
      "Posts to a Teams channel when someone books, requests or gets time off approved. In Teams, open the channel's ⋯ menu → Workflows → \"Post to a channel when a webhook request is received\", finish the setup, and paste the URL it gives you. On weekdays it also posts who's out, at 06:00 UTC.",
    slackUrl: "Slack webhook URL",
    slackHint:
      "The same posts in a Slack channel. In Slack, create an app at api.slack.com/apps, turn on Incoming Webhooks, add one for the channel, and paste its URL here. You can use Teams, Slack or both.",
    save: "Save settings",
    chatCheckHeading: "Chat connection",
    chatCheckBody: "Posts go out when people book and every weekday morning. Send a test to see that they arrive.",
    chatOk: (channel: string) => `${channel}: no problems with the last post.`,
    chatFailed: (channel: string, when: string) => `${channel}: the last post, on ${when}, didn't arrive.`,
    chatFix: (channel: string, error: string) =>
      error === "404" || error === "410"
        ? `The webhook no longer exists, usually because the ${channel} workflow or app was deleted. Set it up again and paste the new URL above.`
        : error === "401" || error === "403"
          ? `${channel} refused the post. Check that the workflow or app is still allowed to post in that channel, or set it up again.`
          : error === "429"
            ? `${channel} asked us to slow down. Nothing to do; the next posts should arrive.`
            : error === "network"
              ? `${channel} didn't answer in time. Usually temporary; send a test to check.`
              : `${channel} answered with error ${error}. Send a test; if it fails again, set the webhook up again.`,
    sendTest: (channel: string) => `Send test to ${channel}`,
    testText: (workspace: string) => `Test from Urlaubflow: time-off posts for ${workspace} will appear in this channel.`,
    testSent: (channel: string) => `Test sent. Check the ${channel} channel.`,
    testFailed: (channel: string) => `The test didn't reach ${channel}.`,
    supportHeading: "Support access",
    supportBody:
      "If you need help, you can let our support team look at your workspace's members, plan and settings (not at anyone's time off) for 24 hours. Every look shows up on your Activity page. It switches off by itself.",
    supportOn: (until: string) => `Support access is on until ${until}.`,
    supportGrant: "Allow support access for 24 hours",
    supportRevoke: "Turn off now",
    supportGranted: "Support access is on for 24 hours.",
    supportRevoked: "Support access is off.",
    deleteHeading: "Delete workspace",
    deleteBody: (name: string) =>
      `Deletes ${name} with all its members' bookings, allowances and holidays, for everyone. A paid plan is not renewed, so nothing more is charged. You can restore the workspace from your workspace list for 30 days, with its plan if the paid period hasn't ended; after that it is gone for good. To hand the workspace over instead, make someone else an admin in Members.`,
    typeToConfirm: (name: string) => `Type ${name} to confirm`,
    deleteButton: "Delete workspace",
    errors: {
      expiryDay: "That expiry day doesn't exist in that month.",
      nameLength: "Name must be at least 2 characters",
      nameLink: "The name can't contain a link or an email address",
      timezone: "Unknown timezone",
      language: "Pick a language from the list",
      defaultAllowance: "Default allowance must be 0–365 days",
      carryOver: "Carry-over must be 0–365 days",
      minPeople: "Minimum people must be a whole number",
      days: "Use a whole number of days from 1 to 60, or leave it empty.",
      teamsUrl:
        'That isn\'t a Microsoft Teams webhook URL. Copy the URL from the Teams workflow "Post to a channel when a webhook request is received".',
      slackUrl: "That isn't a Slack webhook URL. It starts with https://hooks.slack.com/services/.",
      confirmName: "Type the workspace name exactly to confirm.",
    },
    saved: "Saved.",
    allowanceApplied: (n: number) => ` Allowance set for ${n} ${n === 1 ? "person" : "people"}.`,
    pendingApproved: (n: number) => ` ${n} pending request${n === 1 ? " was" : "s were"} approved.`,
  },
  de: {
    title: "Einstellungen",
    eyebrow: "Workspace-Verwaltung",
    subtitle: "Standardwerte und Buchungsregeln des Workspace, übersichtlich gruppiert.",
    saveChanges: "Änderungen speichern",
    saveNote: "Änderungen gelten, sobald du speicherst.",
    notice: {
      title: "Workspace-Einstellungen",
      body: (name: string) =>
        `Diese Einstellungen gelten für ${name}. Angaben zu einzelnen Mitgliedern bleiben unter Mitglieder, außer du wendest ausdrücklich ein neues Kontingent auf aktuelle Mitglieder an.`,
    },
    cards: {
      workspace: "Workspace & Benachrichtigungen",
      allowance: "Kontingent & Übertrag",
      rules: "Buchungsregeln & Besetzung",
      integrations: "Integrationen",
    },
    integrationsBody: "Sende Team-Updates an Microsoft Teams oder Slack. Du kannst eines oder beide nutzen.",
    on: "An",
    off: "Aus",
    approvalsWarn: {
      title: "Bevor du die Freigabe ausschaltest",
      body: "Wenn du das ausschaltest, werden alle offenen Anträge genehmigt. Prüfe die Warteschlange, bevor du speicherst.",
    },
    individual: {
      title: "Individuelle Kontingente",
      body: "Lege Ausnahmen unter Mitglieder fest, ohne die Standardwerte des Workspace zu ändern.",
    },
    workspaceName: "Name des Workspace",
    timezone: "Zeitzone",
    timezoneHint: "Legt fest, was im Kalender „heute“ ist.",
    language: "Sprache für Teams, Slack und E-Mails",
    languageHint:
      "Gilt für Posts in Teams und Slack, die tägliche Übersicht, wer fehlt, und E-Mails an Leute, die keine Sprache gewählt haben.",
    defaultAllowance: "Standard-Jahresurlaub für neue Mitglieder",
    defaultAllowanceHint: "Leer lassen, um standardmäßig keinen Urlaubsanspruch zu erfassen. Du kannst ihn pro Mitglied anpassen.",
    applyToAll: "Auch für alle setzen, die schon im Workspace sind, dich eingeschlossen",
    carryOver: "Übertrag ungenutzter Tage (max.)",
    carryOverPlaceholder: "keiner",
    carryOverHint:
      "Ungenutzte Urlaubstage werden bis zu dieser Anzahl ins nächste Jahr übertragen. Du kommst von Excel? Trag den Resturlaub pro Person unter Mitglieder ein, oder als Spalte „Resturlaub“ im Import.",
    expiry: {
      legend: "Übertragene Tage müssen genommen werden bis",
      day: "Tag",
      month: "Monat",
      never: "Verfallen nie",
      hint: "Übertragene Tage werden zuerst verbraucht. Was nach diesem Tag davon übrig ist, verfällt, z. B. am 31. März, wie in Deutschland üblich.",
    },
    minPeople: "Mindestbesetzung",
    minPeoplePlaceholder: "aus",
    minPeopleHint: "Warnt, wenn an einem Tag durch eine Buchung weniger Leute arbeiten würden. Es wird nur gewarnt, nicht blockiert.",
    features: "Funktionen",
    approvals: "Freigabe erforderlich",
    approvalsHint: "Buchungen von Mitgliedern warten, bis ein Admin oder eine Genehmiger:in sie genehmigt. Wenn du das ausschaltest, wird alles Offene genehmigt.",
    assistantAccess: "KI-Assistenten",
    assistantAccessHint:
      "Alle können Claude, Copilot oder einen anderen KI-Assistenten mit einem persönlichen Token verbinden, um zu sehen, wer weg ist, und eigene Abwesenheiten zu buchen oder zu stornieren. Ausschalten stoppt sofort alle Tokens.",
    reminderDays: "Erinnern nach",
    reminderHint: "Einmal pro Antrag, an die Admins und Genehmiger:innen, die nicht abwesend sind; die Person erfährt, dass der Antrag noch wartet. Leer: keine Erinnerungen.",
    autoApproveDays: "Automatisch genehmigen nach",
    autoApproveHint: "Antwortet niemand rechtzeitig, wird der Antrag genehmigt und im Aktivitätsprotokoll vermerkt. Praktisch, wenn es nur einen Admin gibt. Leer: nie (empfohlen).",
    daysUnit: "Tagen",
    halfDays: "Halbe Tage erlauben",
    halfDaysHint: "Mitglieder können Vormittage oder Nachmittage buchen.",
    weekends: "Wochenenden als Urlaubstage zählen",
    weekendsHint: "Schalte das ein, wenn dein Team am Wochenende arbeitet. Gilt für neue und geänderte Buchungen.",
    chatUpsell: "Posts in Teams und Slack gibt es in den Plänen Team und Business.",
    seePlans: "Pläne ansehen →",
    teamsUrl: "Webhook-URL für Microsoft Teams",
    teamsHint:
      "Postet in einen Teams-Kanal, wenn jemand Urlaub bucht, beantragt oder genehmigt bekommt. Öffne in Teams das ⋯-Menü des Kanals → Workflows → „Post to a channel when a webhook request is received“, schließ die Einrichtung ab und füge die URL ein, die du bekommst. An Werktagen postet es außerdem um 06:00 UTC, wer fehlt.",
    slackUrl: "Webhook-URL für Slack",
    slackHint:
      "Dieselben Posts in einem Slack-Kanal. Erstelle in Slack unter api.slack.com/apps eine App, schalte Incoming Webhooks ein, füge einen für den Kanal hinzu und füge die URL hier ein. Du kannst Teams, Slack oder beides nutzen.",
    save: "Einstellungen speichern",
    chatCheckHeading: "Chat-Verbindung",
    chatCheckBody: "Posts gehen raus, wenn jemand bucht, und jeden Werktagmorgen. Schick einen Test, um zu sehen, ob sie ankommen.",
    chatOk: (channel: string) => `${channel}: Der letzte Post ist angekommen.`,
    chatFailed: (channel: string, when: string) => `${channel}: Der letzte Post am ${when} ist nicht angekommen.`,
    chatFix: (channel: string, error: string) =>
      error === "404" || error === "410"
        ? `Den Webhook gibt es nicht mehr, meist weil der ${channel}-Workflow oder die App gelöscht wurde. Richte ihn neu ein und füge oben die neue URL ein.`
        : error === "401" || error === "403"
          ? `${channel} hat den Post abgelehnt. Prüf, ob der Workflow oder die App noch in den Kanal posten darf, oder richte ihn neu ein.`
          : error === "429"
            ? `${channel} hat uns gebeten, langsamer zu posten. Du musst nichts tun; die nächsten Posts sollten ankommen.`
            : error === "network"
              ? `${channel} hat nicht rechtzeitig geantwortet. Meist nur vorübergehend; schick einen Test, um es zu prüfen.`
              : `${channel} hat mit Fehler ${error} geantwortet. Schick einen Test; wenn er wieder fehlschlägt, richte den Webhook neu ein.`,
    sendTest: (channel: string) => `Test an ${channel} senden`,
    testText: (workspace: string) => `Test von Urlaubflow: Abwesenheiten von ${workspace} erscheinen in diesem Kanal.`,
    testSent: (channel: string) => `Test gesendet. Schau in den ${channel}-Kanal.`,
    testFailed: (channel: string) => `Der Test ist nicht bei ${channel} angekommen.`,
    supportHeading: "Support-Zugriff",
    supportBody:
      "Wenn du Hilfe brauchst, kannst du unserem Support 24 Stunden lang erlauben, Mitglieder, Tarif und Einstellungen deines Workspaces anzusehen (nicht den Urlaub von irgendwem). Jeder Blick erscheint in deinem Verlauf. Er schaltet sich von selbst ab.",
    supportOn: (until: string) => `Der Support-Zugriff ist an bis ${until}.`,
    supportGrant: "Support-Zugriff für 24 Stunden erlauben",
    supportRevoke: "Jetzt ausschalten",
    supportGranted: "Der Support-Zugriff ist für 24 Stunden an.",
    supportRevoked: "Der Support-Zugriff ist aus.",
    deleteHeading: "Workspace löschen",
    deleteBody: (name: string) =>
      `Löscht ${name} mit allen Buchungen, Urlaubsansprüchen und Feiertagen aller Mitglieder, für alle. Ein bezahlter Tarif verlängert sich nicht mehr, es wird also nichts mehr abgebucht. Du kannst den Workspace 30 Tage lang in deiner Workspace-Liste wiederherstellen, mit seinem Tarif, solange der bezahlte Zeitraum noch läuft; danach ist er endgültig weg. Um den Workspace stattdessen zu übergeben, mach unter Mitglieder jemand anderen zum Admin.`,
    typeToConfirm: (name: string) => `Gib zur Bestätigung ${name} ein`,
    deleteButton: "Workspace löschen",
    errors: {
      expiryDay: "Diesen Tag gibt es in dem Monat nicht.",
      nameLength: "Der Name muss mindestens 2 Zeichen lang sein",
      nameLink: "Der Name darf keinen Link und keine E-Mail-Adresse enthalten",
      timezone: "Unbekannte Zeitzone",
      language: "Wähle eine Sprache aus der Liste",
      defaultAllowance: "Der Standard-Jahresurlaub muss zwischen 0 und 365 Tagen liegen",
      carryOver: "Der Übertrag muss zwischen 0 und 365 Tagen liegen",
      minPeople: "Die Mindestbesetzung muss eine ganze Zahl sein",
      days: "Gib eine ganze Zahl von 1 bis 60 Tagen ein oder lass das Feld leer.",
      teamsUrl:
        "Das ist keine Webhook-URL von Microsoft Teams. Kopiere die URL aus dem Teams-Workflow „Post to a channel when a webhook request is received“.",
      slackUrl: "Das ist keine Webhook-URL von Slack. Sie beginnt mit https://hooks.slack.com/services/.",
      confirmName: "Gib zur Bestätigung den Namen des Workspace genau ein.",
    },
    saved: "Gespeichert.",
    allowanceApplied: (n: number) => ` Urlaubsanspruch für ${n} ${n === 1 ? "Person" : "Personen"} gesetzt.`,
    pendingApproved: (n: number) => ` ${n} ${n === 1 ? "offene Anfrage wurde" : "offene Anfragen wurden"} genehmigt.`,
  },
});
