import { test, expect } from '@playwright/test';
import { emitUIEvent, subscribeUIEvents } from '../../lib/ui/events';

test('subscribers receive emitted UI events', async () => {
  const received: any[] = [];
  const unsubscribe = subscribeUIEvents((e) => received.push(e));
  emitUIEvent({ type: 'show_chart', payload: { symbol: 'AAPL' } });
  unsubscribe();
  expect(received).toHaveLength(1);
  expect(received[0]).toEqual({
    type: 'show_chart',
    payload: { symbol: 'AAPL' },
  });
});
