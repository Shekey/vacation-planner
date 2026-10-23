import { describe, expect, it } from "vitest";
import { MICROSOFT_CONSUMER_TENANT, enabledOAuthProviders, isOAuthProvider, oauthProfile, verifiedEmail } from "./oauth";

describe("enabledOAuthProviders", () => {
  it("turns a provider on only when both its id and secret are set", () => {
    expect(enabledOAuthProviders({})).toEqual([]);
    expect(enabledOAuthProviders({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: " " })).toEqual([]);
    expect(enabledOAuthProviders({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "s" })).toEqual(["google"]);
    expect(
      enabledOAuthProviders({ AUTH_GOOGLE_ID: "id", AUTH_GOOGLE_SECRET: "s", AUTH_MICROSOFT_ENTRA_ID_ID: "id", AUTH_MICROSOFT_ENTRA_ID_SECRET: "s" }),
    ).toEqual(["microsoft-entra-id", "google"]);
  });

  it("knows only its own provider ids", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("resend")).toBe(false);
    expect(isOAuthProvider(null)).toBe(false);
  });
});

describe("verifiedEmail", () => {
  it("takes Google's email only when Google verified it, lowercased", () => {
    expect(verifiedEmail("google", { email: "Anna@Firma.de", email_verified: true })).toBe("anna@firma.de");
    expect(verifiedEmail("google", { email: "anna@firma.de", email_verified: false })).toBeNull();
    expect(verifiedEmail("google", { email: "anna@firma.de" })).toBeNull();
  });

  it("takes Microsoft's email when the organisation owns the domain, or for a personal account", () => {
    expect(verifiedEmail("microsoft-entra-id", { email: "anna@firma.de", tid: "t", xms_edov: true })).toBe("anna@firma.de");
    expect(verifiedEmail("microsoft-entra-id", { email: "anna@firma.de", tid: "t", xms_edov: "1" })).toBe("anna@firma.de");
    expect(verifiedEmail("microsoft-entra-id", { email: "anna@outlook.de", tid: MICROSOFT_CONSUMER_TENANT })).toBe("anna@outlook.de");
    expect(verifiedEmail("microsoft-entra-id", { email: "anna@firma.de", tid: "t" })).toBeNull();
    expect(verifiedEmail("microsoft-entra-id", { email: "anna@firma.de", tid: "t", xms_edov: false })).toBeNull();
  });

  it("needs an email at all, and a provider it knows", () => {
    expect(verifiedEmail("microsoft-entra-id", { preferred_username: "anna@firma.de", xms_edov: true })).toBeNull();
    expect(verifiedEmail("github", { email: "anna@firma.de", email_verified: true })).toBeNull();
  });
});

describe("oauthProfile", () => {
  it("keeps id, name and lowercased email, never the photo", () => {
    expect(oauthProfile("google", { sub: "123", name: " Anna ", email: "Anna@Gmail.com", email_verified: true, picture: "https://x/p.jpg" })).toEqual({
      id: "123",
      name: "Anna",
      email: "anna@gmail.com",
      image: null,
    });
    expect(oauthProfile("microsoft-entra-id", { sub: "abc", email: "a@b.de" }).name).toBeNull();
  });
});
