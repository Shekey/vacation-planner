/**
 * Reads the sheets of an Excel file (.xlsx) into rows of text, so an admin can open their file directly instead of
 * saving it as CSV first. No library: an .xlsx is a zip of XML files, unzipped here with the platform's
 * DecompressionStream (browsers and Node 18+). Dates come out as 2026-11-02, numbers as Excel stores them (28.5).
 */

export type Sheet = { name: string; rows: string[][] };

// ---------- zip ----------

type Entry = { method: number; compressedSize: number; offset: number };

function readEntries(bytes: Uint8Array): Map<string, Entry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record sits in the last 22 bytes plus an optional comment of up to 64 KB.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const entries = new Map<string, Entry>();
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error("broken zip directory");
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const offset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    entries.set(name.replace(/^\//, ""), { method, compressedSize, offset });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readText(bytes: Uint8Array, entries: Map<string, Entry>, path: string): Promise<string | null> {
  const entry = entries.get(path);
  if (!entry) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const raw = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method !== 0 && entry.method !== 8) throw new Error("unsupported compression");
  return new TextDecoder().decode(entry.method === 8 ? await inflate(raw) : raw);
}

// ---------- XML bits ----------

function unescapeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[e.toLowerCase()]!;
  });
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? unescapeXml(m[1]) : null;
}

/** All text in <t> elements of a fragment, joined: a shared string can be split into formatted runs. Phonetic hints (<rPh>) are left out. */
function textOf(fragment: string): string {
  const plain = fragment.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return [...plain.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");
}

// ---------- dates ----------

/** Built-in number formats that are dates (14–22 and the Asian 27–36, 45–47 and 50–58 variants). */
const DATE_FORMAT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/** A custom format like "dd.mm.yyyy" or "[$-407]d. mmmm yy" is a date; "0.0" or "#,##0 \"Tage\"" isn't. */
export function isDateFormat(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  // Month alone ("mm") could be minutes, so a date format must show a day or a year.
  return /[dy]/i.test(bare);
}

/** Which cell styles show a date, by style index. */
function dateStyles(stylesXml: string | null): Set<number> {
  const out = new Set<number>();
  if (!stylesXml) return out;
  const custom = new Map<number, string>();
  for (const m of stylesXml.matchAll(/<numFmt\s[^>]*>/g)) custom.set(Number(attr(m[0], "numFmtId")), attr(m[0], "formatCode") ?? "");
  const xfs = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  [...xfs.matchAll(/<xf\s[^>]*?\/?>/g)].forEach((m, i) => {
    const id = Number(attr(m[0], "numFmtId") ?? 0);
    if (DATE_FORMAT_IDS.has(id) || (custom.has(id) && isDateFormat(custom.get(id)!))) out.add(i);
  });
  return out;
}

/** Excel's day number (1 = 1900-01-01, with its famous leap-year bug) as an ISO date; time of day is dropped. */
export function serialToISO(serial: number, date1904 = false): string {
  const days = Math.floor(serial) + (date1904 ? 1462 : 0);
  // Day 60 is the 29 February 1900 that never was; from day 61 on, counting from 1899-12-30 is right.
  const ms = Date.UTC(1899, 11, days < 61 ? 31 : 30) + days * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

// ---------- sheets ----------

/** "C7" → column 2 (0-based). */
function columnOf(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "").toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function readSheet(xml: string, strings: string[], dates: Set<number>, date1904: boolean): string[][] {
  const rows: string[][] = [];
  for (const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(attr(rm[1], "r")) || rows.length + 1;
    const cells: string[] = [];
    let next = 0;
    for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cm[1], "r");
      const col = ref ? columnOf(ref) : next;
      next = col + 1;
      const type = attr(cm[1], "t");
      const body = cm[2] ?? "";
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s") value = strings[Number(v)] ?? "";
      else if (type === "inlineStr") value = textOf(body);
      else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
      else if (type === "e") value = "";
      else if (type === "d") value = (v ?? "").slice(0, 10);
      else if (v !== undefined) {
        const text = unescapeXml(v);
        const n = Number(text);
        value = type !== "str" && dates.has(Number(attr(cm[1], "s") ?? 0)) && Number.isFinite(n) ? serialToISO(n, date1904) : text;
      }
      cells[col] = value.trim();
    }
    // Formatted but empty cells at the end of a row are left out.
    const filled = Array.from(cells, (c) => c ?? "");
    while (filled.length && filled[filled.length - 1] === "") filled.pop();
    rows[rowNumber - 1] = filled;
  }
  // Keep blank rows out, like a paste from Excel would.
  return Array.from(rows, (r) => r ?? []).filter((r) => r.some((c) => c !== ""));
}

/** All sheets of a workbook in tab order, hidden ones left out. Throws when the file isn't an .xlsx. */
export async function readWorkbook(data: ArrayBuffer | Uint8Array): Promise<Sheet[]> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const entries = readEntries(bytes);
  const workbook = await readText(bytes, entries, "xl/workbook.xml");
  if (!workbook) throw new Error("not an Excel workbook");
  const rels = (await readText(bytes, entries, "xl/_rels/workbook.xml.rels")) ?? "";
  const targets = new Map([...rels.matchAll(/<Relationship\s[^>]*>/g)].map((m) => [attr(m[0], "Id"), attr(m[0], "Target") ?? ""]));
  const sharedXml = (await readText(bytes, entries, "xl/sharedStrings.xml")) ?? "";
  const strings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)].map((m) => textOf(m[1] ?? ""));
  const dates = dateStyles(await readText(bytes, entries, "xl/styles.xml"));
  const date1904 = /<workbookPr\b[^>]*\sdate1904="(?:1|true)"/.test(workbook);

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
    if (["hidden", "veryHidden"].includes(attr(m[0], "state") ?? "")) continue;
    const target = targets.get(attr(m[0], "r:id")) ?? "";
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    const xml = await readText(bytes, entries, path.replace(/\/\.\//g, "/"));
    if (xml) sheets.push({ name: attr(m[0], "name") ?? "", rows: readSheet(xml, strings, dates, date1904) });
  }
  return sheets;
}

/** Rows as tab-separated text, the same as cells pasted from Excel, so the import reads them the usual way. */
export function toTabText(rows: string[][]): string {
  const cell = (c: string) => (/[\t\n"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return rows.map((r) => r.map(cell).join("\t")).join("\n");
}

/** Whether these bytes start like a zip (and so possibly an .xlsx), whatever the file is called. */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Old Excel files (.xls) start like every Office 97–2003 file; they can't be read here. */
export function looksLikeOldExcel(bytes: Uint8Array): boolean {
  return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

/** The sheet whose name fits what is being imported ("Urlaub 2026" for time off), else the first one with rows. */
export function bestSheet(sheets: Sheet[], fits: RegExp): number {
  const named = sheets.findIndex((s) => s.rows.length > 0 && fits.test(s.name));
  return named >= 0 ? named : Math.max(0, sheets.findIndex((s) => s.rows.length > 0));
}
