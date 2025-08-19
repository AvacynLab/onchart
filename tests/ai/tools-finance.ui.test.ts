import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinanceTools } from '../../lib/ai/tools-finance';
import { subscribeUIEvents } from '../../lib/ui/events';

// Unit tests for new UI finance tools

test('add_indicator and annotate emit events and persist analyses', async () => {
  const events: any[] = [];
  const persisted: any[] = [];
  const tools = createFinanceTools(
    { userId: 'u1', chatId: 'c1' },
    {
      persist: async (r: any) => {
        persisted.push(r);
      },
      saveAttentionMarker: async () => 'marker1',
    },
  );

  const off = subscribeUIEvents((e) => events.push(e));
  await tools.ui.add_indicator.execute({
    symbol: 'AAPL',
    timeframe: '1d',
    name: 'sma',
    params: { length: 5 },
  });
  await tools.ui.annotate.execute({
    symbol: 'AAPL',
    timeframe: '1d',
    at: 1,
    price: 2,
    type: 'note',
    text: 'hi',
  });
  off();

  assert.deepStrictEqual(events[0], {
    type: 'add_indicator',
    payload: {
      symbol: 'AAPL',
      timeframe: '1d',
      name: 'sma',
      params: { length: 5 },
    },
  });
  assert.strictEqual(events[1].type, 'add_annotation');
  assert.deepStrictEqual(events[1].payload, {
    id: 'marker1',
    symbol: 'AAPL',
    timeframe: '1d',
    at: 1,
    price: 2,
    type: 'note',
    text: 'hi',
  });
  assert.deepStrictEqual(
    persisted.map((r) => r.type),
    ['add_indicator', 'add_annotation'],
  );
});

test('fetch_ohlc aliases get_ohlc', async () => {
  const tools = createFinanceTools(
    { userId: 'u1', chatId: 'c1' },
    {
      fetchOHLC: async () => [{ time: 0, open: 1, high: 1, low: 1, close: 1 }],
    },
  );
  const candles = await tools.finance.fetch_ohlc.execute({
    symbol: 'AAPL',
    timeframe: '1d',
  });
  assert.strictEqual(candles.length, 1);
});
