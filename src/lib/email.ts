import { messagesFor } from "@/lib/i18n";
import { requestLocaleOr } from "@/lib/i18n/server";

type Email = { to: string | string[]; subject: string; text: string };

export type SendResult = { ok: true } | { ok: false; error: string };

const TEST_SENDER = "Vacation Planner <onboarding@resend.dev>";

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
  const recipients = Array.isArray(to) ? to : [to];
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
    });
    if (res.ok) return { ok: true };
    const body = await res.text();
    // Notifications must never break the action that triggered them, so callers decide what to show.
    console.error("[email] Resend error", res.status, body, usingTestSender() ? "(EMAIL_FROM is Resend's test sender)" : "");
    return { ok: false, error: resendMessage(body) ?? messagesFor(await requestLocaleOr()).errors.resendStatus(res.status) };
  } catch (err) {
    console.error("[email] Resend request failed", err);
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
