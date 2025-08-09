import { test, expect } from '@playwright/test';
import { normalizeSymbol } from '../../lib/finance/symbols';

test('detects equity symbol', () => {
  const n = normalizeSymbol('aapl');
  expect(n.assetClass).toBe('equity');
  expect(n.yahoo).toBe('AAPL');
});

test('detects index symbol', () => {
  const n = normalizeSymbol('^gspc');
  expect(n.assetClass).toBe('index');
  expect(n.yahoo).toBe('^GSPC');
});

test('normalises forex pair', () => {
  const n = normalizeSymbol('eurusd');
  expect(n.assetClass).toBe('fx');
  expect(n.yahoo).toBe('EURUSD=X');
});

test('normalises crypto pair', () => {
  const n = normalizeSymbol('btc/usdt');
  expect(n.assetClass).toBe('crypto');
  expect(n.binance).toBe('BTCUSDT');
  expect(n.yahoo).toBe('BTC-USD');
});
