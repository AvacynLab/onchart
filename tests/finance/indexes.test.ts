import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Ensure migration adds indexes for chat-scoped listings.
test('migrations define chatId timestamp indexes', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../lib/db/migrations/0009_chat_updated_indexes.sql'),
    'utf8',
  );
  assert.match(sql, /analysis_chat_created_idx/);
  assert.match(sql, /research_chat_updated_idx/);
  assert.match(sql, /strategy_chat_updated_idx/);
});
