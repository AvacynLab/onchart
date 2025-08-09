import { cachedJsonFetch, INTRADAY_TTL_MS, DAILY_TTL_MS } from '../cache';
import { rateLimit } from '../rate-limit';
import fetchWithRetry from '../request';
import { fetchDailyStooq } from './stooq';

/** Base endpoint for Yahoo Finance public API */
const YAHOO_BASE = 'https://query1.finance.yahoo.com';

interface YahooSession {
  cookie: string;
  crumb: string;
}

let session: YahooSession | null = null;

async function getSession(): Promise<YahooSession> {
  if (session) return session;
  // Yahoo requires a cookie + crumb pair for some endpoints
  const res = await fetchWithRetry(`${YAHOO_BASE}/v1/test/getcrumb`, {
    init: { headers: { 'User-Agent': 'Mozilla/5.0' } },
  });
  const cookie = res.headers.get('set-cookie') || '';
  const crumb = (await res.text()).trim();
  session = { cookie, crumb };
  return session;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
}

/**
 * Fetch latest quote information for a given symbol from Yahoo Finance.
 */
export async function fetchQuoteYahoo(symbol: string): Promise<QuoteResult> {
  const sym = normalizeSymbol(symbol);
  await rateLimit('yahoo');
  const url = `${YAHOO_BASE}/v7/finance/quote?symbols=${encodeURIComponent(sym)}`;
  const data = await cachedJsonFetch<any>(url, INTRADAY_TTL_MS);
  const quote = data.quoteResponse.result[0];
  return {
    symbol: quote.symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    marketState: quote.marketState,
  };
}

export interface Candle {
  time: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OHLCOptions {
  range?: string;
  start?: number; // unix timestamp
  end?: number; // unix timestamp
}

/**
 * Fetch OHLC candles for a symbol. Interval can be like '1m', '1d', etc.
 * Either provide a range (e.g. '1d', '1mo') or start/end timestamps.
 */
export async function fetchOHLCYahoo(
  symbol: string,
  interval: string,
  { range, start, end }: OHLCOptions = {},
): Promise<Candle[]> {
  const sym = normalizeSymbol(symbol);
  await rateLimit('yahoo');
  const params = new URLSearchParams({ interval });
  if (range) params.set('range', range);
  if (start && end) {
    params.set('period1', String(start));
    params.set('period2', String(end));
  }
  const { crumb, cookie } = await getSession();
  params.set('crumb', crumb);
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(sym)}?${params}`;
  const ttl = /m$|h$/.test(interval) ? INTRADAY_TTL_MS : DAILY_TTL_MS;
  try {
    const data = await cachedJsonFetch<any>(url, ttl);
    const result = data.chart.result[0];
    const timestamps: number[] = result.timestamp;
    const quote = result.indicators.quote[0];
    return timestamps.map((t, i) => ({
      time: t,
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i],
    }));
  } catch (err) {
    // If Yahoo fails for daily data, fallback to Stooq.
    if (/d$/.test(interval)) {
      return fetchDailyStooq(symbol);
    }
    throw err;
  }
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

/**
 * Search Yahoo Finance symbols using the unofficial autocomplete API.
 */
export async function searchYahoo(query: string): Promise<SearchResult[]> {
  await rateLimit('yahoo');
  const url = `${YAHOO_BASE}/v1/finance/search?q=${encodeURIComponent(query)}`;
  const data = await cachedJsonFetch<any>(url, 300_000);
  return (data.quotes || []).map((q: any) => ({
    symbol: q.symbol,
    name: q.shortname || q.longname || '',
    type: q.quoteType,
  }));
}
