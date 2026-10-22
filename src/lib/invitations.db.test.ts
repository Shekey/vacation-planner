import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { acceptInvitation, findInvitation, inviteMembers, resendInvitation } from "@/lib/invitations";
import { coldMailLeft, MailLimitError } from "@/lib/mail-limits";
import { makeUser, makeWorkspace } from "@/test/db";

const t = messagesFor("en").errors.invitation;

/** Invites a new person and returns them with the token from the emailed link. */
async function invite(role: "ADMIN" | "MEMBER" = "MEMBER") {
  const team = await makeWorkspace();
  const user = await makeUser("Newcomer");
  vi.mocked(sendEmail).mockClear();
  await inviteMembers([user.email], role, {
    workspace: team.workspace,
    invitedBy: { id: team.admin.user.id, email: team.admin.user.email },
    origin: "https://app.test",
  });
  const token = vi.mocked(sendEmail).mock.calls[0][0].text.match(/\/invite\/(\S+)/)![1];
  return { team, user, token };
}

describe("invitations", () => {
  it("make the invited person a member with the workspace's default allowance, once", async () => {
    const { team, user, token } = await invite();
    expect(await acceptInvitation(token, user)).toBe(team.workspace.slug);
    const membership = await db.membership.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId: team.workspace.id, userId: user.id } } });
    expect({ role: membership.role, allowance: Number(membership.annualAllowanceDays) }).toEqual({ role: "MEMBER", allowance: 20 });
    expect((await findInvitation(token)).status).toBe("used");
  });

  it("only work for the address they were sent to", async () => {
    const { user, token } = await invite("ADMIN");
    const someoneElse = await makeUser("Other");
    await expect(acceptInvitation(token, someoneElse)).rejects.toThrow(t.otherEmail(user.email));
    expect((await findInvitation(token)).status).toBe("ok");
  });

  it("stop working when expired or replaced by a newer one", async () => {
    const { team, user, token } = await invite();
    await db.invitation.updateMany({ where: { workspaceId: team.workspace.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(acceptInvitation(token, user)).rejects.toThrow(t.expired);

    const again = await invite();
    await inviteMembers([again.user.email], "MEMBER", {
      workspace: again.team.workspace,
      invitedBy: { id: again.team.admin.user.id, email: again.team.admin.user.email },
      origin: "https://app.test",
    });
    expect((await findInvitation(again.token)).status).toBe("revoked");
  });
});

describe("daily limit for emails to new people", () => {
  const ctxOf = (team: Awaited<ReturnType<typeof makeWorkspace>>) => ({
    workspace: team.workspace,
    invitedBy: { id: team.admin.user.id, email: team.admin.user.email },
    origin: "https://app.test",
  });
  const addresses = (n: number) => Array.from({ length: n }, (_, i) => `new-${i}-${randomUUID()}@test.invalid`);

  it("refuses an invitation that would pass 200 a day, before sending anything, and counts resends", async () => {
    const team = await makeWorkspace();
    await db.coldMail.createMany({ data: Array.from({ length: 199 }, () => ({ workspaceId: team.workspace.id })) });
    vi.mocked(sendEmail).mockClear();
    await expect(inviteMembers(addresses(2), "MEMBER", ctxOf(team))).rejects.toBeInstanceOf(MailLimitError);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();

    await inviteMembers(addresses(1), "MEMBER", ctxOf(team));
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
    const open = await db.invitation.findFirstOrThrow({ where: { workspaceId: team.workspace.id } });
    await expect(resendInvitation(open.id, ctxOf(team))).rejects.toBeInstanceOf(MailLimitError);
  });

  it("counts only the last 24 hours", async () => {
    const team = await makeWorkspace();
    await db.coldMail.createMany({
      data: Array.from({ length: 200 }, () => ({ workspaceId: team.workspace.id, createdAt: new Date(Date.now() - 25 * 3_600_000) })),
    });
    expect(await coldMailLeft(team.workspace.id)).toEqual({ left: 200, limit: 200 });
  });
});
