import { defineConfig } from '@playwright/test';

// Minimal Playwright configuration for running node-based e2e tests
// without starting the Next.js dev server.
export default defineConfig({
  testDir: './tests',
  reporter: 'line',
  projects: [
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
    },
  ],
});
