import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightPrice } from '../highlight-price';
import { subscribeAIEvents } from '../../event-engine';

/**
 * Ensure the highlightPrice tool emits an AI event with the expected payload.
 */
test('highlightPrice broadcasts event', async () => {
  const received: any[] = [];
  const unsubscribe = subscribeAIEvents((event) => received.push(event));

  await highlightPrice.execute({ symbol: 'AAPL', price: 150 });

  unsubscribe();

  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'highlight-price');
  assert.equal(received[0].symbol, 'AAPL');
  assert.equal(received[0].price, 150);
  assert.equal(received[0].level, 'info');
  assert.match(received[0].message, /Highlight AAPL/);
  assert.equal(typeof received[0].ts, 'number');
});

