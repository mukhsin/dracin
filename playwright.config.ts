import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright E2E Test Configuration for Drama Streaming App
 *
 * Tests against:
 * - Web app: http://localhost:3000
 * - API: http://localhost:3001
 *
 * Browsers: Chromium, Firefox, WebKit (Safari)
 * Features: Video recording on failure, screenshots, parallel execution
 */
export default defineConfig({
  testDir: "./e2e",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI for stability */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Capture screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "on-first-retry",

    /* Action timeout for slow operations */
    actionTimeout: 15000,

    /* Navigation timeout */
    navigationTimeout: 30000,

    /* Viewport size */
    viewport: { width: 1280, height: 720 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* Enable video playback in Chromium */
        launchOptions: {
          args: [
            "--autoplay-policy=no-user-gesture-required",
            "--disable-web-security",
          ],
        },
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        /* Firefox video settings */
        launchOptions: {
          firefoxUserPrefs: {
            "media.autoplay.default": 0,
            "media.autoplay.enabled.user-gestures-needed": false,
          },
        },
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        /* Safari video settings - critical for Range Request testing */
        launchOptions: {
          args: ["--enable-features=MediaCapabilities"],
        },
      },
      dependencies: ["setup"],
    },
    /* Test against mobile viewports */
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          args: ["--autoplay-policy=no-user-gesture-required"],
        },
      },
      dependencies: ["setup"],
    },
    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
      },
      dependencies: ["setup"],
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: [
    {
      command: "cd apps/api && bun run dev",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "cd apps/web && bun run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  /* Global timeout for test suite */
  globalTimeout: 600000,

  /* Timeout for each test */
  timeout: 60000,

  /* Output directory for test artifacts */
  outputDir: "test-results/",
});
