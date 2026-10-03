import { defineMessages } from "../define";

export const newWorkspace = defineMessages({
  en: {
    heading: "New workspace",
    intro: "You'll be the admin. Others join only by invitation.",
    name: "Name",
    namePlaceholder: "Acme Engineering",
    timezone: "Timezone",
    creating: "Creating…",
    create: "Create workspace",
    errors: {
      nameLength: "Name must be at least 2 characters",
      timezone: "Unknown timezone",
    },
  },
  de: {
    heading: "Neuer Workspace",
    intro: "Du wirst Admin. Andere kommen nur per Einladung dazu.",
    name: "Name",
    namePlaceholder: "Acme Entwicklung",
    timezone: "Zeitzone",
    creating: "Wird erstellt…",
    create: "Workspace erstellen",
    errors: {
      nameLength: "Der Name muss mindestens 2 Zeichen lang sein",
      timezone: "Unbekannte Zeitzone",
    },
  },
});
