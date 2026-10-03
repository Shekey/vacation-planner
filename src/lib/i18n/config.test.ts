import { describe, expect, it } from "vitest";
import { formatNumber, negotiateLocale } from "./config";
import { messagesFor } from "./index";

describe("negotiateLocale", () => {
  it("picks the first supported language by preference", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateLocale("fr-FR,fr;q=0.9,de;q=0.7,en;q=0.8")).toBe("en");
    expect(negotiateLocale("en-US,en;q=0.9")).toBe("en");
    expect(negotiateLocale("de-AT")).toBe("de");
  });
  it("falls back to English", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("fr,it;q=0.5")).toBe("en");
    expect(negotiateLocale("de;q=0")).toBe("en");
  });
});

describe("formatNumber", () => {
  it("uses a decimal comma in German", () => {
    expect(formatNumber(1.5, "de")).toBe("1,5");
    expect(formatNumber(1.5, "en")).toBe("1.5");
    expect(formatNumber(20, "de")).toBe("20");
  });
});

/** Every key in English has a German text of the same kind, and none is left empty. */
function shape(value: unknown, path: string, out: Map<string, string>) {
  if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) shape(v, `${path}.${k}`, out);
  else out.set(path, typeof value === "string" ? (value ? "string" : "empty") : typeof value);
}

describe("messages", () => {
  it("German has every English text", () => {
    const en = new Map<string, string>();
    const de = new Map<string, string>();
    shape(messagesFor("en"), "", en);
    shape(messagesFor("de"), "", de);
    expect([...de.entries()]).toEqual([...en.entries()]);
    expect([...en.values()]).not.toContain("empty");
  });
});
