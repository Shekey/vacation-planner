import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  afterFailure,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  isLocked,
  consumeRecoveryCode,
  verificationFresh,
  verifyTotp,
} from "@/lib/totp";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

function authSecret(): string {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not set");
  return key;
}

/** The Auth.js session row of this request, or null. */
async function currentSession() {
  const jar = await cookies();
  for (const name of SESSION_COOKIES) {
    const token = jar.get(name)?.value;
    if (token) return db.session.findUnique({ where: { sessionToken: token }, select: { sessionToken: true, twoFactorVerifiedAt: true, expires: true } });
  }
  return null;
}

/** True when this sign-in passed the second factor in the last 12 hours. */
export async function sessionTwoFactorVerified(): Promise<boolean> {
  const session = await currentSession();
  return Boolean(session && session.expires > new Date() && verificationFresh(session.twoFactorVerifiedAt));
}

async function markVerified() {
  const session = await currentSession();
  if (session) await db.session.update({ where: { sessionToken: session.sessionToken }, data: { twoFactorVerifiedAt: new Date() } });
}

export type TwoFactorState =
  | { kind: "setup"; secret: string }
  | { kind: "verify"; lockedUntil: Date | null; recoveryLeft: number };

/** What this operator has to do: scan a new secret, or type a code. A new unconfirmed secret is created on first look. */
export async function twoFactorStateOf(userId: string): Promise<TwoFactorState> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true, totpLockedUntil: true, recoveryHashes: true },
  });
  if (user.totpEnabledAt) return { kind: "verify", lockedUntil: user.totpLockedUntil, recoveryLeft: user.recoveryHashes.length };
  // Keep the pending secret across page loads, so the code scanned a minute ago still works.
  if (user.totpSecret) return { kind: "setup", secret: decryptSecret(user.totpSecret, authSecret()) };
  const secret = generateSecret();
  await db.user.update({ where: { id: userId }, data: { totpSecret: encryptSecret(secret, authSecret()) } });
  return { kind: "setup", secret };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "wrong" | "locked" | "notSetUp" };

/** Counts a wrong code and locks the account after five in a row. */
async function fail(userId: string, failed: number): Promise<VerifyResult> {
  const next = afterFailure(failed, new Date());
  await db.user.update({ where: { id: userId }, data: { totpFailedCount: next.failed, totpLockedUntil: next.lockedUntil } });
  return { ok: false, reason: next.lockedUntil ? "locked" : "wrong" };
}

/**
 * Finishes setup: the code must come from the scanned secret. On success two-factor is on, this sign-in
 * is verified, and the one-time recovery codes are returned (shown once, stored as hashes).
 */
export async function confirmSetup(userId: string, code: string): Promise<VerifyResult & { recoveryCodes?: string[] }> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.totpEnabledAt || !user.totpSecret) return { ok: false, reason: "notSetUp" };
  if (isLocked(user.totpLockedUntil)) return { ok: false, reason: "locked" };
  const result = verifyTotp(decryptSecret(user.totpSecret, authSecret()), code, new Date(), null);
  if (!result.ok) return fail(userId, user.totpFailedCount);
  const recoveryCodes = generateRecoveryCodes();
  await db.user.update({
    where: { id: userId },
    data: {
      totpEnabledAt: new Date(),
      totpLastStep: result.step,
      totpFailedCount: 0,
      totpLockedUntil: null,
      recoveryHashes: recoveryCodes.map(hashRecoveryCode),
    },
  });
  await markVerified();
  return { ok: true, recoveryCodes };
}

/** Checks an authenticator code or, for a lost phone, a one-time recovery code, and verifies this sign-in. */
export async function verifySignIn(userId: string, input: string): Promise<VerifyResult> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpEnabledAt || !user.totpSecret) return { ok: false, reason: "notSetUp" };
  if (isLocked(user.totpLockedUntil)) return { ok: false, reason: "locked" };

  const totp = verifyTotp(decryptSecret(user.totpSecret, authSecret()), input, new Date(), user.totpLastStep);
  if (totp.ok) {
    await db.user.update({ where: { id: userId }, data: { totpLastStep: totp.step, totpFailedCount: 0, totpLockedUntil: null } });
    await markVerified();
    return { ok: true };
  }
  const recovery = consumeRecoveryCode(input, user.recoveryHashes);
  if (recovery.ok) {
    await db.user.update({
      where: { id: userId },
      data: { recoveryHashes: recovery.remaining, totpFailedCount: 0, totpLockedUntil: null },
    });
    await markVerified();
    return { ok: true };
  }
  return fail(userId, user.totpFailedCount);
}

/** New recovery codes, replacing the old ones. Only for an operator whose sign-in is verified. */
export async function renewRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await db.user.update({ where: { id: userId }, data: { recoveryHashes: codes.map(hashRecoveryCode) } });
  return codes;
}
