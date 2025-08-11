import { test, expect } from '@playwright/test';

// Import each finance API route to verify the runtime setting
import * as quote from '../../../app/(chat)/api/finance/quote/route';
import * as ohlc from '../../../app/(chat)/api/finance/ohlc/route';
import * as fundamentals from '../../../app/(chat)/api/finance/fundamentals/route';
import * as filings from '../../../app/(chat)/api/finance/filings/route';
import * as news from '../../../app/(chat)/api/finance/news/route';
import * as attention from '../../../app/(chat)/api/finance/attention/route';
import * as research from '../../../app/(chat)/api/finance/research/route';
import * as strategy from '../../../app/(chat)/api/finance/strategy/route';

test('finance routes execute on nodejs runtime', () => {
  expect(quote.runtime).toBe('nodejs');
  expect(ohlc.runtime).toBe('nodejs');
  expect(fundamentals.runtime).toBe('nodejs');
  expect(filings.runtime).toBe('nodejs');
  expect(news.runtime).toBe('nodejs');
  expect(attention.runtime).toBe('nodejs');
  expect(research.runtime).toBe('nodejs');
  expect(strategy.runtime).toBe('nodejs');
});
