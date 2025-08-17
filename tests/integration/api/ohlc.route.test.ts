import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../../app/(chat)/api/finance/ohlc/route';
import { invalidateCache } from '../../../lib/finance/cache';
import { normalizeSymbol } from '../../../lib/finance/symbols';

function cacheKey(symbol: string, interval: string): string {
  const n = normalizeSymbol(symbol);
  return `ohlc:${n.yahoo}:${interval}:::`;
}

function createRequest(symbol: string, interval: string): Request {
  return new Request(
    `http://test/api/finance/ohlc?symbol=${symbol}&interval=${interval}`,
  );
}

test('crypto falls back to Binance when Yahoo fails', async () => {
  invalidateCache(cacheKey('BTC-USD', '1m'));
  let yahooCalls = 0;
  let binanceCalls = 0;
  const mockFetch: typeof fetch = async (url: any) => {
    const u = String(url);
    if (u.includes('yahoo')) {
      yahooCalls++;
      return new Response('', { status: 502 });
    }
    if (u.includes('binance')) {
      binanceCalls++;
      const data = [
        [0, '100', '0', '0', '100', '0'],
        [60, '110', '0', '0', '110', '0'],
      ];
      return new Response(JSON.stringify(data), { status: 200 });
    }
    throw new Error(`unexpected url ${u}`);
  };
  const original = global.fetch;
  // @ts-expect-error override
  global.fetch = mockFetch;
  try {
    const res = await GET(createRequest('BTC-USD', '1m'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(Array.isArray(body.candles), true);
    assert.equal(yahooCalls, 3); // retries included
    assert.equal(binanceCalls, 1);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('daily equity falls back to Stooq when Yahoo fails', async () => {
  invalidateCache(cacheKey('AAPL', '1d'));
  let yahooCalls = 0;
  let stooqCalls = 0;
  const mockFetch: typeof fetch = async (url: any) => {
    const u = String(url);
    if (u.includes('yahoo')) {
      yahooCalls++;
      return new Response('', { status: 502 });
    }
    if (u.includes('stooq')) {
      stooqCalls++;
      const csv = 'Date,Open,High,Low,Close,Volume\n2024-01-01,10,10,10,10,0\n2024-01-02,11,11,11,11,0\n';
      return new Response(csv, { status: 200 });
    }
    throw new Error(`unexpected url ${u}`);
  };
  const original = global.fetch;
  // @ts-expect-error override
  global.fetch = mockFetch;
  try {
    const res = await GET(createRequest('AAPL', '1d'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(Array.isArray(body.candles), true);
    assert.equal(yahooCalls, 3); // retries included
    assert.equal(stooqCalls, 1);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('returns 502 when all sources fail', async () => {
  invalidateCache(cacheKey('ZZZZ', '1d'));
  const mockFetch: typeof fetch = async () => new Response('', { status: 502 });
  const original = global.fetch;
  // @ts-expect-error override
  global.fetch = mockFetch;
  try {
    const res = await GET(createRequest('ZZZZ', '1d'));
    assert.equal(res.status, 502);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('second call hits cache without extra fetch', async () => {
  invalidateCache(cacheKey('AAPL', '1d'));
  let yahoo = 0;
  let stooq = 0;
  const mockFetch: typeof fetch = async (url: any) => {
    const u = String(url);
    if (u.includes('yahoo')) {
      yahoo++;
      return new Response('', { status: 502 });
    }
    if (u.includes('stooq')) {
      stooq++;
      const csv = 'Date,Open,High,Low,Close,Volume\n2024-01-01,10,10,10,10,0\n2024-01-02,11,11,11,11,0\n';
      return new Response(csv, { status: 200 });
    }
    throw new Error(`unexpected url ${u}`);
  };
  const original = global.fetch;
  // @ts-expect-error override
  global.fetch = mockFetch;
  try {
    await GET(createRequest('AAPL', '1d'));
    const firstYahoo = yahoo;
    const firstStooq = stooq;
    await GET(createRequest('AAPL', '1d'));
    assert.equal(yahoo, firstYahoo);
    assert.equal(stooq, firstStooq);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('rejects unsupported symbols with 400', async () => {
  const res = await GET(createRequest('DROP TABLE', '1d'));
  assert.equal(res.status, 400);
});
