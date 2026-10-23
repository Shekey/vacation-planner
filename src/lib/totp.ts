import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { BRAND } from "@/lib/brand";

/**
 * Two-factor codes for the operator's team: time-based one-time passwords (RFC 6238, 6 digits, 30 seconds,
 * SHA-1), the format every authenticator app understands. Pure functions, so they are tested against the RFC's values.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** How many failed codes in a row lock the account, and for how long. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
/** A verified session must verify again after this many hours. */
export const VERIFIED_HOURS = 12;
export const RECOVERY_CODE_COUNT = 8;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const index = ALPHABET.indexOf(ch);
    if (index < 0) throw new Error("Not a base32 string");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret, 160 bits, base32 like authenticator apps show it. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The code for one 30-second step. */
export function codeForStep(secret: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = ((hmac[offset] & 127) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function stepAt(now: Date): number {
  return Math.floor(now.getTime() / 1000 / STEP_SECONDS);
}

/**
 * Checks a typed code against the current step and one step either side (clock drift). A code is
 * accepted only for a step after `lastStep`, so the same code can't be used twice. Returns the step it matched.
 */
export function verifyTotp(secret: string, input: string, now: Date, lastStep: number | null): { ok: true; step: number } | { ok: false } {
  const code = input.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false };
  const current = stepAt(now);
  let matched: number | null = null;
  // Check every step without stopping early, so timing doesn't tell which one matched.
  for (const step of [current - 1, current, current + 1]) {
    const expected = Buffer.from(codeForStep(secret, step));
    if (timingSafeEqual(expected, Buffer.from(code)) && (lastStep == null || step > lastStep)) matched = step;
  }
  return matched === null ? { ok: false } : { ok: true, step: matched };
}

/** The address an authenticator app reads from the QR code. */
export function otpauthUri(secret: string, account: string, issuer = BRAND.name): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/**
 * The secret as stored: encrypted with a key derived from AUTH_SECRET (AES-256-GCM), so a database leak alone doesn't give
 * the codes. `purpose` gives each kind of secret its own key (the Outlook refresh tokens use "outlook").
 */
export function encryptSecret(secret: string, key: string, purpose = "two-factor"): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(key, purpose), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(stored: string, key: string, purpose = "two-factor"): string {
  const [iv, tag, data] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(key, purpose), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function deriveKey(secret: string, purpose: string): Buffer {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

/** Recovery codes like "k3mf-9xqa-7tpw": one-time, for a lost phone. Shown once, stored only as hashes. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: count }, () => {
    const raw = Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("");
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");
}

/** Finds the typed recovery code among the stored hashes; returns the hashes left once it is used up. */
export function consumeRecoveryCode(input: string, hashes: readonly string[]): { ok: true; remaining: string[] } | { ok: false } {
  const given = Buffer.from(hashRecoveryCode(input));
  let index = -1;
  hashes.forEach((h, i) => {
    if (timingSafeEqual(given, Buffer.from(h))) index = i;
  });
  return index < 0 ? { ok: false } : { ok: true, remaining: hashes.filter((_, i) => i !== index) };
}

/** After a wrong code: count it, and lock for LOCK_MINUTES once MAX_FAILED_ATTEMPTS are reached. */
export function afterFailure(failed: number, now: Date): { failed: number; lockedUntil: Date | null } {
  const next = failed + 1;
  return next >= MAX_FAILED_ATTEMPTS
    ? { failed: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) }
    : { failed: next, lockedUntil: null };
}

export function isLocked(lockedUntil: Date | null | undefined, now = new Date()): boolean {
  return lockedUntil != null && lockedUntil > now;
}

/** Whether a session verified at `at` still counts as second-factor verified. */
export function verificationFresh(at: Date | null | undefined, now = new Date()): boolean {
  return at != null && now.getTime() - at.getTime() < VERIFIED_HOURS * 3_600_000;
}
