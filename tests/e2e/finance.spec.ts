import { test, expect } from '@playwright/test';
import { createFinanceTools } from '../../lib/ai/tools-finance';
import { subscribeUIEvents } from '../../lib/ui/events';

// End-to-end scenario: show a chart then add an annotation
// The test verifies that the correct UI events are emitted and that
// persistence callbacks receive the expected data.
test('show chart then annotate', async () => {
  const events: any[] = [];
  const persisted: any[] = [];
  const markers: any[] = [];

  const tools = createFinanceTools(
    { userId: 'u1', chatId: 'c1' },
    {
      persist: async (r) => void persisted.push(r),
      saveAttentionMarker: async (args) => {
        markers.push(args);
        return 'm1';
      },
    },
  );

  const unsubscribe = subscribeUIEvents((e) => events.push(e));

  await tools.ui.show_chart.execute({
    symbol: 'AAPL',
    timeframe: '1d',
    studies: ['rsi'],
  });

  await tools.ui.add_annotation.execute({
    symbol: 'AAPL',
    timeframe: '1d',
    at: 1,
    type: 'note',
    text: 'RSI oversold',
  });

  unsubscribe();

  expect(events[0]).toEqual({
    type: 'show_chart',
    payload: { symbol: 'AAPL', timeframe: '1d', studies: ['rsi'] },
  });
  expect(events[1]).toMatchObject({
    type: 'add_annotation',
    payload: { id: 'm1', symbol: 'AAPL', timeframe: '1d' },
  });

  expect(persisted.map((r) => r.type)).toEqual(['show_chart', 'add_annotation']);
  expect(markers[0]).toMatchObject({ symbol: 'AAPL', timeframe: '1d' });
});
