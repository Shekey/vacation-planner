import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { requireUser } from "@/lib/session";
import { sessionTwoFactorVerified } from "@/lib/two-factor";

/**
 * The signed-in operator, as far as the email list goes: anyone else gets a 404, so the area can't be
 * discovered. Used by the two-factor page itself; everything else needs requireSuperAdmin.
 */
export const requireOperatorEmail = cache(async () => {
  const user = await requireUser();
  if (!isSuperAdminEmail(user.email)) notFound();
  return user;
});

/**
 * The operator, signed in AND through the second factor in the last 12 hours; otherwise a redirect to
 * /two-factor. Call it at the top of every page and every server action under /admin: actions can be called directly.
 */
export const requireSuperAdmin = cache(async () => {
  const user = await requireOperatorEmail();
  if (!(await sessionTwoFactorVerified())) redirect("/two-factor?next=/admin");
  return user;
});
