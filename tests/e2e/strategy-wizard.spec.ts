import { test, expect } from '../fixtures';
import enDashboard from '../../messages/en/dashboard.json' assert { type: 'json' };

// Ensure external font requests are stubbed so the test does not depend on
// Google services or network access.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  await page.route('https://fonts.gstatic.com/*', (route) =>
    route.fulfill({ status: 200, body: '' }),
  );
  // Force English locale for this suite via cookie; paths remain unchanged.
  await page.context().addCookies([
    { name: 'lang', value: 'en', domain: 'localhost', path: '/' },
  ]);
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

  // Navigate to the dashboard with a chat id so strategies can be created.
  // The route does not change when switching locales.
  await page.goto('/?chatId=c1');
  await expect(page).toHaveURL(/\?chatId=c1$/);

  // Open the strategy wizard via the tile's action button.
  await page
    .getByRole('button', { name: (enDashboard as any).strategies.create })
    .click();

  // Step 1: investment horizon.
  await page.locator('input[name="horizon"]').fill('1y');
  await page.locator('form button[type="submit"]').click();

  // Step 2: risk tolerance.
  await page.locator('input[name="risk"]').fill('medium');
  await page.locator('form button[type="submit"]').click();

  // Step 3: universe of assets.
  await page.locator('input[name="universe"]').fill('stocks');
  await page.locator('form button[type="submit"]').click();

  // Step 4: fees.
  await page.locator('input[name="fees"]').fill('0.1');
  await page.locator('form button[type="submit"]').click();

  // Step 5: maximum drawdown, if the wizard exposes this step.
  const drawdownInput = page.locator('input[name="drawdown"]');
  if (await drawdownInput.count()) {
    await drawdownInput.fill('10');
    await page.locator('form button[type="submit"]').click();
  }

  // Final step: additional constraints.
  const constraints = page.locator('input[name="constraints"]');
  // Wait explicitly for the constraints field to appear before interacting to
  // avoid flakiness when the wizard transitions between steps.
  await expect(constraints).toBeVisible();
  await constraints.fill('ESG');
  await page.locator('form button[type="submit"]').click();

  // The mocked response should cause the new strategy to appear in the list.
  await expect(page.getByText('Demo strategy')).toBeVisible();
});
