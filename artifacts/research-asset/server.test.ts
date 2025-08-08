import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import Module from 'module';

function createDataStream() {
  const parts: any[] = [];
  return {
    parts,
    write(part: any) {
      parts.push(part);
    },
  };
}

const analysis = {
  fundamentals: { json: { pe: 10 } },
  sentiment: { score: 0.2 },
  technical: { lastClose: 1, ema20: 1, trend: 'above' },
};

let saved: any = null;

test('researchAssetDocumentHandler streams markdown and persists', async () => {
  const require = createRequire(import.meta.url);
  require.cache[require.resolve('server-only')] = { exports: {} } as any;
  require.cache[require.resolve('@/lib/db/queries')] = {
    exports: { saveDocument: async (args: any) => { saved = args; } },
  } as any;
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === '@/lib/ai/tools/analyse-asset') {
      return { analyseAsset: { execute: async () => analysis } };
    }
    return originalLoad(request, parent, isMain);
  };
  const { researchAssetDocumentHandler } = await import('./server');
  const stream = createDataStream();
  await researchAssetDocumentHandler.onCreateDocument({
    id: 'doc1',
    title: 'ABC',
    dataStream: stream as any,
    session: { user: { id: 'u1' } } as any,
  });
  assert.ok(stream.parts[0].data.includes('ABC Research'));
  assert.equal(saved.kind, 'research-asset');
  (Module as any)._load = originalLoad;
});
