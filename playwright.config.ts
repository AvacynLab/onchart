import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import os from 'node:os';

config({
  path: '.env.local',
});

// Determine an appropriate worker count: prefer four parallel workers when the
// host machine provides sufficient CPU cores, but fall back to two to avoid
// overcommitting more limited environments (e.g. CI runners with only two
// vCPUs).
const WORKERS = os.cpus().length >= 4 ? 4 : 2;

// Use a fixed, rarely used port during tests to avoid conflicts with any
// background dev servers that may already occupy port 3000. Both Playwright's
// readiness probe and the Next.js server receive this explicit value so they
// stay in sync.
const PORT = Number(process.env.PORT || 3110);

// Base URL points to the server root and remains unchanged when switching
// locales. Language negotiation relies on cookies or headers rather than path
// segments, so tests navigate to `/` for all scenarios.
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  // Restrict Playwright to browser-driven end-to-end tests. Node-only unit
  // tests live outside this directory and are executed separately via
  // `pnpm test:unit`, preventing React from attempting to render Playwright
  // objects such as locators.
  testDir: './tests/e2e',
  // Some helper suites are explicitly marked with the `.node.test.ts[x]`
  // suffix and rely on Node's built-in runner. Ignore them here so the e2e
  // configuration doesn't attempt to execute incompatible environments.
  testIgnore: ['**/*.node.test.ts', '**/*.node.test.tsx'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Run with up to four workers when available, otherwise use two. */
  workers: WORKERS,
  // Emit progress to the terminal via the lightweight line reporter while
  // still generating an HTML report for deeper debugging when a test fails.
  // Using the array form allows multiple reporters to run in parallel.
  // Generate an HTML report for failed tests but never open a web server,
  // allowing CI runs to exit automatically.
  reporter: [ ['line'], ['html', { open: 'never' }] ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    // Force French locale during tests to avoid middleware redirects to `/en`.
    extraHTTPHeaders: { 'Accept-Language': 'fr' },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure global timeout for each test */
  timeout: 240 * 1000, // 120 seconds
  expect: {
    timeout: 240 * 1000,
  },

  /* Configure projects */
  /* Configure projects: run all tests in a single Chromium project so both
     `.spec.ts` and `.test.ts` files execute. Additional browsers can be added
     later if needed. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Rebuild with PLAYWRIGHT=True immediately before starting to guarantee
    // the server uses a PPR-off artefact even if previous builds exist.
    command:
      `rm -rf .next && PLAYWRIGHT=True pnpm build && PLAYWRIGHT=True pnpm start -p ${PORT}`,
    port: PORT,
    // Always launch a fresh server to guarantee the prebuilt output is used
    // and that no lingering process holds onto the test port.
    reuseExistingServer: false,
    env: { PLAYWRIGHT: 'True', OTEL_SDK_DISABLED: '1' },
    // Allow extra time for the server to boot in constrained CI environments.
    timeout: 300_000,
  },
});
