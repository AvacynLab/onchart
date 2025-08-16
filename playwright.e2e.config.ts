import { defineConfig } from '@playwright/test';

// Align with the default Playwright configuration by using a dedicated port for
// end-to-end tests. Selecting a rarely used port avoids clashes with any local
// development servers that may already occupy 3000.
const PORT = Number(process.env.PORT || 3110);
const baseURL = `http://localhost:${PORT}`;

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
    baseURL,
    // Force French locale during tests to avoid middleware redirects to `/en`.
    extraHTTPHeaders: { 'Accept-Language': 'fr' },
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
    // Run the production build for deterministic behavior during end-to-end tests.
    command: `pnpm build && pnpm start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
      ...process.env,
      AUTH_SECRET: 'test',
      POSTGRES_URL: '',
      PLAYWRIGHT: '1',
      PORT: String(PORT),
    },
  },
});
