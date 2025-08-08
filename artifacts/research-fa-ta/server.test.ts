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
  technical: { lastClose: 1, ema20: 1, rsi14: 50 },
  strategy: 'buy',
};

let saved: any = null;

test('researchFaTaDocumentHandler streams markdown and persists', async () => {
  const require = createRequire(import.meta.url);
  require.cache[require.resolve('server-only')] = { exports: {} } as any;
  require.cache[require.resolve('@/lib/db/queries')] = {
    exports: { saveDocument: async (args: any) => { saved = args; } },
  } as any;
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === '@/lib/ai/tools/analyse-fa-ta') {
      return { analyseFaTa: { execute: async () => analysis } };
    }
    return originalLoad(request, parent, isMain);
  };
  const { researchFaTaDocumentHandler } = await import('./server');
  const stream = createDataStream();
  await researchFaTaDocumentHandler.onCreateDocument({
    id: 'id1',
    title: 'ABC',
    dataStream: stream as any,
    session: { user: { id: 'u1' } } as any,
  });
  assert.ok(stream.parts[0].data.includes('FA/TA Research'));
  assert.equal(saved.kind, 'research-fa-ta');
  (Module as any)._load = originalLoad;
});
