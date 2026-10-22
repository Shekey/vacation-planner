import * as Sentry from "@sentry/nextjs";
import { BRAND } from "@/lib/brand";
import { messagesFor } from "@/lib/i18n";
import { requestLocaleOr } from "@/lib/i18n/server";
import { isPlaceholderEmail } from "@/lib/no-email";

type Email = { to: string | string[]; subject: string; text: string };

export type SendResult = { ok: true } | { ok: false; error: string };

const SEND_TIMEOUT_MS = 8000;

const TEST_SENDER = `${BRAND.name} <onboarding@resend.dev>`;

/** The From address for every email, including Auth.js magic links. */
export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || TEST_SENDER;
}

/**
 * True when real emails go out from Resend's shared test sender. Resend then only delivers
 * to the Resend account owner; everyone else is rejected until a domain is verified.
 */
export function usingTestSender(): boolean {
  return Boolean(process.env.AUTH_RESEND_KEY) && /@resend\.dev>?$/i.test(emailFrom());
}

/** Sends through Resend when AUTH_RESEND_KEY is set; otherwise logs to the console (development). */
export async function sendEmail({ to, subject, text }: Email): Promise<SendResult> {
  // Sample people and people without email have .invalid placeholder addresses; nothing is ever sent to them.
  const recipients = (Array.isArray(to) ? to : [to]).filter((r) => !isPlaceholderEmail(r));
  if (recipients.length === 0) return { ok: true };

  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.log(`\n[email] To: ${recipients.join(", ")}\nSubject: ${subject}\n\n${text}\n`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom(), to: recipients, subject, text }),
      // A stalled Resend must not hang the request until the platform kills it.
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    const body = await res.text();
    // Notifications must never break the action that triggered them, so callers decide what to show.
    console.error("[email] Resend error", res.status, body, usingTestSender() ? "(EMAIL_FROM is Resend's test sender)" : "");
    // Only the status: the operator learns mail stopped arriving, without anyone's address in Sentry.
    Sentry.captureMessage("email not sent", { level: "warning", tags: { delivery: "email", status: String(res.status) } });
    return { ok: false, error: resendMessage(body) ?? messagesFor(await requestLocaleOr()).errors.resendStatus(res.status) };
  } catch (err) {
    console.error("[email] Resend request failed", err);
    Sentry.captureMessage("email not sent", { level: "warning", tags: { delivery: "email", status: "network" } });
    return { ok: false, error: messagesFor(await requestLocaleOr()).errors.resendUnreachable };
  }
}

function resendMessage(body: string): string | null {
  try {
    const message = (JSON.parse(body) as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}
