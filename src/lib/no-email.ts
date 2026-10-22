import { randomBytes } from "node:crypto";
import { isSampleEmail } from "@/lib/sample-team";

/**
 * People an admin adds by name only: many nurses, cooks and trades staff have no work email. They get a placeholder
 * address on the reserved .invalid domain (RFC 2606), so no email can reach anyone and nobody can sign in as them.
 * They count toward the plan like anyone else, and admins book their time off. Adding a real address later lets
 * them sign in and keeps everything booked so far.
 */
export const NO_EMAIL_DOMAIN = "no-email.invalid";

export function hasNoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${NO_EMAIL_DOMAIN}`);
}

export function noEmailAddress(): string {
  return `${randomBytes(9).toString("base64url").toLowerCase()}@${NO_EMAIL_DOMAIN}`;
}

/** Sample people and people without email: addresses that never get mail and can't sign in. */
export function isPlaceholderEmail(email: string): boolean {
  return isSampleEmail(email) || hasNoEmail(email);
}
