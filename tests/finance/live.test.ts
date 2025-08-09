import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subscribeBinanceTicker, isCryptoSymbol } from '../../lib/finance/live';

/**
 * Ensure crypto symbols are detected and WebSocket messages update quotes.
 */
test('subscribeBinanceTicker parses ticker messages', () => {
  let received: any = null;
  class MockWS {
    static instance: MockWS;
    onmessage: ((ev: { data: string }) => void) | null = null;
    closed = false;
    constructor(public url: string) {
      MockWS.instance = this;
    }
    close() {
      this.closed = true;
    }
  }
  (global as any).WebSocket = MockWS as any;
  const unsubscribe = subscribeBinanceTicker('BTC-USD', (q) => {
    received = q;
  });
  MockWS.instance.onmessage?.({
    data: JSON.stringify({ c: '50000', p: '100', P: '0.2' }),
  });
  assert.deepEqual(received, {
    symbol: 'BTC-USD',
    price: 50000,
    change: 100,
    changePercent: 0.2,
    marketState: 'REG',
  });
  unsubscribe();
  assert.equal(MockWS.instance.closed, true);
  delete (global as any).WebSocket;
});

/** Basic check for crypto symbol detection. */
test('isCryptoSymbol recognises BTC-USD', () => {
  assert.equal(isCryptoSymbol('BTC-USD'), true);
});
