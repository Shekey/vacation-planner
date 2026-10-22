import { createHmac } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";

/** How long a magic link stays valid (Auth.js defaults to a day). Used by src/auth.ts. */
export const MAGIC_LINK_MAX_AGE_SECONDS = 60 * 60;

/**
 * Limits on sign-in links. The one per address protects the person's inbox; it never blocks them, because the links
 * already sent still work. The ones per network and in total stop someone mailing many addresses from one place, or
 * at all, and only they turn the request down.
 */
export const SIGN_IN_LIMITS = {
  perAddress: { count: 3, minutes: 10 },
  // Generous, so a whole office behind one address can sign in on a Monday morning.
  perNetwork: { count: 20, minutes: 60 },
  total: { count: 500, minutes: 60 },
};

/** Attempts are kept this long, longer than any window above. Purged by src/lib/retention.ts. */
export const SIGN_IN_ATTEMPT_DAYS = 2;

/**
 * "send": email a new link. "enough": this address got several links in the last minutes; send nothing and show
 * "check your email" anyway, so typing someone's address can't lock them out. "refused": this network or the whole
 * app asked for too many links; show an error.
 */
export type SignInDecision = "send" | "enough" | "refused";

/** Decides whether a sign-in link goes out for this request and records the attempt. */
export async function checkSignInAttempt(
  email: string,
  ip: string | null,
  { now = new Date(), limits = SIGN_IN_LIMITS }: { now?: Date; limits?: typeof SIGN_IN_LIMITS } = {},
): Promise<SignInDecision> {
  const emailHash = keyedHash("email", email.trim().toLowerCase());
  const network = ip ? networkOf(ip) : null;
  const ipHash = network ? keyedHash("ip", network) : null;
  const since = (minutes: number) => ({ gt: new Date(now.getTime() - minutes * 60_000), lte: now });

  const [fromNetwork, total, toAddress] = await Promise.all([
    // Every request from a network counts, sent or not, so hammering one address still runs into this limit.
    ipHash ? db.signInAttempt.count({ where: { ipHash, createdAt: since(limits.perNetwork.minutes) } }) : 0,
    db.signInAttempt.count({ where: { sent: true, createdAt: since(limits.total.minutes) } }),
    db.signInAttempt.count({ where: { emailHash, sent: true, createdAt: since(limits.perAddress.minutes) } }),
  ]);

  if (fromNetwork >= limits.perNetwork.count || total >= limits.total.count) {
    // No address, no network: only which limit was hit.
    Sentry.captureMessage("sign-in limit reached", {
      level: "warning",
      tags: { limit: total >= limits.total.count ? "sign-in-total" : "sign-in-network" },
    });
    return "refused";
  }
  const decision = toAddress >= limits.perAddress.count ? "enough" : "send";
  await db.signInAttempt.create({ data: { emailHash, ipHash, sent: decision === "send", createdAt: now } });
  return decision;
}

/** The client's address as the host sets it. On Vercel both headers come from the platform and can't be forged. */
export function clientIp(headers: Headers): string | null {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

/**
 * IPv4 addresses as they are; IPv6 cut to the /64 a provider hands one connection, so one machine can't
 * switch addresses to get around the limit.
 */
export function networkOf(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

/** Keyed, so a leaked table can't be matched against a list of addresses. */
function keyedHash(kind: string, value: string): string {
  return createHmac("sha256", `sign-in-limit:${process.env.AUTH_SECRET ?? ""}`).update(`${kind}:${value}`).digest("hex");
}
