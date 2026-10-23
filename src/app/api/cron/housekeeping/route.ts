import { reportCronRun } from "@/lib/cron";
import { handlePendingRequests } from "@/lib/pending-reminders";
import { purgeOldData } from "@/lib/retention";
import { isCronRequest } from "@/lib/security";
import { sendTrialReminders } from "@/lib/trial-reminders";
import { appOrigin } from "@/lib/url";

// Must be a literal: Next.js reads it at build time. Allowed on every Vercel plan.
export const maxDuration = 60;

/**
 * The cheap, important daily work, kept apart from the routes that wait on chat services and the holiday API:
 * deletes data past its retention period (src/lib/retention.ts), emails admins before their trial ends, and reminds
 * approvers of requests nobody answered (src/lib/pending-reminders.ts).
 * Vercel Cron calls this daily (see vercel.json) with the CRON_SECRET bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return new Response("Unauthorized", { status: 401 });

  const problems: string[] = [];
  const origin = await appOrigin();
  const [purged, trialReminders, pendingRequests] = await Promise.all([
    purgeOldData().catch((e: Error) => void problems.push(`purge: ${e.message}`)),
    sendTrialReminders(origin).catch((e: Error) => void problems.push(`trial reminders: ${e.message}`)),
    handlePendingRequests(origin).catch((e: Error) => void problems.push(`pending requests: ${e.message}`)),
  ]);
  await reportCronRun("housekeeping", problems);
  return Response.json({ purged, trialReminders, pendingRequests, problems }, { status: problems.length > 0 ? 500 : 200 });
}
