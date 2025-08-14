import { test, expect } from '@playwright/test';
import { createFinanceTools } from '../../lib/ai/tools-finance';
import { subscribeUIEvents } from '../../lib/ui/events';

const mockQuote = {
  symbol: 'AAPL',
  price: 150,
  change: 1,
  changePercent: 0.7,
  marketState: 'REG',
};

const mockCandles = [
  { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 },
  { time: 2, open: 2, high: 2, low: 2, close: 2, volume: 2 },
];

const mockSearch = [{ symbol: 'AAPL', name: 'Apple Inc.', type: 'EQUITY' }];
const mockFundamentals = {
  revenue: 1000,
  eps: 2,
  assets: 5000,
  liabilities: 2000,
};
const mockFilings = [
  {
    accession: '1',
    form: '10-K',
    filedAt: '2020-01-01',
    primaryDocument: 'a',
    url: 'u',
  },
];
const mockNews = [
  {
    title: 't',
    link: 'l',
    pubDate: new Date('2023-01-01'),
    summary: 's',
  },
];

const noop = async () => {};

test('get_quote returns quote and persists', async () => {
  const saved: any[] = [];
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      fetchQuote: async () => mockQuote,
      fetchOHLC: async () => mockCandles,
      search: async () => mockSearch,
      persist: async (r) => saved.push(r),
    },
  );

  const res = await tools.finance.get_quote.execute({ symbol: 'AAPL' });
  expect(res).toEqual(mockQuote);
  expect(saved[0].type).toBe('quote');
});

test('get_ohlc fetches candles', async () => {
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      fetchQuote: async () => mockQuote,
      fetchOHLC: async () => mockCandles,
      search: async () => mockSearch,
      persist: async () => {},
    },
  );
  const res = await tools.finance.get_ohlc.execute({ symbol: 'AAPL', timeframe: '1d', range: '5d' });
  expect(res).toHaveLength(2);
  expect(res[0].open).toBe(1);
});

test('search_symbol finds matches', async () => {
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      fetchQuote: async () => mockQuote,
      fetchOHLC: async () => mockCandles,
      search: async () => mockSearch,
      persist: async () => {},
    },
  );
  const res = await tools.finance.search_symbol.execute({ query: 'Apple' });
  expect(res[0].symbol).toBe('AAPL');
});

test('compute_indicators calculates sma and rsi', async () => {
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    { persist: async () => {} },
  );
  const prices = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  const res = await tools.finance.compute_indicators.execute({ prices, list: ['sma', 'rsi'] });
  expect(res.sma.at(-1)).toBeCloseTo(10.5, 5);
  expect(res.rsi.at(-1)).toBeGreaterThan(0);
});

test('compute_risk returns metrics', async () => {
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    { persist: async () => {} },
  );
  const prices = [1,2,3,4,5,6,7,8,9,10];
  const res = await tools.finance.compute_risk.execute({ prices });
  expect(res.volatility).toBeGreaterThan(0);
  expect(res.maxDrawdown).toBeGreaterThanOrEqual(0);
});

test('get_fundamentals fetches SEC data', async () => {
  const saved: any[] = [];
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      fetchFundamentals: async () => mockFundamentals,
      searchCIK: async () => [{ cik: '0001', name: 'Apple', ticker: 'AAPL' }],
      persist: async (r) => saved.push(r),
    },
  );
  const res = await tools.finance.get_fundamentals.execute({ ticker: 'AAPL' });
  expect(res.eps).toBe(2);
  expect(saved[0].type).toBe('fundamentals');
});

test('get_filings lists filings', async () => {
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      listFilings: async () => mockFilings,
      searchCIK: async () => [{ cik: '0001', name: 'Apple', ticker: 'AAPL' }],
      persist: async () => {},
    },
  );
  const res = await tools.finance.get_filings.execute({ ticker: 'AAPL', forms: ['10-K'] });
  expect(res[0].form).toBe('10-K');
});

test('news aggregates feeds', async () => {
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    { fetchNews: async () => mockNews, persist: async () => {} },
  );
  const res = await tools.finance.news.execute({ query: 'Apple', window: 7 });
  expect(res[0].title).toBe('t');
});

test('ui.add_annotation persists marker and emits event', async () => {
  const events: any[] = [];
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      saveAttentionMarker: async () => 'm1',
      persist: noop,
    },
  );
  const unsub = subscribeUIEvents((e) => events.push(e));
  const res = await tools.ui.add_annotation.execute({
    symbol: 'AAPL',
    timeframe: '1D',
    at: 1,
    type: 'note',
    text: 'hi',
  });
  unsub();
  expect(res.id).toBe('m1');
  expect(events[0]).toMatchObject({
    type: 'add_annotation',
    payload: { id: 'm1', symbol: 'AAPL' },
  });
});

test('research.create and add_section manipulate documents', async () => {
  let doc: any = {
    id: 'r1',
    userId: 'u',
    chatId: 'c',
    kind: 'general',
    title: 'T',
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tools = createFinanceTools(
    { userId: 'u', chatId: 'c' },
    {
      createResearch: async (args) => ({ ...doc, ...args }),
      getResearchById: async () => doc,
      updateResearch: async (args) => {
        doc = { ...doc, ...args, updatedAt: new Date() };
        return doc;
      },
      persist: noop,
    },
  );
  const created = await tools.research.create.execute({
    kind: 'general',
    title: 'T',
    sections: [],
  });
  expect(created.title).toBe('T');
  const updated = await tools.research.add_section.execute({
    id: 'r1',
    section: { content: 'c1' },
  });
  expect(updated.sections.length).toBe(1);
});
