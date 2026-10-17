import { notFound } from "next/navigation";
import { cache } from "react";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { requireUser } from "@/lib/session";

/**
 * The signed-in operator. Anyone else gets a 404, so the area can't be discovered.
 * Call it at the top of every page AND every server action under /admin: actions can be called directly.
 */
export const requireSuperAdmin = cache(async () => {
  const user = await requireUser();
  if (!isSuperAdminEmail(user.email)) notFound();
  return user;
});
