import { describe, expect, it } from "vitest";
import {
  afterFailure,
  base32Decode,
  base32Encode,
  codeForStep,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  isLocked,
  MAX_FAILED_ATTEMPTS,
  otpauthUri,
  stepAt,
  consumeRecoveryCode,
  verificationFresh,
  verifyTotp,
} from "./totp";

// RFC 6238 appendix B: the SHA-1 secret is the ASCII string "12345678901234567890".
const rfcSecret = base32Encode(Buffer.from("12345678901234567890"));

describe("base32", () => {
  it("round-trips and matches RFC 4648", () => {
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    expect(base32Decode("MZXW6YTBOI").toString()).toBe("foobar");
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });
  it("ignores spaces and dashes and rejects other characters", () => {
    expect(base32Decode("mzxw 6ytb-oi").toString()).toBe("foobar");
    expect(() => base32Decode("0189")).toThrow();
  });
});

describe("codeForStep", () => {
  it("matches the RFC 6238 test values (last 6 digits)", () => {
    const at = (seconds: number) => codeForStep(rfcSecret, Math.floor(seconds / 30));
    expect(at(59)).toBe("287082");
    expect(at(1111111109)).toBe("081804");
    expect(at(1111111111)).toBe("050471");
    expect(at(1234567890)).toBe("005924");
    expect(at(2000000000)).toBe("279037");
  });
});

describe("verifyTotp", () => {
  const now = new Date(59_000);
  it("accepts the current code and neighbouring steps, with spaces", () => {
    expect(verifyTotp(rfcSecret, "287082", now, null)).toEqual({ ok: true, step: 1 });
    expect(verifyTotp(rfcSecret, "287 082", now, null)).toEqual({ ok: true, step: 1 });
    expect(verifyTotp(rfcSecret, codeForStep(rfcSecret, 0), now, null).ok).toBe(true);
    expect(verifyTotp(rfcSecret, codeForStep(rfcSecret, 2), now, null).ok).toBe(true);
  });
  it("rejects wrong, malformed and too-old codes", () => {
    expect(verifyTotp(rfcSecret, "000000", now, null).ok).toBe(false);
    expect(verifyTotp(rfcSecret, "12345", now, null).ok).toBe(false);
    expect(verifyTotp(rfcSecret, "abcdef", now, null).ok).toBe(false);
    expect(verifyTotp(rfcSecret, codeForStep(rfcSecret, 5), now, null).ok).toBe(false);
  });
  it("never accepts a code twice", () => {
    expect(verifyTotp(rfcSecret, "287082", now, 1).ok).toBe(false);
    expect(verifyTotp(rfcSecret, "287082", now, 0).ok).toBe(true);
  });
  it("stepAt counts 30-second steps", () => expect(stepAt(new Date(59_999))).toBe(1));
});

describe("otpauthUri", () => {
  it("puts the issuer, account and secret where apps look for them", () => {
    const uri = otpauthUri("ABC234", "ops@x.de");
    expect(uri).toBe("otpauth://totp/Vacation%20Planner:ops%40x.de?secret=ABC234&issuer=Vacation%20Planner&algorithm=SHA1&digits=6&period=30");
  });
});

describe("secret encryption", () => {
  it("round-trips with the same key and fails with another", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP", "auth-secret");
    expect(stored).not.toContain("JBSWY3DP");
    expect(decryptSecret(stored, "auth-secret")).toBe("JBSWY3DPEHPK3PXP");
    expect(() => decryptSecret(stored, "other-secret")).toThrow();
  });
  it("uses a fresh nonce each time and needs a key", () => {
    expect(encryptSecret("A", "k")).not.toBe(encryptSecret("A", "k"));
    expect(() => encryptSecret("A", "")).toThrow();
  });
});

describe("recovery codes", () => {
  it("are one-time and forgiving about dashes and case", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(codes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    const hashes = codes.map(hashRecoveryCode);
    const used = consumeRecoveryCode(codes[3].toUpperCase().replace(/-/g, " "), hashes);
    expect(used.ok).toBe(true);
    if (used.ok) {
      expect(used.remaining).toHaveLength(7);
      expect(consumeRecoveryCode(codes[3], used.remaining).ok).toBe(false);
    }
  });
  it("reject unknown codes", () => expect(consumeRecoveryCode("aaaa-bbbb-cccc", [hashRecoveryCode("xxxx-yyyy-zzzz")]).ok).toBe(false));
});

describe("lockout", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  it("locks after five failures in a row", () => {
    let state = { failed: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
      state = afterFailure(state.failed, now);
      expect(state.lockedUntil).toBeNull();
    }
    state = afterFailure(state.failed, now);
    expect(state.lockedUntil?.toISOString()).toBe("2026-10-19T12:15:00.000Z");
    expect(state.failed).toBe(0);
  });
  it("isLocked looks at the time", () => {
    expect(isLocked(new Date("2026-10-19T12:10:00Z"), now)).toBe(true);
    expect(isLocked(new Date("2026-10-19T11:59:00Z"), now)).toBe(false);
    expect(isLocked(null, now)).toBe(false);
  });
});

describe("verificationFresh", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  it("holds for 12 hours", () => {
    expect(verificationFresh(new Date("2026-10-19T01:00:00Z"), now)).toBe(true);
    expect(verificationFresh(new Date("2026-10-18T23:00:00Z"), now)).toBe(false);
    expect(verificationFresh(null, now)).toBe(false);
  });
});
