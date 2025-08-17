import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../../app/(chat)/api/finance/quote/route';
import { invalidateCache } from '../../../lib/finance/cache';

function createRequest(symbol: string): Request {
  return new Request(`http://test/api/finance/quote?symbol=${symbol}`);
}

test('crypto falls back to Binance when Yahoo fails', async () => {
  invalidateCache('quote:BTC-USD');
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
    const res = await GET(createRequest('BTC-USD'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, 'binance');
    assert.equal(yahooCalls, 3); // retries included
    assert.equal(binanceCalls, 1);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('equity falls back to Stooq when Yahoo fails', async () => {
  invalidateCache('quote:AAPL');
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
    const res = await GET(createRequest('AAPL'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, 'stooq');
    assert.equal(yahooCalls, 3); // retries included
    assert.equal(stooqCalls, 1);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('returns 502 when all sources fail', async () => {
  invalidateCache('quote:ZZZZ');
  const mockFetch: typeof fetch = async () => new Response('', { status: 502 });
  const original = global.fetch;
  // @ts-expect-error override
  global.fetch = mockFetch;
  try {
    const res = await GET(createRequest('ZZZZ'));
    assert.equal(res.status, 502);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('second call hits cache without extra fetch', async () => {
  invalidateCache('quote:AAPL');
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
    await GET(createRequest('AAPL'));
    const firstYahoo = yahoo;
    const firstStooq = stooq;
    await GET(createRequest('AAPL'));
    assert.equal(yahoo, firstYahoo);
    assert.equal(stooq, firstStooq);
  } finally {
    // @ts-expect-error restore
    global.fetch = original;
  }
});

test('rejects unsupported symbols with 400', async () => {
  const res = await GET(createRequest('DROP TABLE'));
  assert.equal(res.status, 400);
});
