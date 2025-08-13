import { test, expect } from '../fixtures';
import enDashboard from '../../messages/en/dashboard.json' assert { type: 'json' };
import enFinance from '../../messages/en/finance.json' assert { type: 'json' };

// Ensure external font requests are stubbed so the test does not depend on
// Google services or network access.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
});

/**
 * Drive the strategy wizard through all of its steps and ensure the newly
 * created strategy appears in the tile's list. The backend request is mocked
 * to keep the test hermetic.
 */
test('completes strategy wizard flow', async ({ page }) => {
  // Mock the API endpoint that persists the created strategy.
  await page.route('**/api/finance/strategy/wizard', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        strategy: {
          id: 's1',
          title: 'Demo strategy',
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  // Navigate to the English dashboard providing a chat id so strategies can be
  // created.
  await page.goto('/en?chatId=c1');
  await expect(page).toHaveURL(/\/en\?chatId=c1$/);

  // Open the strategy wizard via the tile's action button.
  await page
    .getByRole('button', { name: (enDashboard as any).strategies.create })
    .click();

  // Step 1: investment horizon.
  await page
    .getByLabel((enFinance as any).wizard.horizon)
    .fill('1y');
  await page.getByRole('button', { name: (enFinance as any).wizard.next }).click();

  // Step 2: risk tolerance.
  await page.getByLabel((enFinance as any).wizard.risk).fill('medium');
  await page.getByRole('button', { name: (enFinance as any).wizard.next }).click();

  // Step 3: universe of assets.
  await page.getByLabel((enFinance as any).wizard.universe).fill('stocks');
  await page.getByRole('button', { name: (enFinance as any).wizard.next }).click();

  // Step 4: fees.
  await page.getByLabel((enFinance as any).wizard.fees).fill('0.1');
  await page.getByRole('button', { name: (enFinance as any).wizard.next }).click();

  // Step 5: maximum drawdown.
  await page.getByLabel((enFinance as any).wizard.drawdown).fill('10');
  await page.getByRole('button', { name: (enFinance as any).wizard.next }).click();

  // Step 6: additional constraints.
  await page.getByLabel((enFinance as any).wizard.constraints).fill('ESG');
  await page
    .getByRole('button', { name: (enFinance as any).wizard.finish })
    .click();

  // The mocked response should cause the new strategy to appear in the list.
  await expect(page.getByText('Demo strategy')).toBeVisible();
});
