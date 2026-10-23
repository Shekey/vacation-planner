import { defineMessages } from "../define";

/** Bringing people in from Microsoft 365 (#57): the import panel and the nightly email to admins. */
export const directory = defineMessages({
  en: {
    heading: "Straight from Microsoft 365",
    intro:
      "Connect once and pick who belongs in the team: everyone, or one group such as “Sales Berlin”. Urlaubflow only reads names and email addresses, never writes to Microsoft 365, and never adds or removes anyone without you.",
    connect: "Connect Microsoft 365",
    connectHint:
      "A Microsoft 365 administrator (Global or Privileged Role Administrator) has to approve read-only access to your user list once. If that isn't you, ask them to sign in here as an admin of this workspace.",
    connectedAt: (date: string) => `Connected on ${date}.`,
    who: "Who belongs in this workspace",
    everyone: "Everyone in Microsoft 365",
    loadGroups: "Pick a group instead",
    loadingGroups: "Loading groups…",
    load: "Load people",
    loading: "Loading…",
    loaded: (n: number) => `${n} ${n === 1 ? "person" : "people"} loaded. Check them below, then add them.`,
    leaversHeading: "No longer in Microsoft 365",
    leaversHint: "These people are in the workspace, but not in the directory (or their account is turned off). Remove them under Members if they've left.",
    toMembers: "Go to Members",
    nightly: "Each night Urlaubflow checks for new people and leavers and emails the admins once when something changes.",
    disconnect: "Disconnect",
    disconnectConfirm: "Disconnect Microsoft 365? Nobody is removed. To take the access back completely, also remove Urlaubflow under Enterprise applications in Microsoft Entra.",
    disconnected: "Microsoft 365 is disconnected.",
    unavailable: "Connecting Microsoft 365 isn't set up on this server yet. Use the export from the Microsoft 365 admin center instead.",
    errors: {
      notConnected: "Microsoft 365 isn't connected yet.",
      consentMissing: "Microsoft 365 no longer allows access. Connect it again, and have an administrator approve it.",
      tooMany: "That's more than 1,000 people. Pick a group with the people of this workspace.",
      failed: "Microsoft 365 didn't answer. Try again in a moment.",
      declined: "The access wasn't approved, so nothing was connected.",
      notMember: "Your email address isn't an active account in that Microsoft 365 organisation, so it wasn't connected. Sign in to Urlaubflow with your work address and try again.",
      expired: "That took too long. Start connecting again.",
      group: "Pick one of the groups.",
    },
    email: {
      subject: (workspace: string) => `Changes in Microsoft 365 for ${workspace}`,
      text: (o: { workspace: string; joiners: string[]; leavers: string[]; importUrl: string; membersUrl: string }) =>
        [
          `Microsoft 365 has changed since the people in ${o.workspace} were last brought in.`,
          o.joiners.length ? `New in Microsoft 365, not yet in Urlaubflow:\n${o.joiners.map((p) => `- ${p}`).join("\n")}\nAdd them: ${o.importUrl}` : "",
          o.leavers.length
            ? `In Urlaubflow, but no longer in Microsoft 365:\n${o.leavers.map((p) => `- ${p}`).join("\n")}\nIf they've left, remove them: ${o.membersUrl}`
            : "",
          "Nothing was changed for you. You get this email once per change.",
        ]
          .filter(Boolean)
          .join("\n\n"),
    },
  },
  de: {
    heading: "Direkt aus Microsoft 365",
    intro:
      "Einmal verbinden und auswählen, wer zum Team gehört: alle oder eine Gruppe wie „Vertrieb Berlin“. Urlaubflow liest nur Namen und E-Mail-Adressen, schreibt nie in Microsoft 365 und fügt niemanden ohne dich hinzu oder entfernt jemanden.",
    connect: "Microsoft 365 verbinden",
    connectHint:
      "Eine Microsoft-365-Administratorin oder ein Administrator (Globaler Administrator oder Administrator für privilegierte Rollen) muss den Lesezugriff auf eure Benutzerliste einmal erlauben. Bist du das nicht, bitte sie oder ihn, sich hier als Admin dieses Workspaces anzumelden.",
    connectedAt: (date: string) => `Verbunden am ${date}.`,
    who: "Wer gehört in diesen Workspace",
    everyone: "Alle in Microsoft 365",
    loadGroups: "Stattdessen eine Gruppe wählen",
    loadingGroups: "Gruppen werden geladen…",
    load: "Personen laden",
    loading: "Wird geladen…",
    loaded: (n: number) => `${n} ${n === 1 ? "Person" : "Personen"} geladen. Prüf sie unten und füg sie dann hinzu.`,
    leaversHeading: "Nicht mehr in Microsoft 365",
    leaversHint:
      "Diese Personen sind im Workspace, aber nicht im Verzeichnis (oder ihr Konto ist deaktiviert). Entferne sie unter Mitglieder, wenn sie gegangen sind.",
    toMembers: "Zu den Mitgliedern",
    nightly: "Jede Nacht prüft Urlaubflow, ob jemand neu ist oder gegangen ist, und schreibt den Admins einmal, wenn sich etwas ändert.",
    disconnect: "Trennen",
    disconnectConfirm:
      "Microsoft 365 trennen? Niemand wird entfernt. Um den Zugriff ganz zurückzunehmen, entferne Urlaubflow außerdem unter Unternehmensanwendungen in Microsoft Entra.",
    disconnected: "Microsoft 365 ist getrennt.",
    unavailable: "Die Verbindung zu Microsoft 365 ist auf diesem Server noch nicht eingerichtet. Nimm stattdessen den Export aus dem Microsoft 365 Admin Center.",
    errors: {
      notConnected: "Microsoft 365 ist noch nicht verbunden.",
      consentMissing: "Microsoft 365 erlaubt den Zugriff nicht mehr. Verbinde es erneut und lass es von einem Admin erlauben.",
      tooMany: "Das sind mehr als 1.000 Personen. Wähl eine Gruppe mit den Personen dieses Workspaces.",
      failed: "Microsoft 365 hat nicht geantwortet. Versuch es gleich noch einmal.",
      declined: "Der Zugriff wurde nicht erlaubt, deshalb ist nichts verbunden.",
      notMember:
        "Deine E-Mail-Adresse ist kein aktives Konto in dieser Microsoft-365-Organisation, deshalb wurde nichts verbunden. Melde dich mit deiner Firmenadresse bei Urlaubflow an und versuch es erneut.",
      expired: "Das hat zu lange gedauert. Starte das Verbinden noch einmal.",
      group: "Wähl eine der Gruppen.",
    },
    email: {
      subject: (workspace: string) => `Änderungen in Microsoft 365 für ${workspace}`,
      text: (o: { workspace: string; joiners: string[]; leavers: string[]; importUrl: string; membersUrl: string }) =>
        [
          `In Microsoft 365 hat sich etwas geändert, seit die Personen von ${o.workspace} zuletzt übernommen wurden.`,
          o.joiners.length ? `Neu in Microsoft 365, noch nicht in Urlaubflow:\n${o.joiners.map((p) => `- ${p}`).join("\n")}\nHinzufügen: ${o.importUrl}` : "",
          o.leavers.length
            ? `In Urlaubflow, aber nicht mehr in Microsoft 365:\n${o.leavers.map((p) => `- ${p}`).join("\n")}\nWenn sie gegangen sind, entferne sie: ${o.membersUrl}`
            : "",
          "Es wurde nichts für dich geändert. Diese E-Mail kommt einmal je Änderung.",
        ]
          .filter(Boolean)
          .join("\n\n"),
    },
  },
});
