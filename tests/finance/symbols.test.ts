import { test, expect } from '@playwright/test';
import {
  normalizeSymbol,
  isCryptoSymbol,
  toBinancePair,
  toStooqTicker,
  isSupportedSymbol,
} from '../../lib/finance/symbols';

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
  const n = normalizeSymbol('btc-usd');
  expect(n.assetClass).toBe('crypto');
  expect(n.binance).toBe('BTCUSDT');
  expect(n.yahoo).toBe('BTC-USD');
});

test('detects crypto via helpers', () => {
  expect(isCryptoSymbol('eth-usd')).toBeTruthy();
  expect(isCryptoSymbol('EURUSD')).toBeFalsy();
});

test('maps to Binance pair', () => {
  expect(toBinancePair('btc-usd')).toBe('BTCUSDT');
  expect(toBinancePair('ETHUSDT')).toBe('ETHUSDT');
});

test('maps to Stooq ticker', () => {
  expect(toStooqTicker('aapl')).toBe('AAPL.US');
  expect(toStooqTicker('MSFT.US')).toBe('MSFT.US');
});

test('validates supported symbols', () => {
  expect(isSupportedSymbol('AAPL')).toBeTruthy();
  expect(isSupportedSymbol('DROP TABLE')).toBeFalsy();
});
