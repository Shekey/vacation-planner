import { describe, expect, it } from "vitest";
import { fetchSheet, MAX_SHEET_BYTES, sheetLink } from "./google-sheets";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

describe("sheetLink", () => {
  it("turns a share link into the CSV export of the same tab", () => {
    expect(sheetLink(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing#gid=123`)).toEqual({
      csvUrl: `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv&gid=123`,
    });
    expect(sheetLink(`  https://docs.google.com/spreadsheets/u/1/d/${ID}/edit  `)?.csvUrl).toBe(
      `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv`,
    );
    expect(sheetLink(`https://docs.google.com/spreadsheets/d/${ID}/edit?gid=7#gid=7`)?.csvUrl).toContain("&gid=7");
  });

  it("reads published links", () => {
    expect(sheetLink(`https://docs.google.com/spreadsheets/d/e/2PACX-${ID}/pubhtml?gid=0`)?.csvUrl).toBe(
      `https://docs.google.com/spreadsheets/d/e/2PACX-${ID}/pub?output=csv&gid=0`,
    );
  });

  it("refuses anything that isn't a Google Sheets link", () => {
    for (const text of [
      "",
      "hello",
      `http://docs.google.com/spreadsheets/d/${ID}/edit`,
      `https://docs.google.com.evil.example/spreadsheets/d/${ID}/edit`,
      `https://docs.google.com/document/d/${ID}/edit`,
      "https://docs.google.com/spreadsheets/d/../../etc/edit",
      `https://drive.google.com/file/d/${ID}/view`,
    ]) {
      expect(sheetLink(text), text).toBeNull();
    }
  });
});

const link = { csvUrl: `https://docs.google.com/spreadsheets/d/${ID}/export?format=csv` };

function respond(status: number, body = "", headers: Record<string, string> = {}) {
  return new Response(status >= 300 && status < 400 ? null : body, { status, headers });
}

describe("fetchSheet", () => {
  it("follows Google's hand-over to googleusercontent.com", async () => {
    const seen: string[] = [];
    const result = await fetchSheet(link, async (url) => {
      seen.push(String(url));
      return seen.length === 1
        ? respond(307, "", { location: "https://doc-0s-1a-sheets.googleusercontent.com/export/abc" })
        : respond(200, "Name;Email\nAnna;anna@example.com", { "content-type": "text/csv" });
    });
    expect(result).toEqual({ text: "Name;Email\nAnna;anna@example.com" });
    expect(seen).toHaveLength(2);
  });

  it("says the sheet isn't shared when Google asks to sign in", async () => {
    expect(await fetchSheet(link, async () => respond(302, "", { location: "https://accounts.google.com/ServiceLogin?x" }))).toEqual({
      error: "notShared",
    });
    expect(await fetchSheet(link, async () => respond(200, "<html>", { "content-type": "text/html; charset=utf-8" }))).toEqual({
      error: "notShared",
    });
    expect(await fetchSheet(link, async () => respond(401))).toEqual({ error: "notShared" });
  });

  it("never follows a redirect to another host", async () => {
    expect(await fetchSheet(link, async () => respond(302, "", { location: "https://169.254.169.254/latest" }))).toEqual({ error: "failed" });
  });

  it("stops at the size limit and reports missing sheets", async () => {
    const big = "x".repeat(MAX_SHEET_BYTES + 1);
    expect(await fetchSheet(link, async () => respond(200, big, { "content-type": "text/csv" }))).toEqual({ error: "tooBig" });
    expect(await fetchSheet(link, async () => respond(404))).toEqual({ error: "notFound" });
  });

  it("reports a timeout", async () => {
    const result = await fetchSheet(link, async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    expect(result).toEqual({ error: "timeout" });
  });
});
