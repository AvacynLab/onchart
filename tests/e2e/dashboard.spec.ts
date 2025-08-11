import { test, expect } from '@playwright/test';
import frFinance from '../../messages/fr/finance.json' assert { type: 'json' };
import frDashboard from '../../messages/fr/dashboard.json' assert { type: 'json' };
import enDashboard from '../../messages/en/dashboard.json' assert { type: 'json' };
import enFinance from '../../messages/en/finance.json' assert { type: 'json' };

// Stub external font requests so tests do not depend on Google services.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
});

/**
 * Ensure the dashboard's menu tile toggles finance quick actions and that the
 * previous floating toolbar overlay is absent from the page.
 */
test('menu tile toggles finance actions', async ({ page }) => {
  // Navigate directly to the French dashboard; authentication is optional for
  // this smoke test because the menu tile is public.
  await page.goto('/fr');
  await expect(page).toHaveURL(/\/fr$/);

  // The overlay toolbar should no longer render globally.
  await expect(page.locator('[role="toolbar"]')).toHaveCount(0);

  // The menu tile exposes its toggle button with a localized label.
  const toggle = page.getByRole('button', {
    name: (frDashboard as any).menu.toggle,
  });
  await toggle.click();

  const firstLabel = (frFinance as any).toolbar.showAAPL.label;
  await expect(page.getByRole('menuitem', { name: firstLabel })).toBeVisible();
});

/**
 * End-to-end smoke test for the dashboard ensuring tiles render, the language
 * switcher works, and interactive tiles like the strategy wizard open
 * correctly. The test remains fairly high level to avoid coupling to data
 * specifics while still asserting localized labels.
 */
test('renders tiles and switches locales', async ({ page }) => {
  // Start from the default French dashboard.
  await page.goto('/fr');
  await expect(page).toHaveURL(/\/fr$/);

  // The "Current prices" heading should appear in French.
  await expect(
    page.getByRole('heading', {
      name: (frDashboard as any).prices.title,
    }),
  ).toBeVisible();

  // Switch to English via the header language switcher.
  await page.getByRole('link', { name: 'EN' }).click();
  await expect(page).toHaveURL(/\/en$/);

  // Headings should now be translated to English.
  await expect(
    page.getByRole('heading', {
      name: (enDashboard as any).prices.title,
    }),
  ).toBeVisible();

  // Open the strategy wizard through the tile's create button.
  await page
    .getByRole('button', { name: (enDashboard as any).strategies.create })
    .click();
  await expect(
    page.getByLabel((enFinance as any).wizard.horizon),
  ).toBeVisible();

  // The analyses tile should display its localized empty state.
  await expect(
    page.getByText((enDashboard as any).analyses.empty),
  ).toBeVisible();
});
