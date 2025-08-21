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

// Use the conventional Next.js development port so Playwright interacts with
// the application exactly as local users would. Both the readiness probe and
// the Next.js server receive this explicit value to stay in sync.
const PORT = Number(process.env.PORT) || 3000;

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
    trace: 'on-first-retry',
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
    // Build the production bundle and start Next.js on the test port. Using a
    // single command ensures Playwright waits for the server to become ready
    // before executing tests and avoids double-build scenarios.
    command: `rm -rf .next && PLAYWRIGHT=True pnpm build && PLAYWRIGHT=True pnpm start -p ${PORT}`,
    url: `${baseURL}/ping`,
    reuseExistingServer: !process.env.CI,
    env: {
      PLAYWRIGHT: 'True',
      OTEL_SDK_DISABLED: '1',
      NEXTAUTH_URL: baseURL,
      AUTH_TRUST_HOST: '1',
      AUTH_SECRET: 'test-secret',
      PORT: String(PORT),
      NEXT_INTL_CONFIG: './next-intl.config.ts',
    },
    // Allow generous time for the initial production build on resource-constrained
    // CI runners. The full Next.js compile can occasionally exceed three
    // minutes, so extend the readiness timeout to ten minutes to avoid
    // premature failures before tests even begin.
    timeout: 600_000,
  },
});
