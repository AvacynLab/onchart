import { test, expect } from '@playwright/test';
import Module from 'module';

// Stub out `server-only` to allow importing database helpers.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad(request, parent, isMain);
};

test('creates and lists research documents', async () => {
  const queries = require('../../../lib/db/queries');
  queries.createResearch = (async (args: any) => ({
    id: 'r1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...args,
  })) as any;
  const { POST, GET } = require('../../../app/(chat)/api/finance/research/route');
  const postRes = await POST(
    new Request('https://example.com/api/finance/research', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'u1',
        chatId: 'c1',
        kind: 'general',
        title: 'Test',
        sections: [],
      }),
    }),
  );
  const created = await postRes.json();
  expect(created.id).toBe('r1');

  queries.listResearchByChatId = (async () => [created]) as any;
  const listRes = await GET(
    new Request('https://example.com/api/finance/research?chatId=c1'),
  );
  const docs = await listRes.json();
  expect(docs.length).toBe(1);
});

test('updates and fetches research document', async () => {
  const queries = require('../../../lib/db/queries');
  queries.updateResearch = (async () => ({
    id: 'r1',
    userId: 'u1',
    chatId: 'c1',
    kind: 'general',
    title: 'Updated',
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as any;
  const { PATCH, GET } = require('../../../app/(chat)/api/finance/research/route');
  const patchRes = await PATCH(
    new Request('https://example.com/api/finance/research', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'r1', title: 'Updated' }),
    }),
  );
  const updated = await patchRes.json();
  expect(updated.title).toBe('Updated');

  queries.getResearchById = (async () => updated) as any;
  const getRes = await GET(
    new Request('https://example.com/api/finance/research?id=r1'),
  );
  const doc = await getRes.json();
  expect(doc.id).toBe('r1');
});
