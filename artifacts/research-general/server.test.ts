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

const research = { summary: 'Overview', sections: ['A', 'B'] };
let saved: any = null;

test('researchGeneralDocumentHandler streams markdown and persists', async () => {
  const require = createRequire(import.meta.url);
  require.cache[require.resolve('server-only')] = { exports: {} } as any;
  require.cache[require.resolve('@/lib/db/queries')] = {
    exports: { saveDocument: async (args: any) => { saved = args; } },
  } as any;
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === '@/lib/ai/tools/research-general') {
      return { researchGeneral: { execute: async () => research } };
    }
    return originalLoad(request, parent, isMain);
  };
  const { researchGeneralDocumentHandler } = await import('./server');
  const stream = createDataStream();
  await researchGeneralDocumentHandler.onCreateDocument({
    id: 'id1',
    title: 'Topic',
    dataStream: stream as any,
    session: { user: { id: 'u1' } } as any,
  });
  assert.ok(stream.parts[0].data.includes('Topic Research'));
  assert.equal(saved.kind, 'research-general');
  (Module as any)._load = originalLoad;
});
