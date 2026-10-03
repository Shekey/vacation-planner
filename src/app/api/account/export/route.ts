import { auth } from "@/auth";
import { exportAccount } from "@/lib/account";

/** Downloads everything stored about the signed-in person as JSON. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const data = await exportAccount(session.user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vacation-planner-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
