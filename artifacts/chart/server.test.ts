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

test('chartDocumentHandler creates and streams config', async () => {
  const require = createRequire(import.meta.url);
  // Stub `server-only` to avoid runtime errors when importing server code in tests.
  require.cache[require.resolve('server-only')] = { exports: {} } as any;
  const { chartDocumentHandler } = await import('./server');

  const stream = createDataStream();
  await chartDocumentHandler.onCreateDocument({
    id: 'doc1',
    title: 'TSLA 15m',
    dataStream: stream as any,
    session: {} as any,
  });
  assert.deepEqual(stream.parts[0], {
    type: 'data-chartConfig',
    data: { symbol: 'TSLA', interval: '15m', studies: [] },
    transient: true,
  });
});
