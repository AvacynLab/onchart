import test from 'node:test';
import assert from 'node:assert/strict';
import { emitSelection } from '../../components/bento/emit-selection';
import { ui } from '../../lib/ui/events';

// Ensure the helper emits an anchoring event with the provided timestamp.
test('emitSelection dispatches ask_about_selection event', () => {
  const events: any[] = [];
  const off = ui.on((e) => events.push(e));
  emitSelection('AAPL', '1h', 123000);
  off();
  assert.deepEqual(events[0], {
    type: 'ask_about_selection',
    payload: { symbol: 'AAPL', timeframe: '1h', at: 123000, kind: 'candle' },
  });
});
