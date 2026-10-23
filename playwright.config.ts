import { defineConfig, devices } from "@playwright/test";

/**
 * Browser smoke test and accessibility check (#79). CI runs it against `next start` and the CI Postgres; locally,
 * point E2E_BASE_URL at a running `next dev` and E2E_SERVER_LOG at its output, where the sign-in links are printed.
 */
const port = 3100;
const external = process.env.E2E_BASE_URL;
export const serverLog = process.env.E2E_SERVER_LOG ?? "test-results/server.log";

export default defineConfig({
  testDir: "e2e",
  // One flow that builds on itself; the accessibility pages are quick.
  workers: 1,
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: external ?? `http://localhost:${port}`, trace: "retain-on-failure", ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
  webServer: external
    ? undefined
    : {
        // Emails go to the log instead of Resend; the test reads its sign-in and invitation links there.
        command: `mkdir -p test-results && ALLOW_CONSOLE_EMAIL=1 npx next start -p ${port} > ${serverLog} 2>&1`,
        url: `http://localhost:${port}/api/health`,
        timeout: 120_000,
        reuseExistingServer: false,
      },
});
