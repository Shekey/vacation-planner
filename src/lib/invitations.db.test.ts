import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { messagesFor } from "@/lib/i18n";
import { acceptInvitation, findInvitation, inviteMembers } from "@/lib/invitations";
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
