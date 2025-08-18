import test from 'node:test';
import assert from 'node:assert/strict';
import { ui } from '../../lib/ui/events';

// Runtime verification that subscribers receive the emitted event.
test('subscribers receive emitted UI events', () => {
  const received: any[] = [];
  const unsubscribe = ui.on((e) => received.push(e));
  ui.emit({
    type: 'show_chart',
    payload: { symbol: 'AAPL', timeframe: '1d' },
  });
  unsubscribe();
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], {
    type: 'show_chart',
    payload: { symbol: 'AAPL', timeframe: '1d' },
  });
});

// Compile-time checks: invalid events should trigger TypeScript errors.
// @ts-expect-error timeframe is required for show_chart
ui.emit({ type: 'show_chart', payload: { symbol: 'AAPL' } });
// @ts-expect-error unknown event type
ui.emit({ type: 'unknown', payload: {} });
