import { db } from "@/lib/db";

// Never cached: an uptime monitor must see the real state.
export const dynamic = "force-dynamic";

/**
 * For uptime monitors (UptimeRobot, Better Stack): 200 with {"status":"ok"} when the app can reach its database,
 * 503 otherwise. Says nothing else, so it is safe to leave public.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
