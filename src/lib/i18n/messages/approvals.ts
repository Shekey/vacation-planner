import { defineMessages } from "../define";

/** Admins approve or decline pending requests. */
export const approvals = defineMessages({
  en: {
    title: "Approvals",
    turnedOff: "Approvals are turned off for this workspace. Bookings are confirmed right away.",
    heading: "Waiting for approval",
    empty: "You're all caught up. Nothing is waiting for you.",
    daysLeft: (left: string, total: string, year: number) => `${left} of ${total} days left in ${year} incl. this`,
    understaffed: (present: number, total: number, days: string, more: number, min: number | null) =>
      `Approving leaves only ${present} of ${total} in on ${days}${more > 0 ? ` and ${more} more day${more === 1 ? "" : "s"}` : ""} (minimum ${min}).`,
    alsoOff: (names: string) => `Also off then: ${names}`,
    note: "Note in the email to them (optional, not saved)",
    approve: "Approve",
    decline: "Decline",
  },
  de: {
    title: "Freigaben",
    turnedOff: "Freigaben sind in diesem Workspace ausgeschaltet. Buchungen gelten sofort.",
    heading: "Wartet auf Freigabe",
    empty: "Alles erledigt. Gerade wartet nichts auf dich.",
    daysLeft: (left: string, total: string, year: number) => `${left} von ${total} Tagen für ${year} übrig, inkl. dieser Anfrage`,
    understaffed: (present: number, total: number, days: string, more: number, min: number | null) =>
      `Wenn du genehmigst, sind am ${days}${
        more > 0 ? ` und an ${more === 1 ? "einem weiteren Tag" : `${more} weiteren Tagen`}` : ""
      } nur ${present} von ${total} da (Minimum ${min}).`,
    alsoOff: (names: string) => `In der Zeit auch abwesend: ${names}`,
    note: "Notiz für die E-Mail an die Person (optional, wird nicht gespeichert)",
    approve: "Genehmigen",
    decline: "Ablehnen",
  },
});
