import { test, expect } from '@playwright/test';

// Ensure the global disclaimer is visible on the homepage.
test('homepage displays data delay disclaimer', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByText('Données gratuites, peut comporter un décalage.')
  ).toBeVisible();
});
