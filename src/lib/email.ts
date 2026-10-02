type Email = { to: string | string[]; subject: string; text: string };

/** Sends through Resend when AUTH_RESEND_KEY is set; otherwise logs to the console (development). */
export async function sendEmail({ to, subject, text }: Email): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return;

  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.log(`\n[email] To: ${recipients.join(", ")}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Vacation Planner <onboarding@resend.dev>",
      to: recipients,
      subject,
      text,
    }),
  });
  // Notifications must never break the action that triggered them.
  if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
}
