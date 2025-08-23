import { test, expect } from '../fixtures';
import { ChatPage } from '../pages/chat';

// Sample document id used across routes.
const DOC_ID = '1';

test.beforeEach(async ({ page }) => {
  // Stub external fonts.
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  // Finance and document API stubs.
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
  // Return a single analysis document in list.
  await page.route('**/api/document/query*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: DOC_ID,
            title: 'Sample analysis',
            kind: 'analysis',
            createdAt: new Date(0).toISOString(),
          },
        ],
        total: 1,
      }),
    }),
  );
  // Return full chart artifact when document is requested.
  await page.route(`**/api/document?id=${DOC_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: DOC_ID,
          title: 'Sample analysis',
          kind: 'analysis',
          content: JSON.stringify({
            type: 'chart',
            symbol: 'AAPL',
            timeframe: '1m',
          }),
          createdAt: new Date(0).toISOString(),
        },
      ]),
    }),
  );
  await page.route('**/api/finance/ohlc*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candles: [
          { time: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
          { time: 60, open: 1.5, high: 2, low: 1, close: 1.8 },
        ],
      }),
    }),
  );
});

test('chart artifact click opens chat with anchored input', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('multimodal-input')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('bento-grid')).toBeVisible();
  // Open the artifact from the analyses list.
  await page
    .getByTestId('analyses-card')
    .getByRole('button', { name: 'Sample analysis' })
    .click();
  // Select a candle on the rendered chart.
  const canvas = page.locator('[data-testid="artifact-view"] canvas');
  await canvas.click({ position: { x: 50, y: 10 } });
  await page.getByRole('button', { name: 'Ouvrir dans le chat' }).click();
  await page.waitForURL(/\/chat\?anchor=/);

  const chatPage = new ChatPage(page);
  await expect(chatPage.multimodalInput).toHaveValue(/AAPL 1m @/);
  await chatPage.multimodalInput.press('Enter');
  await chatPage.isGenerationComplete();
  const assistant = await chatPage.getRecentAssistantMessage();
  expect(assistant.content).toContain("It's just green duh!");
});
