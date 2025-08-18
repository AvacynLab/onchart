import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatDraft } from '@/lib/chat/create-chat';

// Ensure the chat creation helper posts the draft message and returns the id.
test('createChatDraft posts message to /api/chat and returns id', async () => {
  const calls: any[] = [];
  const fetchMock = async (url: string, init: any) => {
    calls.push([url, init]);
    return { ok: true } as Response;
  };
  const chatId = await createChatDraft('hello', {
    model: 'gpt-5',
    visibility: 'public',
    fetchImpl: fetchMock as any,
  });
  assert.equal(calls.length, 1);
  const [url, init] = calls[0];
  assert.equal(url, '/api/chat');
  const body = JSON.parse(init.body);
  assert.equal(body.selectedChatModel, 'gpt-5');
  assert.equal(body.selectedVisibilityType, 'public');
  assert.equal(body.message.parts[0].text, 'hello');
  assert.equal(chatId, body.id);
  assert.equal(init.keepalive, true);
});
