/**
 * Starting points for a new workspace, picked by the kind of team. They only fill in defaults
 * (approvals, yearly allowance); admins can change everything in Settings later.
 */
export const TEAM_TYPES = {
  office: { icon: "💼", approvals: false, allowance: 28 },
  practice: { icon: "🩺", approvals: true, allowance: 28 },
  care: { icon: "🤝", approvals: true, allowance: 30 },
  childcare: { icon: "🧸", approvals: true, allowance: 30 },
  trades: { icon: "🔧", approvals: true, allowance: 28 },
  hospitality: { icon: "🍽️", approvals: true, allowance: 25 },
  other: { icon: "✨", approvals: false, allowance: 25 },
} as const;

export type TeamType = keyof typeof TEAM_TYPES;

export const TEAM_TYPE_KEYS = Object.keys(TEAM_TYPES) as [TeamType, ...TeamType[]];
