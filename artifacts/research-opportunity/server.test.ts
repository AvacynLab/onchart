import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

function createDataStream() {
  const parts: any[] = [];
  return {
    parts,
    write(part: any) {
      parts.push(part);
    },
  };
}

const opportunities = [
  { symbol: 'AAA', score: 0.7 },
  { symbol: 'BBB', score: 0.6 },
];

let saved: any = null;

test('researchOpportunityDocumentHandler streams markdown and persists', async () => {
  const require = createRequire(import.meta.url);
  require.cache[require.resolve('server-only')] = { exports: {} } as any;
  require.cache[require.resolve('@/lib/db/queries')] = {
    exports: {
      saveDocument: async (args: any) => {
        saved = args;
      },
    },
  } as any;
  const { createResearchOpportunityHandler } = await import('./server');
  const handler = createResearchOpportunityHandler({ execute: async () => opportunities } as any);
  const stream = createDataStream();
  await handler.onCreateDocument({
    id: 'id1',
    title: 'Opportunities',
    dataStream: stream as any,
    session: { user: { id: 'u1' } } as any,
  });
  assert.ok(stream.parts[0].data.includes('Research Opportunities'));
  assert.equal(saved.kind, 'research-opportunity');
});
