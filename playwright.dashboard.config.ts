import { defineConfig } from '@playwright/test';

// Minimal configuration to run dashboard component tests in isolation.
export default defineConfig({
  testDir: './tests/dashboard',
  reporter: 'line',
  projects: [
    {
      name: 'dashboard',
      testMatch: /.*\.test\.tsx?$/,
    },
  ],
});
