import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';
import { createRequire } from 'module';

test('createDocument persists research artifacts', async () => {
  const require = createRequire(import.meta.url);
  require.cache[require.resolve('server-only')] = { exports: {} } as any;
  const saved: any[] = [];
  require.cache[require.resolve('@/lib/db/queries')] = {
    exports: { saveDocument: async (doc: any) => { saved.push(doc); } },
  } as any;

  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === '@/lib/ai/tools/analyse-asset') {
      return { analyseAsset: { execute: async () => ({ fundamentals: {}, sentiment: {}, technical: {} }) } };
    }
    if (request === '@/lib/ai/tools/scan-opportunities') {
      return { scanOpportunities: { execute: async () => [{ symbol: 'AAPL', score: 0.5 }] } };
    }
    if (request === '@/lib/ai/tools/analyse-fa-ta') {
      return {
        analyseFaTa: {
          execute: async () => ({
            fundamentals: { json: {} },
            technical: { lastClose: 1, ema20: 1, rsi14: 50 },
            strategy: 'hold',
            chart: { symbol: 'AAPL', interval: '1d' },
          }),
        },
      };
    }
    if (request === '@/lib/ai/tools/research-general') {
      return { researchGeneral: { execute: async () => ({ summary: 's', sections: [] }) } };
    }
    return originalLoad(request, parent, isMain);
  };

  const { createDocument } = await import('../create-document');
  const tool = createDocument({
    session: { user: { id: 'u1' } } as any,
    dataStream: { write() {} } as any,
  });

  await tool.execute({ title: 'Asset', kind: 'research-asset' });
  await tool.execute({ title: 'Opps', kind: 'research-opportunity' });
  await tool.execute({ title: 'FA/TA', kind: 'research-fa-ta' });
  await tool.execute({ title: 'General', kind: 'research-general' });

  assert.deepEqual(saved.map((s) => s.kind), [
    'research-asset',
    'research-opportunity',
    'research-fa-ta',
    'research-general',
  ]);

  (Module as any)._load = originalLoad;
});
