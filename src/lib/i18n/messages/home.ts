import { defineMessages } from "../define";

export const home = defineMessages({
  en: {
    heading: "Your workspaces",
    newWorkspace: "New workspace",
    welcome: "Welcome! Let's get your team started.",
    startTitle: "Running a team?",
    startBody: (days: number) =>
      `Create a workspace for your team. It takes about three minutes and the first ${days} days include everything.`,
    startButton: "Set up my team",
    invitedTitle: "Waiting for an invite?",
    invitedBody: (email: string) =>
      `Ask your admin to invite ${email}. The invitation email has a button that brings you straight into your team.`,
  },
  de: {
    heading: "Deine Workspaces",
    newWorkspace: "Neuer Workspace",
    welcome: "Willkommen! Lass uns dein Team starten.",
    startTitle: "Du leitest ein Team?",
    startBody: (days: number) =>
      `Leg einen Workspace für dein Team an. Das dauert etwa drei Minuten, und die ersten ${days} Tage ist alles inklusive.`,
    startButton: "Mein Team einrichten",
    invitedTitle: "Du wartest auf eine Einladung?",
    invitedBody: (email: string) =>
      `Bitte deinen Admin, ${email} einzuladen. In der Einladungs-E-Mail bringt dich ein Button direkt in dein Team.`,
  },
});
