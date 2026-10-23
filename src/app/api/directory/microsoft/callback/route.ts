import { auth } from "@/auth";
import { connectDirectory } from "@/lib/directory-db";
import { appOrigin } from "@/lib/url";

/**
 * Where Microsoft sends the admin back after the admin consent (#57): `admin_consent=True&tenant=…&state=…`, or
 * `error=…` when it was declined. The result goes back to the import page as `?directory=<outcome>`.
 */
export async function GET(req: Request) {
  const origin = await appOrigin();
  const session = await auth();
  if (!session?.user?.id) return Response.redirect(`${origin}/sign-in`, 303);

  const params = new URL(req.url).searchParams;
  const result = await connectDirectory({
    state: params.get("state") ?? "",
    tenant: params.get("tenant"),
    approved: params.get("admin_consent")?.toLowerCase() === "true" && !params.get("error"),
    userId: session.user.id,
  });
  if (!result.slug) return Response.redirect(`${origin}/`, 303);
  return Response.redirect(`${origin}/w/${result.slug}/import?start=directory&directory=${result.outcome}`, 303);
}
