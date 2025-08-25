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

// Use a dedicated port for e2e tests to avoid conflicts with local dev
// servers. Playwright and the Next.js server both read this value so they stay
// in sync.
const PORT = Number(process.env.PORT ?? 3110) || 3110;

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
  reporter: [['line'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    // Force French locale during tests to avoid middleware redirects to `/en`.
    extraHTTPHeaders: { 'Accept-Language': 'fr' },
    // Use `data-testid` attributes for Playwright's `getByTestId` queries.
    testIdAttribute: 'data-testid',
    // Keep a trace for any failed test to aid debugging in CI runs.
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
    // Start the pre-built production server on the test port. The build is
    // executed ahead of time by the `pretest:e2e` script so Playwright only
    // needs to wait for the server to become ready.
    // Start the Next.js server. The `PORT` environment variable is injected
    // via `webServer.env` below, so passing an explicit `-p` flag here would
    // duplicate the port argument and can trigger `EADDRINUSE` errors on
    // some Node versions. Rely solely on the environment variable to keep
    // the invocation stable across platforms.
    command: 'pnpm start',
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
    // IMPORTANT: check readiness via a lightweight endpoint rather than the
    // full application HTML to keep the probe fast and reliable. Playwright
    // only accepts either `url` or `port`, so rely solely on the readiness URL
    // which implicitly conveys the port.
    url: `${baseURL}/api/ping`,
    env: {
      // Include the existing environment so secrets like AUTH_SECRET are
      // available to the Next.js server. Without spreading `process.env`,
      // Playwright would start the server with only the variables defined
      // here, leading to missing session cookies in tests.
      ...process.env,
      PORT: String(PORT),
      PLAYWRIGHT: 'True',
    },
  },
});
