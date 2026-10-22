import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { messagesFor } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { makeUser } from "@/test/db";
import { createWorkspaceAction } from "./actions";

vi.mock("@/lib/session", async (original) => ({ ...(await original<typeof import("@/lib/session")>()), requireUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const t = messagesFor("en").newWorkspace.errors;

function form(name: string) {
  const data = new FormData();
  for (const [k, v] of Object.entries({ name, timezone: "UTC", teamType: "other", allowance: "20" })) data.set(k, v);
  return data;
}

describe("creating workspaces", () => {
  it("lets one person start three a day and then asks them to use what they have", async () => {
    const user = await makeUser("Starter");
    vi.mocked(requireUser).mockResolvedValue({ id: user.id, email: user.email, name: user.name });
    for (let i = 0; i < 3; i++) await expect(createWorkspaceAction({}, form(`Team ${i}`))).rejects.toThrow("REDIRECT /w/");
    expect(await createWorkspaceAction({}, form("Team 4"))).toEqual({ error: t.tooManyToday });
    expect(await db.workspace.count({ where: { createdById: user.id } })).toBe(3);
  });

  it("refuses names that carry a link or an address, since they end up in email subjects", async () => {
    const user = await makeUser("Spammer");
    vi.mocked(requireUser).mockResolvedValue({ id: user.id, email: user.email, name: user.name });
    expect(await createWorkspaceAction({}, form("Claim your prize www.example.com"))).toEqual({ error: t.nameLink });
    expect(await db.workspace.count({ where: { createdById: user.id } })).toBe(0);
  });
});
