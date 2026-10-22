import { randomInt, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { purgeOldData } from "@/lib/retention";
import { checkSignInAttempt, SIGN_IN_LIMITS } from "@/lib/sign-in-limit";

const FUTURE = new Date(Date.UTC(2100, 0, 1));

/** Each test runs at its own moment far from now, 3-hour steps apart, so only its own attempts fall in the windows. */
function moment() {
  return new Date(FUTURE.getTime() + randomInt(0, 1_000_000) * 3 * 3_600_000);
}

afterAll(async () => {
  await db.signInAttempt.deleteMany({ where: { createdAt: { gte: FUTURE } } });
});
const minutesLater = (at: Date, minutes: number) => new Date(at.getTime() + minutes * 60_000);
const address = () => `person-${randomUUID()}@test.invalid`;
const ip = () => `198.51.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

describe("sign-in throttle", () => {
  it("never locks a person out: after three links others asked for, they see 'check your email' and a new link comes later", async () => {
    const now = moment();
    const victim = address();
    for (let i = 0; i < 3; i++) expect(await checkSignInAttempt(victim, `203.0.113.${i}`, { now })).toBe("send");
    // Their own request, from their own network, isn't refused: the three links in their inbox still work.
    expect(await checkSignInAttempt(victim, "192.0.2.10", { now: minutesLater(now, 1) })).toBe("enough");
    expect(await checkSignInAttempt(victim, "192.0.2.10", { now: minutesLater(now, 11) })).toBe("send");
  });

  it("matches addresses whatever their case or spaces", async () => {
    const now = moment();
    const person = address();
    for (let i = 0; i < 3; i++) await checkSignInAttempt(person, ip(), { now });
    expect(await checkSignInAttempt(`  ${person.toUpperCase()} `, ip(), { now })).toBe("enough");
  });

  it("refuses a network that asks for links to many addresses", async () => {
    const now = moment();
    const network = ip();
    for (let i = 0; i < SIGN_IN_LIMITS.perNetwork.count; i++) {
      expect(await checkSignInAttempt(address(), network, { now: minutesLater(now, i) })).toBe("send");
    }
    expect(await checkSignInAttempt(address(), network, { now: minutesLater(now, 30) })).toBe("refused");
    // Others aren't affected, and the network gets links again once the hour has passed.
    expect(await checkSignInAttempt(address(), ip(), { now: minutesLater(now, 30) })).toBe("send");
    expect(await checkSignInAttempt(address(), network, { now: minutesLater(now, 80) })).toBe("send");
  });

  it("counts requests that sent nothing toward the network's limit", async () => {
    const now = moment();
    const network = ip();
    const person = address();
    const limits = { ...SIGN_IN_LIMITS, perNetwork: { count: 5, minutes: 60 } };
    const answers = [];
    for (let i = 0; i < 6; i++) answers.push(await checkSignInAttempt(person, network, { now, limits }));
    expect(answers).toEqual(["send", "send", "send", "enough", "enough", "refused"]);
  });

  it("stops sending to anyone past the total ceiling", async () => {
    const now = moment();
    const limits = { ...SIGN_IN_LIMITS, total: { count: 2, minutes: 60 } };
    expect(await checkSignInAttempt(address(), ip(), { now, limits })).toBe("send");
    expect(await checkSignInAttempt(address(), ip(), { now, limits })).toBe("send");
    expect(await checkSignInAttempt(address(), ip(), { now, limits })).toBe("refused");
  });

  it("works without a client address, and stores neither the address nor the network in clear", async () => {
    const now = moment();
    const person = address();
    expect(await checkSignInAttempt(person, null, { now })).toBe("send");
    const rows = await db.signInAttempt.findMany({ where: { createdAt: now } });
    expect(rows).toHaveLength(1);
    expect(rows[0].ipHash).toBeNull();
    expect(JSON.stringify(rows)).not.toContain(person);
  });

  it("are purged after two days", async () => {
    const now = new Date();
    const old = await db.signInAttempt.create({ data: { emailHash: randomUUID(), sent: true, createdAt: minutesLater(now, -3 * 24 * 60) } });
    const recent = await db.signInAttempt.create({ data: { emailHash: randomUUID(), sent: true, createdAt: minutesLater(now, -60) } });
    await purgeOldData(now);
    expect(await db.signInAttempt.findMany({ where: { id: { in: [old.id, recent.id] } }, select: { id: true } })).toEqual([{ id: recent.id }]);
    await db.signInAttempt.delete({ where: { id: recent.id } });
  });
});
