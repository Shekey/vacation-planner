/**
 * Reads a Google Sheets tab from its share link (#56). Only the sheet's CSV export on docs.google.com is
 * fetched, built from the id in the link, so a pasted link can't point the server anywhere else.
 */

export type SheetLink = { csvUrl: string };

export type SheetFetchError = "notSheetsLink" | "notShared" | "notFound" | "tooBig" | "timeout" | "failed";

/** Larger than any team list or year planner; a sheet this big is almost certainly the wrong one. */
export const MAX_SHEET_BYTES = 2 * 1024 * 1024;
export const SHEET_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const ID = /^[A-Za-z0-9_-]{10,200}$/;

/** The CSV export address for a Google Sheets link, or null when the text isn't one. Keeps the tab (`gid`) the link points at. */
export function sheetLink(text: string): SheetLink | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
  const gid = /(?:^|[#&?])gid=(\d+)/.exec(`${url.search}${url.hash}`)?.[1];
  const tab = gid ? `&gid=${gid}` : "";

  // "Publish to the web" links: /spreadsheets/d/e/<id>/pubhtml
  const published = /^\/spreadsheets\/d\/e\/([^/]+)/.exec(url.pathname);
  if (published) {
    if (!ID.test(published[1])) return null;
    return { csvUrl: `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=csv${tab}` };
  }
  // Share links: /spreadsheets/d/<id>/edit?usp=sharing#gid=0
  const shared = /^\/spreadsheets(?:\/u\/\d+)?\/d\/([^/]+)/.exec(url.pathname);
  if (!shared || !ID.test(shared[1])) return null;
  return { csvUrl: `https://docs.google.com/spreadsheets/d/${shared[1]}/export?format=csv${tab}` };
}

/** Google serves the export from docs.google.com and hands the file over from googleusercontent.com; nothing else is followed. */
function allowedHost(host: string): boolean {
  return host === "docs.google.com" || host.endsWith(".googleusercontent.com");
}

/** Fetches the sheet as CSV text. A sheet that isn't shared by link sends Google's sign-in page instead, which reads as "notShared". */
export async function fetchSheet(
  link: SheetLink,
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string } | { error: SheetFetchError }> {
  const signal = AbortSignal.timeout(SHEET_TIMEOUT_MS);
  let url = link.csvUrl;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetchImpl(url, { redirect: "manual", signal, headers: { accept: "text/csv" } });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return { error: "failed" };
        const target = new URL(next, url);
        if (target.hostname === "accounts.google.com") return { error: "notShared" };
        if (target.protocol !== "https:" || !allowedHost(target.hostname)) return { error: "failed" };
        url = target.toString();
        continue;
      }
      if (res.status === 401 || res.status === 403) return { error: "notShared" };
      if (res.status === 404) return { error: "notFound" };
      if (!res.ok) return { error: "failed" };
      if (/text\/html/i.test(res.headers.get("content-type") ?? "")) return { error: "notShared" };
      if (Number(res.headers.get("content-length") ?? 0) > MAX_SHEET_BYTES) return { error: "tooBig" };
      const body = await readCapped(res, MAX_SHEET_BYTES);
      if (body === null) return { error: "tooBig" };
      return { text: body };
    }
    return { error: "failed" };
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return { error: "timeout" };
    return { error: "failed" };
  }
}

/** Reads a response body up to `max` bytes; null when it is larger. */
async function readCapped(res: Response, max: number): Promise<string | null> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(all);
}
