import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { serverLog } from "../playwright.config";

/**
 * The flow every team goes through, in a real browser (#79): sign in with an email link, create a workspace, invite
 * someone, they request time off, the admin approves, they cancel and undo it. Then axe (WCAG 2.2 AA) on the main
 * pages at phone width, in English and German, light and dark.
 */

const run = Date.now().toString(36);
const adminEmail = `ada-${run}@e2e.test`;
const memberEmail = `ben-${run}@e2e.test`;
const teamName = `E2E team ${run}`;

/** A Monday to Wednesday next March, inside the booking window whenever this runs. */
const nextYear = new Date().getFullYear() + 1;
const monday = (() => {
  const d = new Date(Date.UTC(nextYear, 2, 1));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d;
})();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const start = iso(monday);
const end = iso(new Date(monday.getTime() + 2 * 86_400_000));

/** The newest link of this kind printed for this address since `after` (a log length), waiting for it to appear. */
async function linkFromLog(pattern: (log: string) => string | undefined, after: number): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const found = pattern(readFileSync(serverLog, "utf8").slice(after));
    if (found) return found;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("link not found in the server log");
}
const logLength = () => readFileSync(serverLog, "utf8").length;

const magicLink = (email: string) => (log: string) =>
  [...log.matchAll(/\[auth\] Magic link for (\S+):\n(\S+)/g)].filter((m) => m[1] === email).at(-1)?.[2];
const invitationLink = (email: string) => (log: string) =>
  [...log.matchAll(/\[email\] To: (\S+)\n[\s\S]*?(http\S*\/invite\/[\w-]+)/g)].filter((m) => m[1] === email).at(-1)?.[2];

/** Signs in through the email link on the page it opens. */
async function signIn(page: Page, email: string) {
  if (!page.url().includes("/sign-in")) await page.goto("/sign-in");
  const before = logLength();
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await page.goto(await linkFromLog(magicLink(email), before));
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A new account is asked for its name once. */
async function giveName(page: Page, name: string) {
  await page.waitForURL(/\/account\?next=/);
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save" }).click();
}

async function english(browser: Browser) {
  const context = await browser.newContext({ locale: "en-GB", viewport: { width: 390, height: 844 } });
  return context.newPage();
}

let slug = "";

test.describe.serial("a team's first week", () => {
  let admin: Page;
  let member: Page;

  test.beforeAll(async ({ browser }) => {
    admin = await english(browser);
    member = await english(browser);
  });

  test("the admin signs in and creates a workspace with approvals", async () => {
    await signIn(admin, adminEmail);
    await giveName(admin, "Ada Admin");
    await admin.goto("/workspaces/new");
    await admin.locator('input[name="name"]').fill(teamName);
    await admin.locator('button:not([type="button"])', { hasText: /create|start/i }).last().click();
    await admin.waitForURL(/\/w\/[^/]+$/);
    slug = new URL(admin.url()).pathname.split("/")[2];

    await admin.goto(`/w/${slug}/settings`);
    // The switch draws over its checkbox (and the bottom bar can cover it at phone width), so use it like a keyboard user.
    const approvals = admin.getByLabel("Require approval");
    await approvals.focus();
    await admin.keyboard.press("Space");
    await expect(approvals).toBeChecked();
    await admin.getByRole("button", { name: "Save changes" }).first().click();
    await expect(admin.getByRole("status").filter({ hasText: /saved/i }).first()).toBeVisible();
  });

  test("the admin invites someone, who joins", async () => {
    await admin.goto(`/w/${slug}/members`);
    const before = logLength();
    await admin.getByLabel("Email addresses to invite").fill(memberEmail);
    await admin.getByRole("button", { name: "Send invites" }).click();
    const invite = await linkFromLog(invitationLink(memberEmail), before);

    // Signing in from the invitation comes back to it.
    await member.goto(invite);
    await signIn(member, memberEmail);
    await member.getByRole("button", { name: "Accept invitation" }).click();
    await giveName(member, "Ben Member");
    await member.waitForURL(new RegExp(`/w/${slug}`));
  });

  test("they request time off and the admin approves it", async () => {
    await member.goto(`/w/${slug}/book`);
    await member.getByLabel("From", { exact: true }).fill(start);
    await member.getByLabel("To", { exact: true }).fill(end);
    await member.getByRole("button", { name: "Request time off" }).click();
    await member.waitForURL(`**/w/${slug}/me`);
    await expect(member.getByText("Pending").first()).toBeVisible();

    await admin.goto(`/w/${slug}/approvals`);
    await expect(admin.getByText("Ben Member")).toBeVisible();
    await admin.getByRole("button", { name: "Approve" }).click();
    await expect(admin.getByText("Ben Member")).toHaveCount(0);

    await member.reload();
    await expect(member.getByText("Approved").first()).toBeVisible();
  });

  test("they cancel it and undo that", async () => {
    member.once("dialog", (d) => d.accept());
    await member.getByRole("button", { name: "Cancel", exact: true }).first().click();
    const undo = member.getByRole("button", { name: "Undo cancel" }).first();
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(member.getByRole("button", { name: "Undo cancel" })).toHaveCount(0);
    await expect(member.getByText("Approved").first()).toBeVisible();
  });

  test.afterAll(async () => {
    await admin.context().storageState({ path: "test-results/admin.json" });
  });
});

const pages = ["", "/calendar", "/book", "/me", "/approvals", "/members", "/leave-types"];
const looks = [
  { lang: "en", scheme: "light" },
  { lang: "de", scheme: "dark" },
] as const;

test.describe("accessibility (WCAG 2.2 AA, 390 px)", () => {
  for (const look of looks) {
    test(`signed out, ${look.lang}, ${look.scheme}`, async ({ browser }) => {
      // Reduced motion, so scroll-in animations are finished when axe measures contrast.
      const context = await browser.newContext({ locale: look.lang, colorScheme: look.scheme, reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      for (const path of ["/", "/sign-in", "/impressum"]) {
        await page.goto(`${path}?lang=${look.lang}`);
        await expect(page.locator("html")).toHaveAttribute("lang", look.lang);
        await expectNoViolations(page, path);
      }
      await context.close();
    });

    test(`signed in, ${look.lang}, ${look.scheme}`, async ({ browser }) => {
      test.skip(!slug, "needs the workspace from the flow above");
      const context = await browser.newContext({
        storageState: "test-results/admin.json",
        locale: look.lang,
        colorScheme: look.scheme,
        reducedMotion: "reduce",
        viewport: { width: 390, height: 844 },
      });
      // The language cookie, as the EN/DE switch sets it.
      await context.addCookies([{ name: "lang", value: look.lang, url: test.info().project.use.baseURL! }]);
      const page = await context.newPage();
      for (const path of pages) {
        await page.goto(`/w/${slug}${path}`);
        await expect(page.locator("html")).toHaveAttribute("lang", look.lang);
        await expectNoViolations(page, path || "/w/[slug]");
      }
      await context.close();
    });
  }
});

async function expectNoViolations(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary, `axe on ${label}`).toEqual([]);
}
