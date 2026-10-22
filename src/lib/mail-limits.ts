import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { accessOf } from "@/lib/plans";

/**
 * Anyone can sign up and create a workspace, and admins can email people who never asked (invitations, "here is where
 * to sign in"). Without a limit a new account could use our sender domain to mail strangers, and Resend would suspend
 * it, which stops everyone's sign-in links. Mail to new people is therefore capped per workspace and day.
 */
export const NEW_WORKSPACE_DAYS = 7;
const NEW_WORKSPACE_LIMIT = 20;
const ESTABLISHED_LIMIT = 100;
const PAID_LIMIT = 200;

/** How many emails to new people a workspace may send per day: few while it is new and unpaid, more once it is established. */
export function dailyColdMailLimit(ws: { createdAt: Date; paid: boolean }, now = new Date()): number {
  if (ws.paid) return PAID_LIMIT;
  const ageDays = (now.getTime() - ws.createdAt.getTime()) / 86_400_000;
  return ageDays < NEW_WORKSPACE_DAYS ? NEW_WORKSPACE_LIMIT : ESTABLISHED_LIMIT;
}

export class MailLimitError extends Error {
  constructor(
    /** How many more such emails go out today. */
    readonly left: number,
    readonly limit: number,
  ) {
    super("Daily limit for emails to new people reached");
  }
}

/** How many emails to new people this workspace may still send in the next 24 hours. */
export async function coldMailLeft(workspaceId: string, now = new Date()): Promise<{ left: number; limit: number }> {
  const ws = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { createdAt: true, plan: true, billingStatus: true, trialEndsAt: true },
  });
  const limit = dailyColdMailLimit({ createdAt: ws.createdAt, paid: accessOf(ws, now).kind === "paid" }, now);
  const sent = await db.coldMail.count({ where: { workspaceId, createdAt: { gt: new Date(now.getTime() - 86_400_000) } } });
  return { left: Math.max(0, limit - sent), limit };
}

/** Stops with a MailLimitError when `count` more emails would pass today's limit. Call before sending anything. */
export async function assertColdMailRoom(workspaceId: string, count: number) {
  const { left, limit } = await coldMailLeft(workspaceId);
  if (count > left) {
    // No address, no name: only that someone hit the limit.
    Sentry.captureMessage("email limit reached", { level: "warning", tags: { limit: "cold-mail" } });
    throw new MailLimitError(left, limit);
  }
}

/** Counts emails that were sent (or tried) to new people. */
export async function recordColdMail(workspaceId: string, count: number) {
  if (count <= 0) return;
  await db.coldMail.createMany({ data: Array.from({ length: count }, () => ({ workspaceId })) });
}

/** Names end up in email subjects, so they can't carry links or addresses. */
export function isPlainName(name: string): boolean {
  return !/(https?:|www\.|@)/i.test(name);
}
