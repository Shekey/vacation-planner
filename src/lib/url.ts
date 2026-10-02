import { headers } from "next/headers";

/** Absolute origin for links in emails, e.g. "https://vacations.example.com". */
export async function appOrigin(): Promise<string> {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
  // Set by Vercel: the project's production domain, e.g. "my-app.vercel.app".
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
