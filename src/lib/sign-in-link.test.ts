import { describe, expect, it } from "vitest";
import { callbackFields, confirmPageUrl } from "./sign-in-link";

describe("confirmPageUrl", () => {
  it("points the email at the confirm page and keeps the token, address and destination", () => {
    const url = new URL(
      confirmPageUrl("https://app.example.com/api/auth/callback/resend?callbackUrl=https%3A%2F%2Fapp.example.com%2Fw%2Fteam&token=abc&email=a%40b.de"),
    );
    expect(url.origin).toBe("https://app.example.com");
    expect(url.pathname).toBe("/sign-in/confirm");
    expect(url.searchParams.get("token")).toBe("abc");
    expect(url.searchParams.get("email")).toBe("a@b.de");
    expect(url.searchParams.get("callbackUrl")).toBe("https://app.example.com/w/team");
  });
});

describe("callbackFields", () => {
  it("passes on only the token, address and destination", () => {
    expect(callbackFields({ token: "abc", email: "a@b.de", callbackUrl: "/w/team", extra: "x" })).toEqual({
      token: "abc",
      email: "a@b.de",
      callbackUrl: "/w/team",
    });
  });

  it("refuses a link without a token or address, or with repeated values", () => {
    expect(callbackFields({ email: "a@b.de" })).toBeNull();
    expect(callbackFields({ token: "abc" })).toBeNull();
    expect(callbackFields({ token: ["a", "b"], email: "a@b.de" })).toBeNull();
  });
});
