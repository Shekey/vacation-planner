"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/action-form";
import { accessOf, type PaidPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/session";
import { createCheckout, createPortal, type Interval } from "@/lib/stripe";
import { appOrigin } from "@/lib/url";

export async function checkoutAction(slug: string, plan: PaidPlan, interval: Interval): Promise<ActionResult> {
  const { workspace, user } = await requireAdmin(slug);
  const returnUrl = `${await appOrigin()}/w/${slug}/billing`;
  let url: string;
  try {
    // A live subscription changes plan in the portal, so nobody ends up paying twice.
    url =
      accessOf(workspace).kind === "paid" && workspace.stripeCustomerId
        ? await createPortal(workspace.stripeCustomerId, returnUrl)
        : await createCheckout({ workspace, email: user.email, plan, interval, returnUrl });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(url);
}

export async function portalAction(slug: string): Promise<ActionResult> {
  const { workspace } = await requireAdmin(slug);
  if (!workspace.stripeCustomerId) return { error: "There is no subscription yet." };
  let url: string;
  try {
    url = await createPortal(workspace.stripeCustomerId, `${await appOrigin()}/w/${slug}/billing`);
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(url);
}
