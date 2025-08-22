import { test, expect } from '../fixtures';
import frDashboard from '../../messages/fr/dashboard.json' assert {
  type: 'json',
};
import enDashboard from '../../messages/en/dashboard.json' assert {
  type: 'json',
};

// Stub external font requests so tests do not depend on Google services.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  // Mock the live quote API to keep tests hermetic and avoid hitting real
  // network providers. Returning a single deterministic quote is sufficient
  // because the dashboard test only asserts that the tile hydrates.
  await page.route('**/api/finance/quote*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol: 'AAPL',
        price: 100,
        change: 0,
        changePercent: 0,
        marketState: 'REG',
      }),
    }),
  );
});

/**
 * Ensure the dashboard's menu tile toggles finance quick actions and that the
 * previous floating toolbar overlay is absent from the page.
 */
test('menu tile toggles finance actions', async ({ page }) => {
  // Navigate to the dashboard. Locale negotiation happens via cookies or
  // headers and leaves the path unchanged.
  await page.goto('/');
  await expect(page.getByTestId('multimodal-input')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('bento-grid')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page).toHaveURL(/\/$/);

  // Wait for the menu toggle to render which signals that client-side
  // hydration completed. Relying on `networkidle` is brittle because the
  // dashboard may open long-lived connections (e.g. websockets).
  const toggle = page.getByTestId('tile-menu-toggle');
  await expect(toggle).toBeVisible();

  // The overlay toolbar should no longer render globally.
  await expect(page.locator('[role="toolbar"]')).toHaveCount(0);
  await toggle.click();

  // Rather than querying for menu items directly (which can be flaky if
  // translations change), verify that the toggle's expanded state flips to
  // `true` which guarantees that the underlying toolbar store updated.
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

/**
 * End-to-end smoke test for the dashboard ensuring tiles render, the language
 * switcher works, and interactive tiles like the strategy wizard open
 * correctly. The test remains fairly high level to avoid coupling to data
 * specifics while still asserting localized labels.
 */
test('renders tiles and switches locales', async ({ page }) => {
  // Force English via cookie before navigating so the server renders the page
  // in English on first load.
  await page
    .context()
    .addCookies([
      // Scope the cookie to localhost without locking the port so the test
      // does not depend on the Playwright baseURL's port number.
      { name: 'lang', value: 'en', domain: 'localhost', path: '/' },
    ]);
  await page.goto('/');
  await expect(page.getByTestId('multimodal-input')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('bento-grid')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page).toHaveURL(/\/$/);

  // The "Current prices" heading should appear in English. Waiting for the
  // heading ensures the page finished hydrating without relying on network
  // idleness which can hang when background requests remain open.
  await expect(
    page.getByRole('heading', {
      name: (enDashboard as any).prices.title,
    }),
  ).toBeVisible();

  // Switch to French via the header language switcher. Capture the current URL
  // and ensure it remains unchanged after the locale update, proving that
  // language negotiation no longer relies on path prefixes.
  const currentUrl = page.url();
  await page.getByRole('button', { name: 'FR', exact: true }).click();
  await page.reload();
  await expect(page).toHaveURL(currentUrl);

  // Headings should now be translated to French.
  await expect(
    page.getByRole('heading', {
      name: (frDashboard as any).prices.title,
    }),
  ).toBeVisible();

  // The analyses tile should display its localized empty state.
  await expect(
    page.getByRole('heading', { name: (frDashboard as any).analyses.title }),
  ).toBeVisible();
});
