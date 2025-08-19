import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';

// Hold OHLC request URLs for assertions in tests.
let ohlcRequests: string[];

test.beforeEach(async ({ page }) => {
  ohlcRequests = [];
  // Stub external font requests to keep tests hermetic.
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  // Provide deterministic responses for finance and document APIs so the bento
  // dashboard can hydrate without hitting real network providers.
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
  await page.route('**/api/finance/news*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    }),
  );
  await page.route('**/api/document/query*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    }),
  );
  await page.route('**/api/finance/ohlc*', (route) => {
    ohlcRequests.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candles: [
          { time: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 1, open: 1.5, high: 2, low: 1, close: 1.8 },
        ],
      }),
    });
  });
});

test('sidebar toggling pushes grid and chat dock moves with content', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
  await expect(page.getByTestId('bento-grid')).toBeVisible();
  const content = page.locator('#bento-content');
  const input = page.locator('form input[placeholder="Ask a question"]');
  await expect(content).toBeVisible();

  const boxBefore = await content.boundingBox();
  const inputBefore = await input.boundingBox();

  await page.getByRole('button', { name: 'Toggle sidebar' }).click();
  // Allow CSS transition to apply.
  await page.waitForTimeout(300);

  const boxAfter = await content.boundingBox();
  const inputAfter = await input.boundingBox();

  expect(boxAfter?.x).toBeGreaterThan((boxBefore?.x + 250));
  const deltaContent = boxAfter?.x - boxBefore?.x;
  const deltaInput = inputAfter?.x - inputBefore?.x;
  expect(Math.abs(deltaContent - deltaInput)).toBeLessThan(5);
});

test('split and timeframe controls update charts', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
  await expect(page.getByTestId('bento-grid')).toBeVisible();
  const panes = page.locator('[data-testid="chart-pane"]');
  await expect(panes).toHaveCount(1);

  await page.getByTestId('split-group').getByRole('button', { name: '2' }).click();
  await expect(panes).toHaveCount(2);

  await page.getByTestId('split-group').getByRole('button', { name: '4' }).click();
  await expect(panes).toHaveCount(4);

  await page.getByTestId('tf-group').getByRole('button', { name: '5m' }).click();
  // Wait for debounced fetches to trigger.
  await page.waitForTimeout(300);
  expect(ohlcRequests.some((u) => u.includes('interval=5m'))).toBe(true);
});

test('sending a message fades out bento and navigates to chat', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('multimodal-input').waitFor({ state: 'visible' });
  await expect(page.getByTestId('bento-grid')).toBeVisible();
  const input = page.locator('form input[placeholder="Ask a question"]');
  await input.fill('Why is grass green?');
  await input.press('Enter');

  const content = page.locator('#bento-content');
  await expect(content).toHaveClass(/fading-out/);

  await page.waitForURL(/\/chat\//);
  const chatPage = new ChatPage(page);
  await chatPage.isGenerationComplete();
  const assistant = await chatPage.getRecentAssistantMessage();
  expect(assistant.content).toContain("It's just green duh!");
});
