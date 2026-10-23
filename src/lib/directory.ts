import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { MICROSOFT_CONSUMER_TENANT } from "@/lib/oauth";

/**
 * People from Microsoft 365 (#57). A Microsoft 365 admin approves read-only access once ("admin consent"); we keep only
 * their tenant id and read the user list with the app's own credentials (client credentials, application permissions
 * User.Read.All and GroupMember.Read.All). No one's sign-in tokens are stored, nothing is written to Microsoft, and
 * members are never added or removed without an admin pressing the button: the directory only fills the import list
 * and suggests joiners and leavers.
 */

const LOGIN = "https://login.microsoftonline.com";
const GRAPH = "https://graph.microsoft.com/v1.0";
export const DIRECTORY_TIMEOUT_MS = 10_000;
/** Most users read from one tenant or group. Bigger tenants pick a group; the import takes at most 300 rows anyway. */
export const MAX_DIRECTORY_USERS = 1000;
const CONSENT_MINUTES = 30;

const TENANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GROUP = /^[0-9a-f-]{36}$/i;

type Env = Record<string, string | undefined>;

function credentials(env: Env = process.env) {
  const id = env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim();
  const secret = env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

/** Directory sync uses the same app registration as sign-in with Microsoft, so it is on whenever that is. */
export function directoryAvailable(env: Env = process.env): boolean {
  return credentials(env) !== null;
}

export function isTenantId(value: unknown): value is string {
  return typeof value === "string" && TENANT.test(value) && value.toLowerCase() !== MICROSOFT_CONSUMER_TENANT;
}

export function isGroupId(value: unknown): value is string {
  return typeof value === "string" && GROUP.test(value);
}

// ---------- admin consent ----------

export type ConsentState = { workspaceId: string; membershipId: string };

function sign(payload: string, secret: string): string {
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", `directory-consent:${secret}`).update(payload).digest("base64url");
}

/** Names the workspace and admin who started the consent, valid for 30 minutes, so the answer can't be replayed elsewhere. */
export function consentState(state: ConsentState, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): string {
  const expires = Math.floor(now.getTime() / 1000) + CONSENT_MINUTES * 60;
  const payload = Buffer.from(`${state.workspaceId}.${state.membershipId}.${expires}`).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readConsentState(token: string, now = new Date(), secret = process.env.AUTH_SECRET ?? ""): ConsentState | null {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const [workspaceId, membershipId, expires, rest] = Buffer.from(payload, "base64url").toString("utf8").split(".");
  if (!workspaceId || !membershipId || rest !== undefined || !/^\d+$/.test(expires ?? "")) return null;
  if (Number(expires) * 1000 < now.getTime()) return null;
  return { workspaceId, membershipId };
}

export function consentRedirectUri(origin: string): string {
  return `${origin}/api/directory/microsoft/callback`;
}

/** Microsoft's admin consent page for our app's application permissions, for work accounts only. */
export function consentUrl(origin: string, state: string, env: Env = process.env): string {
  const app = credentials(env);
  if (!app) throw new Error("Microsoft is not configured");
  const params = new URLSearchParams({
    client_id: app.id,
    scope: "https://graph.microsoft.com/.default",
    redirect_uri: consentRedirectUri(origin),
    state,
  });
  return `${LOGIN}/organizations/v2.0/adminconsent?${params}`;
}

// ---------- Microsoft Graph ----------

export class DirectoryError extends Error {
  constructor(public readonly code: "notConnected" | "consentMissing" | "tooMany" | "failed") {
    super(code);
  }
}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(DIRECTORY_TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new DirectoryError("failed");
  }
}

/** An app-only Graph token for one tenant. Fails with `consentMissing` when the tenant's admin hasn't approved (or took it back). */
export async function graphToken(tenant: string, env: Env = process.env): Promise<string> {
  const app = credentials(env);
  if (!app) throw new DirectoryError("notConnected");
  if (!isTenantId(tenant)) throw new DirectoryError("notConnected");
  const res = await call(`${LOGIN}/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: app.id,
      client_secret: app.secret,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  if (res.status === 400 || res.status === 401) throw new DirectoryError("consentMissing");
  if (!res.ok) throw new DirectoryError("failed");
  const body = (await res.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string") throw new DirectoryError("failed");
  return body.access_token;
}

/** Every page of a Graph list, up to `max` items; only graph.microsoft.com is ever fetched, whatever a next link says. */
async function list<T>(token: string, url: string, max: number): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = url;
  while (next) {
    if (!next.startsWith(`${GRAPH}/`)) throw new DirectoryError("failed");
    const res = await call(next, { headers: { authorization: `Bearer ${token}`, ConsistencyLevel: "eventual" } });
    if (res.status === 401 || res.status === 403) throw new DirectoryError("consentMissing");
    if (!res.ok) throw new DirectoryError("failed");
    const body = (await res.json()) as { value?: T[]; "@odata.nextLink"?: string };
    items.push(...(body.value ?? []));
    if (items.length > max) throw new DirectoryError("tooMany");
    next = body["@odata.nextLink"];
  }
  return items;
}

type GraphUser = {
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  accountEnabled?: boolean | null;
  userType?: string | null;
};

export type DirectoryPerson = { name: string | null; email: string };

const USER_FIELDS = "$select=displayName,mail,userPrincipalName,accountEnabled,userType&$top=999";

/**
 * The people of the organisation: enabled member accounts with an email, without guests, rooms or shared mailboxes
 * that have no license to sign in. Mail first, the sign-in name (UPN) when there's no mailbox.
 */
export function peopleOf(users: GraphUser[]): DirectoryPerson[] {
  const seen = new Set<string>();
  const people: DirectoryPerson[] = [];
  for (const u of users) {
    if (u.accountEnabled === false || (u.userType && u.userType !== "Member")) continue;
    const upn = u.userPrincipalName ?? "";
    const email = (u.mail || (upn.includes("#EXT#") ? "" : upn)).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    people.push({ name: u.displayName?.trim().slice(0, 100) || null, email });
  }
  return people.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
}

/** Everyone in the tenant, or in one group (with nested groups). */
export async function directoryPeople(tenant: string, groupId: string | null, env: Env = process.env): Promise<DirectoryPerson[]> {
  if (groupId !== null && !isGroupId(groupId)) throw new DirectoryError("failed");
  const token = await graphToken(tenant, env);
  const url = groupId ? `${GRAPH}/groups/${groupId}/transitiveMembers/microsoft.graph.user?${USER_FIELDS}&$count=true` : `${GRAPH}/users?${USER_FIELDS}`;
  return peopleOf(await list<GraphUser>(token, url, MAX_DIRECTORY_USERS));
}

export type DirectoryGroup = { id: string; name: string };

/** The tenant's groups, by name, to pick who belongs in the workspace. */
export async function directoryGroups(tenant: string, env: Env = process.env): Promise<DirectoryGroup[]> {
  const token = await graphToken(tenant, env);
  const groups = await list<{ id?: string; displayName?: string | null }>(token, `${GRAPH}/groups?$select=id,displayName&$top=999`, 2000).catch((e) => {
    // A tenant with thousands of groups still works: the admin can import everyone.
    if (e instanceof DirectoryError && e.code === "tooMany") return [];
    throw e;
  });
  const named: DirectoryGroup[] = [];
  for (const g of groups) {
    const name = g.displayName?.trim();
    if (isGroupId(g.id) && name) named.push({ id: g.id, name });
  }
  return named.sort((a, b) => a.name.localeCompare(b.name));
}

/** Whether an email belongs to an enabled member account in the tenant: the admin connecting it must be one of them. */
export async function isTenantMember(tenant: string, email: string, env: Env = process.env): Promise<boolean> {
  const token = await graphToken(tenant, env);
  const quoted = email.toLowerCase().replace(/'/g, "''");
  const filter = encodeURIComponent(`mail eq '${quoted}' or userPrincipalName eq '${quoted}'`);
  const users = await list<GraphUser>(token, `${GRAPH}/users?$filter=${filter}&$select=displayName,mail,userPrincipalName,accountEnabled,userType`, 10);
  return peopleOf(users).some((p) => p.email === email.toLowerCase());
}

// ---------- joiners and leavers ----------

export type DirectoryChanges = { joiners: DirectoryPerson[]; leavers: { membershipId: string; name: string | null; email: string }[] };

/**
 * Who is in the directory but not in the workspace, and who is in the workspace but no longer in the directory.
 * Only addresses on the organisation's own domains count as leavers, so a freelancer with a gmail address isn't one,
 * and people an admin removed on purpose aren't suggested again.
 */
export function directoryChanges(
  people: DirectoryPerson[],
  members: { id: string; email: string; name: string | null; removed: boolean }[],
): DirectoryChanges {
  const inDirectory = new Set(people.map((p) => p.email));
  const known = new Set(members.map((m) => m.email.toLowerCase()));
  const domains = new Set(people.map((p) => p.email.split("@")[1]));
  return {
    joiners: people.filter((p) => !known.has(p.email)),
    leavers: members
      .filter((m) => !m.removed && domains.has(m.email.toLowerCase().split("@")[1] ?? "") && !inDirectory.has(m.email.toLowerCase()))
      .map((m) => ({ membershipId: m.id, name: m.name, email: m.email })),
  };
}

/** Stands for one set of suggestions, so the nightly email goes out once per change and not every night. */
export function changesKey(changes: DirectoryChanges): string | null {
  if (changes.joiners.length === 0 && changes.leavers.length === 0) return null;
  const lines = [...changes.joiners.map((p) => `+${p.email}`), ...changes.leavers.map((m) => `-${m.email.toLowerCase()}`)].sort();
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

/** The directory as a people list for the importer: one row per person, names and emails. */
export function peopleText(people: DirectoryPerson[]): string {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ");
  return ["Name\tEmail", ...people.map((p) => `${clean(p.name ?? "")}\t${p.email}`)].join("\n");
}
