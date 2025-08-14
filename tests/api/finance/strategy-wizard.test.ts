import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Stub the finance tools module so the strategy wizard API can be exercised
// without hitting the database. The real implementation dynamically imports
// `lib/db/queries` which requires a Postgres instance. By overriding
// `createFinanceTools` before the API route is loaded we can simulate the
// wizard flow with deterministic outputs.
// ---------------------------------------------------------------------------
const tools = require('../../../lib/ai/tools-finance');
const originalCreateFinanceTools = tools.createFinanceTools;
tools.createFinanceTools = () => ({
  strategy: {
    // Minimal question set to mimic the wizard's first step
    start_wizard: { execute: async () => ({ question: 'horizon?' }) },
    // Return a draft strategy without touching the database
    propose: {
      execute: async () => ({ strategy: { id: 's1', title: 'T', status: 'draft' } }),
    },
  },
});

/**
 * Ensures the strategy wizard API route orchestrates the start and proposal
 * steps, returning the created strategy.
 */
test('runs start_wizard then propose', async () => {
  const { POST } = require('../../../app/(chat)/api/finance/strategy/wizard/route');
  const res = await POST(
    new Request('https://example.com/api/finance/strategy/wizard', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'u1',
        chatId: 'c1',
        title: 'T',
        answers: {},
        locale: 'en',
      }),
    }),
  );
  const json = await res.json();
  expect(json.strategy.id).toBe('s1');
});

// Restore the original implementation so other tests receive the real tools
test.afterAll(() => {
  tools.createFinanceTools = originalCreateFinanceTools;
});
