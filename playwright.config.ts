import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright 스모크 설정.
 * - 기본 baseURL: PLAYWRIGHT_BASE_URL env 또는 localhost:3001
 * - CI 에서는 webServer 로 Next dev 자동 기동, 로컬은 수동 기동
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
