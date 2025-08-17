import { test, expect } from '../fixtures';
import frDashboard from '../../messages/fr/dashboard.json' assert { type: 'json' };

// Stub font requests globally so tests do not reach external services.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
});

/**
 * Ensure the dashboard renders French translations without missing-message
 * fallbacks when the language cookie is set to French.
 */
test('renders French heading without missing messages', async ({ page }) => {
  await page.context().addCookies([
    { name: 'lang', value: 'fr', url: 'http://localhost:3110/' },
  ]);

  // Provide stub quotes so the tile hydrates immediately.
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

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: (frDashboard as any).prices.title }),
  ).toBeVisible();
});

/**
 * Verify that quotes display correctly when the internal API falls back to
 * Stooq or Binance. Each symbol is intercepted individually to emulate the
 * final responses from those providers without hitting real networks.
 */
test('shows prices with fallback providers', async ({ page }) => {
  await page.context().addCookies([
    { name: 'lang', value: 'fr', url: 'http://localhost:3110/' },
  ]);

  await page.route('**/api/finance/quote*', (route) => {
    const url = new URL(route.request().url());
    const symbol = url.searchParams.get('symbol');
    const map: Record<string, any> = {
      AAPL: {
        symbol: 'AAPL',
        price: 123,
        change: 1,
        changePercent: 0.8,
        marketState: 'CLOSED',
        source: 'stooq',
      },
      MSFT: {
        symbol: 'MSFT',
        price: 222,
        change: -1,
        changePercent: -0.5,
        marketState: 'CLOSED',
        source: 'stooq',
      },
      'BTC-USD': {
        symbol: 'BTC-USD',
        price: 40_000,
        change: 100,
        changePercent: 0.25,
        marketState: 'REG',
        source: 'binance',
      },
    };
    const body = map[symbol ?? ''];
    if (body) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto('/');
  // Ensure each symbol row is rendered with the stubbed prices.
  await expect(page.getByText('AAPL')).toBeVisible();
  await expect(page.getByText('MSFT')).toBeVisible();
  await expect(page.getByText('BTC-USD')).toBeVisible();
});

/**
 * Simulate a complete provider outage and ensure the tile shows the localized
 * offline state with a retry button. After switching the mock to return data,
 * the tile should recover and render prices.
 */
test('renders offline state and recovers on retry', async ({ page }) => {
  await page.context().addCookies([
    { name: 'lang', value: 'fr', url: 'http://localhost:3110/' },
  ]);

  let fail = true;
  await page.route('**/api/finance/quote*', (route) => {
    if (fail) {
      return route.fulfill({ status: 502, body: 'bad gateway' });
    }
    const url = new URL(route.request().url());
    const symbol = url.searchParams.get('symbol');
    const map: Record<string, any> = {
      AAPL: {
        symbol: 'AAPL',
        price: 123,
        change: 1,
        changePercent: 0.8,
        marketState: 'CLOSED',
      },
      MSFT: {
        symbol: 'MSFT',
        price: 222,
        change: -1,
        changePercent: -0.5,
        marketState: 'CLOSED',
      },
      'BTC-USD': {
        symbol: 'BTC-USD',
        price: 40_000,
        change: 100,
        changePercent: 0.25,
        marketState: 'REG',
      },
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(map[symbol ?? '']),
    });
  });

  await page.goto('/');
  await expect(
    page.getByText((frDashboard as any).prices.offline),
  ).toBeVisible();
  const retry = page.getByTestId('prices-retry');
  await expect(retry).toBeVisible();

  // Switch the interceptor to succeed and trigger a manual retry.
  fail = false;
  await retry.click();
  await expect(page.getByText('AAPL')).toBeVisible();
});
