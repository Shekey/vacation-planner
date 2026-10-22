import { vi } from "vitest";
import { messagesFor } from "@/lib/i18n";

// Database tests run outside a request: English text, and no email or chat leaves the process.
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => "en",
  getMessages: async () => messagesFor("en"),
  requestLocaleOr: async () => "en",
  localeOfEmail: async () => null,
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/notify", () => ({ postToChannels: vi.fn(async () => {}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => null }));

// The normal plans and trial apply, not the free beta.
process.env.NEXT_PUBLIC_ENABLE_BETA_MODE = "false";
vi.mock("@/lib/url", () => ({ appOrigin: async () => "https://app.test" }));

// Fixed "today", so tests can book in 2030 and stay inside the three-year booking window whenever they run.
// Only Date is faked: timers and the database connection keep running normally.
vi.useFakeTimers({ toFake: ["Date"], now: new Date("2027-06-01T10:00:00Z") });
