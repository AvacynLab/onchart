import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

config({
  path: '.env.local',
});

/* Use process.env.PORT by default and fallback to port 3000 */
const PORT = process.env.PORT || 3000;

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
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
      testMatch: /e2e\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'routes',
      testMatch: /routes\/.*.test.ts/,
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
    // Launch the Next.js dev server with the minimal environment needed for
    // tests. Using the `env` option ensures variables are passed directly to
    // the server process without relying on an inline shell command.
    command: 'pnpm exec next dev',
    url: `${baseURL}/ping`,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      AUTH_SECRET: 'test',
      POSTGRES_URL: '',
      PLAYWRIGHT: '1',
      NEXT_INTL_CONFIG: path.join(process.cwd(), 'next-intl.config.js'),
    },
  },
});
