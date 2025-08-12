import { test, expect } from '@playwright/test';
import Module from 'module';

// Mock finance tools to intercept wizard calls
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/ai/tools-finance') {
    return {
      createFinanceTools: () => ({
        strategy: {
          start_wizard: { execute: async () => ({ question: 'horizon?' }) },
          propose: {
            execute: async () => ({ strategy: { id: 's1', title: 'T', status: 'draft' } }),
          },
        },
      }),
    };
  }
  return originalLoad(request, parent, isMain);
};

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

// Restore original loader after tests
(Module as any)._load = originalLoad;
