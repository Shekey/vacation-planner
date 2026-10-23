import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Approve and decline links in the request email (#33): a signed token naming one booking and one admin, valid for
 * 7 days. Nothing is stored. It works once because a decision only applies to a booking that is still pending, and
 * the admin must still be an admin of that workspace when the button is pressed. The link only opens a page; the
 * decision needs a press there, so mail scanners that open links decide nothing.
 */
export const APPROVE_LINK_DAYS = 7;

export type ApproveLink = { bookingId: string; membershipId: string };

function sign(payload: string, secret: string): string {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", `approve-link:${secret}`).update(payload).digest("base64url");
}

export function approveToken(link: ApproveLink, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): string {
  const expires = Math.floor(now.getTime() / 1000) + APPROVE_LINK_DAYS * 24 * 60 * 60;
  const payload = Buffer.from(`${link.bookingId}.${link.membershipId}.${expires}`).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** The booking and admin a token names, or null when it was changed, is broken or has expired. */
export function readApproveToken(
  token: string,
  now = new Date(),
  secret = process.env.AUTH_SECRET ?? "",
): ApproveLink | null {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const [bookingId, membershipId, expires, rest] = Buffer.from(payload, "base64url").toString("utf8").split(".");
  if (!bookingId || !membershipId || rest !== undefined || !/^\d+$/.test(expires ?? "")) return null;
  if (Number(expires) * 1000 < now.getTime()) return null;
  return { bookingId, membershipId };
}

/** The page an approve or decline link opens; `decision` only picks which button is shown first. */
export function approveLinkUrl(origin: string, link: ApproveLink, decision: "approve" | "decline", now = new Date()): string {
  return `${origin}/decide/${approveToken(link, now)}?d=${decision}`;
}
