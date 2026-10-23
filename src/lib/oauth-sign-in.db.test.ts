import { randomUUID } from "node:crypto";
import { Auth, setEnvDefaults, skipCSRFCheck } from "@auth/core";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { authConfig } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { MICROSOFT_CONSUMER_TENANT } from "@/lib/oauth";
import { makeUser } from "@/test/db";

/**
 * Whole sign-ins through Auth.js with our settings (#32). Google and Microsoft are played by a fake `fetch` that answers
 * their discovery, token and key endpoints, so the real provider code runs: state, PKCE, nonce and id-token checks.
 */

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })), emailFrom: () => "test@app.test" }));

const origin = "https://app.test";
const tenant = "7a1d3c52-0f6e-4d8a-9b21-5c3e8f0a1b2c";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwks = { keys: [{ ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" }] };

/** The claims the next token response puts in the id token, besides iss, aud, nonce and the times. */
let nextClaims: Record<string, unknown> = {};

function server(issuer: string, base: string) {
  return {
    issuer,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    userinfo_endpoint: `${base}/userinfo`,
    jwks_uri: `${base}/keys`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
  };
}

/** Remembers the nonce of each sign-in started, by its state, for the token endpoint to put in the id token. */
const nonces = new Map<string, string | null>();
let lastCode: { issuer: string; clientId: string; state: string } | null = null;

async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const json = (body: unknown) => Response.json(body);
  if (url.host === "accounts.google.com" && url.pathname === "/.well-known/openid-configuration") {
    return json(server("https://accounts.google.com", "https://accounts.google.com"));
  }
  if (url.host === "login.microsoftonline.com" && url.pathname.endsWith("/v2.0/.well-known/openid-configuration")) {
    const id = url.pathname.split("/")[1];
    // Like Microsoft: the shared `common` document has a placeholder issuer, a tenant's own has the tenant in it.
    const issuer = id === "common" ? "https://login.microsoftonline.com/{tenantid}/v2.0" : `https://login.microsoftonline.com/${id}/v2.0`;
    return json(server(issuer, `https://login.microsoftonline.com/${id}/oauth2/v2.0`));
  }
  if (url.pathname.endsWith("/keys")) return json(jwks);
  if (url.pathname.endsWith("/token") && init?.method === "POST" && lastCode) {
    const { issuer, clientId, state } = lastCode;
    const tid = typeof nextClaims.tid === "string" ? nextClaims.tid : undefined;
    const nonce = nonces.get(state);
    const now = Math.floor(Date.now() / 1000);
    const idToken = await new SignJWT({ ...nextClaims, ...(nonce ? { nonce } : {}) })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(tid ? issuer.replace("common", tid) : issuer)
      .setAudience(clientId)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(privateKey);
    return json({ access_token: "access-token-not-to-keep", refresh_token: "refresh-not-to-keep", token_type: "Bearer", expires_in: 3600, id_token: idToken });
  }
  throw new Error(`Unexpected fetch in test: ${url}`);
}

let config: ReturnType<typeof authConfig>;

beforeAll(() => {
  vi.stubEnv("AUTH_GOOGLE_ID", "google-client");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "google-secret");
  vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "microsoft-client");
  vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_SECRET", "microsoft-secret");
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  config = { ...authConfig(), secret: "test-secret-test-secret-test-secret", trustHost: true, basePath: "/api/auth", skipCSRFCheck };
  setEnvDefaults(process.env, config);
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const cookiesOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]);

/** Starts a sign-in, "logs in" at the provider with `claims`, and returns where the person ends up. */
async function signInWith(provider: "google" | "microsoft-entra-id", claims: Record<string, unknown>) {
  const start = await Auth(
    new Request(`${origin}/api/auth/signin/${provider}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ callbackUrl: "/welcome" }),
    }),
    config,
  );
  const authorize = new URL(start.headers.get("location") ?? "");
  const state = authorize.searchParams.get("state") ?? "";
  nonces.set(state, authorize.searchParams.get("nonce"));
  const issuer = provider === "google" ? "https://accounts.google.com" : "https://login.microsoftonline.com/common/v2.0";
  lastCode = { issuer, clientId: provider === "google" ? "google-client" : "microsoft-client", state };
  nextClaims = { sub: randomUUID(), ...claims };

  const back = await Auth(
    new Request(`${origin}/api/auth/callback/${provider}?${new URLSearchParams({ code: "code-1", state })}`, {
      headers: { cookie: cookiesOf(start).join("; ") },
    }),
    config,
  );
  const location = new URL(back.headers.get("location") ?? "", origin);
  // Over https the cookie is `__Secure-authjs.session-token`; an empty one is a sign-out.
  const session = cookiesOf(back).find((c) => /authjs\.session-token=./.test(c));
  return { location: location.pathname + location.search, signedIn: Boolean(session), authorize };
}

const email = () => `oauth-${randomUUID()}@firma.test`;

describe("signing in with Google", () => {
  it("signs an existing person into their account by verified email, without keeping the provider's tokens", async () => {
    const user = await makeUser("Anna");
    const result = await signInWith("google", { email: user.email.toUpperCase(), email_verified: true, name: "Anna G." });
    expect(result).toMatchObject({ location: "/welcome", signedIn: true });

    const accounts = await db.account.findMany({ where: { userId: user.id } });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ provider: "google", access_token: null, refresh_token: null, id_token: null });
    // The name they chose here stays; nobody else got an account for that email.
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe("Anna");
    expect(await db.user.count({ where: { email: { equals: user.email, mode: "insensitive" } } })).toBe(1);
  });

  it("creates an account for someone new, with no photo", async () => {
    const address = email();
    const result = await signInWith("google", { email: address, email_verified: true, name: "Neu", picture: "https://example.test/me.jpg" });
    expect(result.signedIn).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    expect(user).toMatchObject({ name: "Neu", image: null });
    await db.user.delete({ where: { id: user.id } });
  });

  it("turns away an email Google hasn't verified", async () => {
    const user = await makeUser("Ben");
    const result = await signInWith("google", { email: user.email, email_verified: false });
    expect(result).toMatchObject({ location: "/sign-in?error=EmailNotVerified", signedIn: false });
    expect(await db.account.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("signing in with Microsoft", () => {
  it("asks only for sign-in, not for Graph access, so organisations don't need an admin to approve", async () => {
    const { authorize } = await signInWith("microsoft-entra-id", { email: email(), tid: tenant, xms_edov: true });
    expect(authorize.host).toBe("login.microsoftonline.com");
    expect(authorize.searchParams.get("scope")).toBe("openid profile email");
  });

  it("links a work account when the organisation owns the email's domain", async () => {
    const user = await makeUser("Clara");
    const result = await signInWith("microsoft-entra-id", { email: user.email, tid: tenant, xms_edov: true, name: "Clara" });
    expect(result).toMatchObject({ location: "/welcome", signedIn: true });
    expect(await db.account.count({ where: { userId: user.id, provider: "microsoft-entra-id" } })).toBe(1);
  });

  it("turns away an email the organisation doesn't own, which any tenant admin could type in", async () => {
    const user = await makeUser("Dana");
    for (const claims of [{ tid: tenant }, { tid: tenant, xms_edov: false }]) {
      const result = await signInWith("microsoft-entra-id", { email: user.email, ...claims });
      expect(result).toMatchObject({ location: "/sign-in?error=EmailNotVerified", signedIn: false });
    }
    expect(await db.account.count({ where: { userId: user.id } })).toBe(0);
  });

  it("accepts personal Microsoft accounts", async () => {
    const address = email();
    const result = await signInWith("microsoft-entra-id", { email: address, tid: MICROSOFT_CONSUMER_TENANT });
    expect(result.signedIn).toBe(true);
    await db.user.delete({ where: { email: address } });
  });
});
