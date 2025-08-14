import { test, expect } from '../fixtures';
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
  // Force the default locale to French for each test run so navigating to `/`
  // immediately renders French content.
  await page.context().addCookies([
    { name: 'NEXT_LOCALE', value: 'fr', domain: 'localhost', path: '/' },
  ]);
});

/**
 * Ensure the dashboard's menu tile toggles finance quick actions and that the
 * previous floating toolbar overlay is absent from the page.
 */
test('menu tile toggles finance actions', async ({ page }) => {
  // Navigate to the dashboard. Locale negotiation happens via cookies or
  // headers and leaves the path unchanged.
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);

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
  // Start from the default French dashboard. The root `/` route resolves to
  // French without an explicit locale prefix.
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);

  // The "Current prices" heading should appear in French.
  await expect(
    page.getByRole('heading', {
      name: (frDashboard as any).prices.title,
    }),
  ).toBeVisible();

  // Switch to English via the header language switcher. The URL gains the
  // `/en` prefix since non-default locales are prefixed when using
  // `localePrefix: 'as-needed'`.
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
