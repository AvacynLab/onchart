import { defineConfig } from '@playwright/test';
import path from 'node:path';

/**
 * Lightweight Playwright configuration used for end-to-end suites. Unlike the
 * default config, this file explicitly starts the Next.js development server so
 * browser tests can interact with the application. Tests are limited to files
 * ending in `.spec.ts` within the `tests/e2e` directory.
 */
export default defineConfig({
  testDir: './tests',
  reporter: 'line',
  use: {
    /**
     * Base URL so tests can navigate with relative paths such as `/api/auth/guest`.
     */
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
    },
  ],
  /**
   * Launch the dev server before running the tests. The middleware exposes a
   * `/ping` endpoint that returns 200 once the server is ready, allowing
   * Playwright to wait for a healthy instance.
   */
  webServer: {
    // Inline environment variables so the dev server can resolve translations
    // and run without external services during the tests. Using `bash -c`
    // avoids cross-platform inconsistencies when setting multiple variables.
    command: `bash -c "AUTH_SECRET=test POSTGRES_URL= PLAYWRIGHT=1 NEXT_INTL_CONFIG=${path.resolve(
      process.cwd(),
      'next-intl.config.js',
    )} pnpm exec next dev"`,
    url: 'http://localhost:3000/ping',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
