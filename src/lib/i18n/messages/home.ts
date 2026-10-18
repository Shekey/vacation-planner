import { defineMessages } from "../define";

export const home = defineMessages({
  en: {
    heading: "Your workspaces",
    newWorkspace: "New workspace",
    welcome: "Welcome! Let's get your team started.",
    startTitle: "Running a team?",
    startBody: (days: number) =>
      `Create a workspace for your team. It takes about three minutes and the first ${days} days include everything.`,
    startBodyBeta: "Create a workspace for your team. It takes about three minutes, and during the beta everything is free.",
    startButton: "Set up my team",
    invitedTitle: "Waiting for an invite?",
    invitedBody: (email: string) =>
      `Ask your admin to invite ${email}. The invitation email has a button that brings you straight into your team.`,
    deletedHeading: "Deleted workspaces",
    deletedBody: (days: number) => `Deleted by mistake? You can bring a workspace back for ${days} days, with everything in it. After that it is gone for good.`,
    daysLeft: (n: number) => `${n} ${n === 1 ? "day" : "days"} left`,
    restore: "Restore",
    restored: "Workspace restored. A paid plan was cancelled with it, so pick a plan again under Billing.",
    restoreFailed: "This workspace can't be restored any more.",
  },
  de: {
    heading: "Deine Workspaces",
    newWorkspace: "Neuer Workspace",
    welcome: "Willkommen! Lass uns dein Team starten.",
    startTitle: "Du leitest ein Team?",
    startBody: (days: number) =>
      `Leg einen Workspace für dein Team an. Das dauert etwa drei Minuten, und die ersten ${days} Tage ist alles inklusive.`,
    startBodyBeta: "Leg einen Workspace für dein Team an. Das dauert etwa drei Minuten, und in der Beta ist alles kostenlos.",
    startButton: "Mein Team einrichten",
    invitedTitle: "Du wartest auf eine Einladung?",
    invitedBody: (email: string) =>
      `Bitte deinen Admin, ${email} einzuladen. In der Einladungs-E-Mail bringt dich ein Button direkt in dein Team.`,
    deletedHeading: "Gelöschte Workspaces",
    deletedBody: (days: number) =>
      `Aus Versehen gelöscht? Du kannst einen Workspace ${days} Tage lang mit allem, was drin war, zurückholen. Danach ist er endgültig weg.`,
    daysLeft: (n: number) => `noch ${n} ${n === 1 ? "Tag" : "Tage"}`,
    restore: "Wiederherstellen",
    restored: "Workspace wiederhergestellt. Ein bezahlter Tarif wurde mit ihm gekündigt, wähle ihn unter Abrechnung neu.",
    restoreFailed: "Dieser Workspace lässt sich nicht mehr wiederherstellen.",
  },
});
