/**
 * Error reports leave our servers, and errors in this app can carry personal data: an email in a message, an invite
 * token in a URL, a request body with names. Everything sent to Sentry passes through here first. Pure, so it is tested.
 */

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;

/** Emails become "[email]", credentials in URLs become placeholders. */
export function scrubText(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(/\/invite\/[^\s/?#"'<>]+/g, "/invite/[token]")
    .replace(/\/api\/calendar\/[^\s/?#"'<>]+/g, "/api/calendar/[token]")
    .replace(/([?&](?:token|callbackUrl|email|code)=)[^&\s"'<>#]*/gi, "$1[redacted]");
}

type Json = Record<string, unknown>;

const SAFE_HEADERS = new Set(["user-agent", "accept-language"]);

function scrubStrings(value: unknown): unknown {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubStrings);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Json).map(([k, v]) => [k, scrubStrings(v)]));
  return value;
}

/**
 * Removes who the visitor is (user, cookies, IP, headers, bodies, query strings) and scrubs every text that remains.
 * Works on Sentry events of any kind (errors, transactions); unknown shapes pass through untouched.
 */
export function scrubEvent<T extends object>(event: T): T {
  const e = event as Json;
  delete e.user;
  delete e.server_name;

  const request = e.request as Json | undefined;
  if (request) {
    delete request.cookies;
    delete request.data;
    delete request.query_string;
    delete request.env;
    if (typeof request.url === "string") request.url = scrubText(request.url).replace(/\?.*$/, "");
    if (request.headers && typeof request.headers === "object") {
      request.headers = Object.fromEntries(Object.entries(request.headers as Json).filter(([k]) => SAFE_HEADERS.has(k.toLowerCase())));
    }
  }

  if (typeof e.message === "string") e.message = scrubText(e.message);
  const exceptions = (e.exception as { values?: Json[] } | undefined)?.values;
  for (const ex of exceptions ?? []) {
    if (typeof ex.value === "string") ex.value = scrubText(ex.value);
    const frames = (ex.stacktrace as { frames?: Json[] } | undefined)?.frames;
    for (const frame of frames ?? []) delete frame.vars; // local variables can hold anything
  }
  if (Array.isArray(e.breadcrumbs)) e.breadcrumbs = e.breadcrumbs.map(scrubStrings);
  if (e.extra) e.extra = scrubStrings(e.extra);
  if (e.contexts) {
    const contexts = e.contexts as Json;
    delete contexts.culture;
    e.contexts = scrubStrings(contexts);
  }
  if (typeof e.transaction === "string") e.transaction = scrubText(e.transaction);
  return event;
}
