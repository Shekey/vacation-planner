import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { directoryGroupsAction, disconnectDirectoryAction, loadDirectoryAction, previewImportAction } from "@/app/w/[slug]/import/actions";
import { GET as consentCallback } from "@/app/api/directory/microsoft/callback/route";
import { db } from "@/lib/db";
import { consentState, consentUrl } from "@/lib/directory";
import { connectDirectory, notifyDirectoryChanges } from "@/lib/directory-db";
import { sendEmail } from "@/lib/email";
import { makeWorkspace } from "@/test/db";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null), signIn: vi.fn(), signOut: vi.fn() }));

const TENANT = "11111111-2222-3333-4444-555555555555";
const OTHER_TENANT = "99999999-8888-7777-6666-555555555555";
const GROUP = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

type Team = Awaited<ReturnType<typeof makeWorkspace>>;
type User = { displayName: string; mail?: string | null; userPrincipalName: string; accountEnabled?: boolean; userType?: string };

/**
 * A pretend Microsoft: the token endpoint answers for tenants that consented, and Graph lists `users` (in two pages)
 * and the members of one group. Every request is recorded.
 */
function fakeMicrosoft(opts: { consented: string[]; users: User[]; group?: User[]; groups?: { id: string; displayName: string }[] }) {
  const calls: string[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      calls.push(`${init?.method ?? "GET"} ${url.href}`);
      if (url.hostname === "login.microsoftonline.com") {
        const tenant = url.pathname.split("/")[1];
        const body = new URLSearchParams(String(init?.body));
        if (body.get("grant_type") !== "client_credentials" || body.get("client_secret") !== "ms-secret") return json({ error: "invalid_client" }, 401);
        return opts.consented.includes(tenant) ? json({ access_token: `token-${tenant}` }) : json({ error: "invalid_grant" }, 400);
      }
      if (url.hostname !== "graph.microsoft.com") throw new Error(`unexpected fetch ${url.href}`);
      const auth = new Headers(init?.headers).get("authorization") ?? "";
      if (!opts.consented.some((t) => auth === `Bearer token-${t}`)) return json({ error: "unauthorized" }, 401);
      const filter = url.searchParams.get("$filter");
      if (url.pathname === "/v1.0/users" && filter) {
        const wanted = /mail eq '(.+?)'/.exec(filter)?.[1].replace(/''/g, "'");
        return json({ value: opts.users.filter((u) => u.mail === wanted || u.userPrincipalName === wanted) });
      }
      if (url.pathname === "/v1.0/users") {
        const half = Math.ceil(opts.users.length / 2);
        if (url.searchParams.get("page") === "2") return json({ value: opts.users.slice(half) });
        return json({ value: opts.users.slice(0, half), "@odata.nextLink": `https://graph.microsoft.com/v1.0/users?page=2&$top=999` });
      }
      if (url.pathname === `/v1.0/groups/${GROUP}/transitiveMembers/microsoft.graph.user`) return json({ value: opts.group ?? [] });
      if (url.pathname === "/v1.0/groups") return json({ value: opts.groups ?? [] });
      return json({ error: "not found" }, 404);
    }),
  );
  return calls;
}

/** Gives the team work addresses on one domain, as a Microsoft 365 company would have. */
async function onDomain(team: Team) {
  const domain = `firma-${randomUUID().slice(0, 8)}.de`;
  const admin = await db.user.update({ where: { id: team.admin.userId }, data: { email: `admin@${domain}` } });
  const member = await db.user.update({ where: { id: team.member.userId }, data: { email: `member@${domain}` } });
  return { domain, admin: admin.email, member: member.email };
}

const person = (displayName: string, mail: string, extra: Partial<User> = {}): User => ({ displayName, mail, userPrincipalName: mail, accountEnabled: true, userType: "Member", ...extra });

const signInAs = (team: Team, who: "admin" | "member" = "admin") =>
  vi.mocked(auth).mockResolvedValue({ user: { id: team[who].userId, email: team[who].user.email, name: null }, expires: "2099-01-01" } as never);

async function connected(team: Team) {
  await db.workspaceSettings.update({ where: { workspaceId: team.workspace.id }, data: { directoryTenantId: TENANT, directoryConnectedAt: new Date() } });
}

beforeEach(() => {
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID = "ms-app";
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET = "ms-secret";
  vi.mocked(sendEmail).mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(auth).mockResolvedValue(null as never);
  delete process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  delete process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
});

describe("connecting Microsoft 365", () => {
  it("asks Microsoft for admin consent to our app, for work accounts, coming back to our callback", () => {
    const url = new URL(consentUrl("https://app.test", "state-1"));
    expect(url.origin + url.pathname).toBe("https://login.microsoftonline.com/organizations/v2.0/adminconsent");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "ms-app",
      scope: "https://graph.microsoft.com/.default",
      redirect_uri: "https://app.test/api/directory/microsoft/callback",
      state: "state-1",
    });
  });

  it("keeps the tenant once its admin approved and the connecting admin is a person in it", async () => {
    const team = await makeWorkspace();
    const { admin } = await onDomain(team);
    fakeMicrosoft({ consented: [TENANT], users: [person("Ada Admin", admin)] });
    signInAs(team);

    const state = consentState({ workspaceId: team.workspace.id, membershipId: team.admin.id });
    const res = await consentCallback(new Request(`https://app.test/api/directory/microsoft/callback?admin_consent=True&tenant=${TENANT}&state=${state}`));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`https://app.test/w/${team.workspace.slug}/import?start=directory&directory=connected`);
    const settings = await db.workspaceSettings.findUniqueOrThrow({ where: { workspaceId: team.workspace.id } });
    expect(settings.directoryTenantId).toBe(TENANT);
    expect(await db.auditEvent.count({ where: { workspaceId: team.workspace.id, action: "directory.connected" } })).toBe(1);
  });

  it("refuses another organisation's tenant: the admin's email must be an active member account there", async () => {
    const team = await makeWorkspace();
    const { admin } = await onDomain(team);
    // The other company approved our app for itself; this admin isn't one of its people, or is only a guest there.
    fakeMicrosoft({ consented: [OTHER_TENANT], users: [person("Guest", admin, { userType: "Guest" }), person("Someone", "someone@other.example")] });
    const state = consentState({ workspaceId: team.workspace.id, membershipId: team.admin.id });

    expect(await connectDirectory({ state, tenant: OTHER_TENANT, approved: true, userId: team.admin.userId })).toEqual({
      slug: team.workspace.slug,
      outcome: "notMember",
    });
    expect((await db.workspaceSettings.findUniqueOrThrow({ where: { workspaceId: team.workspace.id } })).directoryTenantId).toBeNull();
  });

  it("refuses a changed, expired or someone else's state, a member, a declined consent and a tenant without consent", async () => {
    const team = await makeWorkspace();
    const { admin } = await onDomain(team);
    fakeMicrosoft({ consented: [TENANT], users: [person("Ada Admin", admin)] });
    const state = consentState({ workspaceId: team.workspace.id, membershipId: team.admin.id });
    const go = (s: string, userId = team.admin.userId, extra: { tenant?: string; approved?: boolean } = {}) =>
      connectDirectory({ state: s, tenant: extra.tenant ?? TENANT, approved: extra.approved ?? true, userId });

    expect((await go(`${state}x`)).outcome).toBe("expired");
    expect((await go(consentState({ workspaceId: team.workspace.id, membershipId: team.admin.id }, new Date("2027-05-31T09:00:00Z")))).outcome).toBe("expired");
    expect((await go(state, team.member.userId)).outcome).toBe("expired");
    const memberState = consentState({ workspaceId: team.workspace.id, membershipId: team.member.id });
    expect((await go(memberState, team.member.userId)).outcome).toBe("expired");
    expect((await go(state, team.admin.userId, { approved: false })).outcome).toBe("declined");
    expect((await go(state, team.admin.userId, { tenant: OTHER_TENANT })).outcome).toBe("consentMissing");
    expect((await go(state, team.admin.userId, { tenant: "not-a-tenant" })).outcome).toBe("failed");
    expect((await db.workspaceSettings.findUniqueOrThrow({ where: { workspaceId: team.workspace.id } })).directoryTenantId).toBeNull();
  });
});

describe("loading people from Microsoft 365", () => {
  it("fills the importer with enabled member accounts, across pages, without guests, disabled accounts or external users", async () => {
    const team = await makeWorkspace();
    const { domain, admin, member } = await onDomain(team);
    await connected(team);
    const calls = fakeMicrosoft({
      consented: [TENANT],
      users: [
        person("Ada Admin", admin),
        person("Mia Member", member),
        person("Neu Person", `neu@${domain}`),
        person("Ohne Mailbox", "", { mail: null, userPrincipalName: `ohne@${domain}` }),
        person("Gast", "gast@partner.example", { userType: "Guest" }),
        person("Ex", `ex@${domain}`, { accountEnabled: false }),
        person("Extern", "", { mail: null, userPrincipalName: "extern_partner.example#EXT#@firma.onmicrosoft.com" }),
      ],
    });
    signInAs(team);

    const result = await loadDirectoryAction(team.workspace.slug, null, null);
    expect(result.error).toBeUndefined();
    expect(result.count).toBe(4);
    expect(result.text?.split("\n")).toEqual(["Name\tEmail", `Ada Admin\t${admin}`, `Mia Member\t${member}`, `Neu Person\tneu@${domain}`, `Ohne Mailbox\tohne@${domain}`]);
    expect(calls.filter((c) => c.startsWith("GET https://graph.microsoft.com/v1.0/users"))).toHaveLength(2);

    // The importer then sees who is new.
    const preview = await previewImportAction(team.workspace.slug, "people", result.text!);
    expect(preview.people?.counts).toMatchObject({ new: 2, exists: 2 });
  });

  it("can be one group, remembered for the nightly check", async () => {
    const team = await makeWorkspace();
    const { domain, admin } = await onDomain(team);
    await connected(team);
    fakeMicrosoft({ consented: [TENANT], users: [], group: [person("Ada Admin", admin), person("Vera Vertrieb", `vera@${domain}`)], groups: [{ id: GROUP, displayName: "Vertrieb Berlin" }] });
    signInAs(team);

    expect(await directoryGroupsAction(team.workspace.slug)).toEqual({ groups: [{ id: GROUP, name: "Vertrieb Berlin" }] });
    const result = await loadDirectoryAction(team.workspace.slug, GROUP, "Vertrieb Berlin");
    expect(result.count).toBe(2);
    const settings = await db.workspaceSettings.findUniqueOrThrow({ where: { workspaceId: team.workspace.id } });
    expect(settings).toMatchObject({ directoryGroupId: GROUP, directoryGroupName: "Vertrieb Berlin" });
    expect((await loadDirectoryAction(team.workspace.slug, "../users", null)).error).toBe("Pick one of the groups.");
  });

  it("lists leavers on the company's own domains only, and never suggests people an admin removed", async () => {
    const team = await makeWorkspace();
    const { domain, admin } = await onDomain(team);
    await connected(team);
    const freelancer = await db.user.create({ data: { email: `free-${randomUUID()}@gmail.example`, name: "Freelancer" } });
    await db.membership.create({ data: { workspaceId: team.workspace.id, userId: freelancer.id } });
    const gone = await db.user.create({ data: { email: `gone-${randomUUID()}@${domain}`, name: "Gone" } });
    await db.membership.create({ data: { workspaceId: team.workspace.id, userId: gone.id, removedAt: new Date() } });
    fakeMicrosoft({ consented: [TENANT], users: [person("Ada Admin", admin), person("Gone", gone.email)] });
    signInAs(team);

    const result = await loadDirectoryAction(team.workspace.slug, null, null);
    // The member left the company; the freelancer isn't on its domain; "Gone" was removed on purpose and stays out.
    expect(result.leavers).toEqual([{ name: "Member", email: `member@${domain}` }]);
    const preview = await previewImportAction(team.workspace.slug, "people", result.text!);
    expect(preview.people?.counts).toMatchObject({ new: 0, exists: 1, removed: 1 });
    await db.membership.deleteMany({ where: { userId: { in: [freelancer.id, gone.id] } } });
    await db.user.deleteMany({ where: { id: { in: [freelancer.id, gone.id] } } });
  });

  it("says so when the access was taken back, the tenant is too big, or it isn't connected", async () => {
    const team = await makeWorkspace();
    signInAs(team);
    fakeMicrosoft({ consented: [], users: [] });
    expect((await loadDirectoryAction(team.workspace.slug, null, null)).error).toBe("Microsoft 365 isn't connected yet.");
    await connected(team);
    expect(await loadDirectoryAction(team.workspace.slug, null, null)).toEqual({
      error: "Microsoft 365 no longer allows access. Connect it again, and have an administrator approve it.",
      reconnect: true,
    });

    fakeMicrosoft({ consented: [TENANT], users: Array.from({ length: 1002 }, (_, i) => person(`P${i}`, `p${i}@big.example`)) });
    expect((await loadDirectoryAction(team.workspace.slug, null, null)).error).toMatch(/more than 1,000 people/);
  });

  it("only follows next links to Microsoft Graph", async () => {
    const team = await makeWorkspace();
    await connected(team);
    signInAs(team);
    const fetched: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        fetched.push(url);
        if (url.startsWith("https://login.microsoftonline.com/")) return Response.json({ access_token: "t" });
        if (url.startsWith("https://graph.microsoft.com/")) return Response.json({ value: [], "@odata.nextLink": "https://attacker.example/users" });
        return Response.json({ value: [] });
      }),
    );
    expect((await loadDirectoryAction(team.workspace.slug, null, null)).error).toBe("Microsoft 365 didn't answer. Try again in a moment.");
    // The Graph token never goes anywhere else.
    expect(fetched.some((u) => u.startsWith("https://attacker.example"))).toBe(false);
  });

  it("can be disconnected without removing anyone", async () => {
    const team = await makeWorkspace();
    await connected(team);
    signInAs(team);
    expect(await disconnectDirectoryAction(team.workspace.slug)).toEqual({ ok: "Microsoft 365 is disconnected." });
    expect((await db.workspaceSettings.findUniqueOrThrow({ where: { workspaceId: team.workspace.id } })).directoryTenantId).toBeNull();
    expect(await db.membership.count({ where: { workspaceId: team.workspace.id, removedAt: null } })).toBe(2);
  });
});

describe("the nightly check", () => {
  it("emails the admins once per change in joiners and leavers, and changes nobody", async () => {
    const team = await makeWorkspace();
    const { domain, admin, member } = await onDomain(team);
    await connected(team);
    const users = [person("Ada Admin", admin), person("Mia Member", member)];
    fakeMicrosoft({ consented: [TENANT], users });
    const mine = () => vi.mocked(sendEmail).mock.calls.filter(([m]) => m.to === admin);

    await notifyDirectoryChanges("https://app.test");
    expect(mine()).toHaveLength(0);

    users.push(person("Neu Person", `neu@${domain}`));
    users.splice(1, 1);
    await notifyDirectoryChanges("https://app.test");
    expect(mine()).toHaveLength(1);
    const [mail] = mine()[0];
    expect(mail.subject).toBe("Changes in Microsoft 365 for Test team");
    expect(mail.text).toContain(`Neu Person <neu@${domain}>`);
    expect(mail.text).toContain(`Member <${member}>`);
    expect(mail.text).toContain(`https://app.test/w/${team.workspace.slug}/import?start=directory`);
    // Not to the member, and nobody was added or removed.
    expect(vi.mocked(sendEmail).mock.calls.some(([m]) => m.to === member)).toBe(false);
    expect(await db.membership.count({ where: { workspaceId: team.workspace.id, removedAt: null } })).toBe(2);

    await notifyDirectoryChanges("https://app.test");
    expect(mine()).toHaveLength(1);
  });

  it("keeps going when one tenant took the access back", async () => {
    const team = await makeWorkspace();
    await connected(team);
    fakeMicrosoft({ consented: [], users: [] });
    const result = await notifyDirectoryChanges("https://app.test");
    expect(result.failed).toBeGreaterThanOrEqual(1);
  });
});
