/** How long a workspace admin's "allow support access" lasts. */
export const SUPPORT_ACCESS_HOURS = 24;

/** The most days the operator can add to a trial in one go. */
export const TRIAL_EXTEND_MAX_DAYS = 60;

const DAY = 86_400_000;

/** Parses SUPERADMIN_EMAILS ("a@x.de, B@x.de") into lower-case addresses. */
export function parseSuperAdmins(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

/**
 * Whether this signed-in email belongs to the operator's team. The list comes from the environment only,
 * so nobody can become a super admin from inside the app. Sign-in proves the address (magic link).
 */
export function isSuperAdminEmail(email: string | null | undefined, list = parseSuperAdmins(process.env.SUPERADMIN_EMAILS)): boolean {
  return Boolean(email) && list.includes(email!.trim().toLowerCase());
}

/** True while the workspace's admin has support access switched on. */
export function supportAccessActive(until: Date | null | undefined, now = new Date()): boolean {
  return until != null && until > now;
}

export function supportAccessEnds(now = new Date()): Date {
  return new Date(now.getTime() + SUPPORT_ACCESS_HOURS * 3_600_000);
}

/** A trial extended by `days`, counted from today when it has already ended. */
export function extendedTrialEnd(current: Date | null, days: number, now = new Date()): Date {
  const base = current && current > now ? current : now;
  return new Date(base.getTime() + days * DAY);
}

/** A whole number of days between 1 and TRIAL_EXTEND_MAX_DAYS, or null. */
export function parseExtendDays(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= TRIAL_EXTEND_MAX_DAYS ? n : null;
}
