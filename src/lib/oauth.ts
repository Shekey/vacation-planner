/**
 * Sign in with Google and Microsoft (#32). Each provider turns on once its client id and secret are set
 * (AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET, AUTH_MICROSOFT_ENTRA_ID_ID/AUTH_MICROSOFT_ENTRA_ID_SECRET, the names Auth.js reads).
 * People are matched to their account by email, so the email must be one the provider has verified: otherwise anyone
 * could make a Microsoft tenant, give themselves a colleague's address and sign in as them.
 */

export const OAUTH_PROVIDERS = ["microsoft-entra-id", "google"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const ENV: Record<OAuthProvider, [string, string]> = {
  google: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
  "microsoft-entra-id": ["AUTH_MICROSOFT_ENTRA_ID_ID", "AUTH_MICROSOFT_ENTRA_ID_SECRET"],
};

/** The providers with keys set, Microsoft first: most of our customers run Microsoft 365. */
export function enabledOAuthProviders(env: Record<string, string | undefined> = process.env): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter((p) => ENV[p].every((name) => env[name]?.trim()));
}

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** Personal Microsoft accounts (outlook.com, hotmail.com) all sign in through this tenant; Microsoft owns those addresses. */
export const MICROSOFT_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

type Claims = object;

/**
 * The provider's email for the person, lowercased like the email sign-in stores it, or null when the provider doesn't
 * vouch for it.
 * - Google sets `email_verified` (always true for Gmail and Google Workspace addresses).
 * - Microsoft's `email` claim is whatever a tenant admin typed in. Only `xms_edov` (the tenant owns the email's domain,
 *   an optional claim the app registration has to ask for) or a personal Microsoft account makes it trustworthy.
 */
export function verifiedEmail(provider: string, profile: Claims): string | null {
  const claims = profile as Record<string, unknown>;
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email.includes("@")) return null;
  if (provider === "google") return claims.email_verified === true ? email : null;
  if (provider === "microsoft-entra-id") {
    const domainVerified = claims.xms_edov === true || claims.xms_edov === "1" || claims.xms_edov === 1;
    return domainVerified || claims.tid === MICROSOFT_CONSUMER_TENANT ? email : null;
  }
  return null;
}

/**
 * What we keep from the provider's profile: the id, name and email. No photo (Auth.js would fetch it from Microsoft
 * Graph and store it in the database) and nothing else.
 */
export function oauthProfile(provider: OAuthProvider, profile: Claims) {
  const claims = profile as Record<string, unknown>;
  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 100) : null;
  return {
    id: String(claims.sub),
    name,
    // An unverified email still goes through here; the sign-in callback turns the person away before it is used.
    email: verifiedEmail(provider, profile) ?? (typeof claims.email === "string" ? claims.email.trim().toLowerCase() : ""),
    image: null,
  };
}

/** We only need to know who signed in, so none of the provider's tokens are stored. */
export const keepNoTokens = () => ({});
