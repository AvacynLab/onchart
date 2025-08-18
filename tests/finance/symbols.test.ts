import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSymbol,
  isCryptoSymbol,
  toBinancePair,
  toStooqTicker,
} from '../../lib/finance/symbols';

// Ensure normalizeSymbol returns expected mappings for common asset classes.
test('normalizeSymbol maps equity, index, fx and crypto symbols', () => {
  const equity = normalizeSymbol('aapl');
  assert.deepEqual(equity, {
    symbol: 'AAPL',
    yahoo: 'AAPL',
    assetClass: 'equity',
  });

  const index = normalizeSymbol('^gspc');
  assert.equal(index.assetClass, 'index');
  assert.equal(index.yahoo, '^GSPC');

  const fx = normalizeSymbol('eurusd');
  assert.equal(fx.assetClass, 'fx');
  assert.equal(fx.yahoo, 'EURUSD=X');

  const crypto = normalizeSymbol('btc-usd');
  assert.equal(crypto.assetClass, 'crypto');
  assert.equal(crypto.yahoo, 'BTC-USD');
  assert.equal(crypto.binance, 'BTCUSDT');
});

// Individual helpers expose consistent mappings used across the app.
test('crypto helpers', () => {
  assert.equal(isCryptoSymbol('eth-usd'), true);
  assert.equal(isCryptoSymbol('EURUSD'), false);
  // Hyphenated form maps USD to USDT
  assert.equal(toBinancePair('btc-usd'), 'BTCUSDT');
  // Already normalised pairs are returned untouched
  assert.equal(toBinancePair('ETHUSDT'), 'ETHUSDT');
  // Bare pair without separator is normalised as well
  assert.equal(toBinancePair('btcusd'), 'BTCUSDT');
  // Non-USD quotes remain unchanged
  assert.equal(toBinancePair('ETH-BUSD'), 'ETHBUSD');
  assert.equal(toStooqTicker('aapl'), 'AAPL.US');
  assert.equal(toStooqTicker('MSFT.US'), 'MSFT.US');
});
