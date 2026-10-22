import { randomUUID } from "node:crypto";
import { afterAll } from "vitest";
import type { Plan } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { settingsOf } from "@/lib/session";

const created: { workspaces: string[]; users: string[] } = { workspaces: [], users: [] };

afterAll(async () => {
  await db.workspace.deleteMany({ where: { id: { in: created.workspaces } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
});

export async function makeUser(name: string) {
  const user = await db.user.create({ data: { name, email: `${name.toLowerCase()}-${randomUUID()}@test.invalid` } });
  created.users.push(user.id);
  return user;
}

/**
 * A workspace of its own for one test, with an admin and a member on 20 days a year.
 * Defaults to a paid Team plan, so plan limits only apply when a test asks for them.
 */
export async function makeWorkspace(
  opts: {
    approvalsEnabled?: boolean;
    maxCarryOverDays?: number;
    carryOverExpiry?: string;
    plan?: Plan;
    billingStatus?: string | null;
    trialEndsAt?: Date | null;
  } = {},
) {
  const [adminUser, memberUser] = await Promise.all([makeUser("Admin"), makeUser("Member")]);
  const id = randomUUID();
  const workspace = await db.workspace.create({
    data: {
      name: "Test team",
      slug: `test-${id}`,
      plan: opts.plan ?? "TEAM",
      billingStatus: opts.billingStatus === undefined ? "active" : opts.billingStatus,
      trialEndsAt: opts.trialEndsAt ?? null,
      settings: {
        create: {
          approvalsEnabled: opts.approvalsEnabled ?? false,
          maxCarryOverDays: opts.maxCarryOverDays,
          carryOverExpiry: opts.carryOverExpiry,
        },
      },
      memberships: {
        create: [
          { userId: adminUser.id, role: "ADMIN", annualAllowanceDays: 20, joinedAt: new Date("2020-01-01") },
          { userId: memberUser.id, role: "MEMBER", annualAllowanceDays: 20, joinedAt: new Date("2020-01-01") },
        ],
      },
    },
    include: { settings: true, memberships: true },
  });
  created.workspaces.push(workspace.id);
  const admin = workspace.memberships.find((m) => m.userId === adminUser.id)!;
  const member = workspace.memberships.find((m) => m.userId === memberUser.id)!;
  return {
    workspace,
    settings: settingsOf(workspace),
    admin: { ...admin, user: adminUser, actor: { userId: adminUser.id, membershipId: admin.id, role: "ADMIN" as const } },
    member: { ...member, user: memberUser, actor: { userId: memberUser.id, membershipId: member.id, role: "MEMBER" as const } },
  };
}

/** Adds people until the workspace has `count` active members. */
export async function growTo(workspaceId: string, count: number) {
  const now = await db.membership.count({ where: { workspaceId, removedAt: null } });
  for (let i = now; i < count; i++) {
    const user = await makeUser(`Extra${i}`);
    await db.membership.create({ data: { workspaceId, userId: user.id } });
  }
}
