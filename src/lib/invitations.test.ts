import { describe, expect, it } from "vitest";
import { hashToken, parseEmailList } from "./invitations";

describe("parseEmailList", () => {
  it("splits on commas, spaces and newlines, dedupes and lowercases", () => {
    expect(parseEmailList("A@x.com, b@y.com\nb@Y.com; bad")).toEqual({
      valid: ["a@x.com", "b@y.com"],
      invalid: ["bad"],
    });
  });
});

describe("hashToken", () => {
  it("is stable and does not echo the token", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toContain("abc");
  });
});
