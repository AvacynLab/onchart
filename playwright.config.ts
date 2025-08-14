import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

config({
  path: '.env.local',
});

// Use a fixed, rarely used port during tests to avoid conflicts with any
// background dev servers that may already occupy port 3000. Both Playwright's
// readiness probe and the Next.js dev server receive this explicit value so
// they stay in sync.
const PORT = 3110;

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
// Base URL points to the server root and remains unchanged when switching
// locales. Language negotiation relies on cookies or headers rather than path
// segments, so tests navigate to `/` for all scenarios.
const baseURL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  // Ignore unit tests executed with Node's test runner so Playwright only runs
  // browser-driven suites. These node-specific tests end with `.node.test.tsx`
  // or `.node.test.ts` and would otherwise trigger React rendering errors when
  // Playwright attempts to execute them.
  testIgnore: [
    'dashboard/**/*.test.tsx',
    '**/*.node.test.tsx',
    '**/*.node.test.ts',
    // The SEC user-agent test runs with Node's built-in runner via `pnpm test`
    // and should be skipped by Playwright to avoid duplicate execution.
    '**/sec-user-agent.test.ts',
  ],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 8,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,
    // Force French locale during tests to avoid middleware redirects to `/en`.
    extraHTTPHeaders: { 'Accept-Language': 'fr' },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
  },

  /* Configure global timeout for each test */
  timeout: 240 * 1000, // 120 seconds
  expect: {
    timeout: 240 * 1000,
  },

  /* Configure projects */
  projects: [
    {
      name: 'e2e',
      // Only run high-level smoke tests suffixed with `.spec.ts` and skip the
      // upstream template's `.test.ts` suites that assume features not present
      // in this project (artifacts, chat, sessions, etc.).
      testMatch: /e2e\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'routes',
      // Route-level integration tests are opt-in; the repository currently
      // doesn't ship any `.spec.ts` files under `tests/routes`, so Playwright
      // skips this project altogether.
      testMatch: /routes\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'finance',
      testMatch: /finance\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'ai-tools',
      testMatch: /ai\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Start the Next.js development server via the standard package script so
    // Playwright tests exercise the same setup developers use locally. The
    // `env` option passes variables directly to the server process without
    // relying on shell variable expansion.
    command: 'pnpm dev',
    // The readiness probe always checks the root `/ping` route.
    url: `http://localhost:${PORT}/ping`,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        // Explicitly point Next.js to the locale configuration so the dev
        // server started for Playwright tests can resolve translations without
        // relying on plugin inference.
        // Point the dev server started for Playwright tests to the same
        // request-level i18n configuration so locale detection matches the
        // production setup.
        NEXT_INTL_CONFIG: './i18n/request.ts',
        AUTH_SECRET: 'test',
        POSTGRES_URL: '',
        PLAYWRIGHT: '1',
        PORT: String(PORT),
      },
  },
});
