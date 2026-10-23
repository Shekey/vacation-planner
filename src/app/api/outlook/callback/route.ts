import { auth } from "@/auth";
import { connectOutlook } from "@/lib/outlook-db";
import { appOrigin } from "@/lib/url";

/**
 * Where Microsoft sends the person back after they approved access to their calendar (#35): `code=…&state=…`, or
 * `error=…` when they declined. The result goes back to Account as `?outlook=<outcome>`.
 */
export async function GET(req: Request) {
  const origin = await appOrigin();
  const session = await auth();
  if (!session?.user?.id) return Response.redirect(`${origin}/sign-in`, 303);

  const params = new URL(req.url).searchParams;
  const outcome = await connectOutlook({
    state: params.get("state") ?? "",
    code: params.get("code"),
    error: params.get("error"),
    userId: session.user.id,
    origin,
  });
  return Response.redirect(`${origin}/account?outlook=${outcome}#outlook`, 303);
}
