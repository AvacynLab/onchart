import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';

const saved: any[] = [];
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/db/queries') {
    return { saveDocument: async (doc: any) => saved.push(doc) };
  }
  return originalLoad(request, parent, isMain);
};

test('researchGeneral returns outline for topic', async () => {
  const { researchGeneral } = await import('../research-general');
  const res = await researchGeneral.execute({ topic: 'AI' }, { session: {} as any });
  assert.equal(res.topic, 'AI');
  assert.ok(res.sections.length > 0);
});

test('researchGeneral can emit research-general document', async () => {
  const { researchGeneral } = await import('../research-general');
  const res: any = await researchGeneral.execute(
    { topic: 'AI', emitArtifact: 'research-general' },
    { session: { user: { id: 'u1' } } as any },
  );
  assert.equal(saved[0].kind, 'research-general');
  assert.equal(res.documentId, saved[0].id);
  (Module as any)._load = originalLoad;
});
