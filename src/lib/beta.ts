/**
 * Free beta phase. While it is on, every workspace gets everything for free and the pricing is shown as "future
 * pricing" with a founder discount; when it is off the normal plans, trial and checkout apply.
 *
 * NEXT_PUBLIC_ENABLE_BETA_MODE=false switches it off (anything else, or unset, means beta). It is a NEXT_PUBLIC_
 * variable so client components see it too, which means Next bakes it in at build time: change it, then redeploy.
 */
export function isBetaMode(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_BETA_MODE !== "false";
}

/** Team size cap during the beta: "unlimited" for any team we target, but not infinite so the app never shows ∞. */
export const BETA_MAX_MEMBERS = 1000;

/** Teams that join during the beta keep this discount on the list price for as long as they stay subscribed. */
export const FOUNDER_DISCOUNT_PERCENT = 50;

/** The list price with the founder discount, e.g. 39 → 19.5. */
export function founderPrice(monthly: number): number {
  return Math.round(monthly * (1 - FOUNDER_DISCOUNT_PERCENT / 100) * 100) / 100;
}
