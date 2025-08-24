import { z } from 'zod';
import { sma, rsi, bollinger } from './indicators';
import { annualizedVolatility, maxDrawdown } from './risk';
import {
  searchCompanyCIK,
  fetchCompanyFacts,
  listFilings,
  type CompanyFacts,
  type FilingItem,
} from './sources/sec';
import { fetchRssFeeds, type NewsItem } from './sources/news';
import { fetchOHLCYahoo, fetchQuoteYahoo, type Candle } from './sources/yahoo';

/**
 * Trading signal emitted by a strategy.
 */
export type Signal = {
  /** Index in the price series where the signal occurs */
  index: number;
  /** Enter (long) or exit the position */
  type: 'enter' | 'exit';
};

/**
 * Result of a strategy run including generated signals and a naive backtest.
 */
export interface StrategyResult {
  signals: Signal[];
  performance: {
    /** Number of completed trades */
    trades: number;
    /** Sum of price differences between enter and exit */
    pnl: number;
  };
}

const PricesSchema = z.array(z.number());

/**
 * Compute naive PnL assuming unit position size and market orders.
 * @param prices price series
 * @param signals ordered list of enter/exit signals
 */
function backtest(prices: number[], signals: Signal[]): {
  trades: number;
  pnl: number;
} {
  const { prices: p } = z.object({ prices: PricesSchema }).parse({ prices });
  let position: number | null = null; // entry price when in position
  let pnl = 0;
  let trades = 0;
  for (const s of signals) {
    const price = p[s.index];
    if (price === undefined) continue;
    if (s.type === 'enter' && position === null) {
      position = price;
    } else if (s.type === 'exit' && position !== null) {
      pnl += price - position;
      position = null;
      trades += 1;
    }
  }
  return { trades, pnl };
}

/**
 * Moving-average crossover strategy.
 *
 * Emits an `enter` signal when the short SMA crosses above the long SMA
 * and an `exit` signal on the opposite cross.
 */
export function maCrossover(
  prices: number[],
  shortPeriod = 50,
  longPeriod = 200,
): StrategyResult {
  const { prices: p, short, long } = z
    .object({
      prices: PricesSchema,
      short: z.number().int().positive(),
      long: z.number().int().positive(),
    })
    .refine((d) => d.short < d.long, {
      message: 'short period must be less than long period',
    })
    .parse({ prices, short: shortPeriod, long: longPeriod });
  if (p.length < long) return { signals: [], performance: { trades: 0, pnl: 0 } };
  const shortSma = sma(p, short);
  const longSma = sma(p, long);
  const offset = long - short;
  const signals: Signal[] = [];

  // Seed the crossover comparison with the initial SMA difference. Guard array
  // lookups to satisfy `noUncheckedIndexedAccess` and ensure we have enough
  // data to compute the starting difference.
  const seedShort = shortSma[offset];
  const seedLong = longSma[0];
  if (seedShort === undefined || seedLong === undefined) {
    return { signals: [], performance: { trades: 0, pnl: 0 } };
  }
  let prevDiff = seedShort - seedLong;

  for (let i = 1; i < longSma.length; i++) {
    const shortVal = shortSma[i + offset];
    const longVal = longSma[i];
    if (shortVal === undefined || longVal === undefined) continue;
    const diff = shortVal - longVal;
    const idx = i + long - 1;
    if (prevDiff <= 0 && diff > 0) signals.push({ index: idx, type: 'enter' });
    if (prevDiff >= 0 && diff < 0) signals.push({ index: idx, type: 'exit' });
    prevDiff = diff;
  }
  return { signals, performance: backtest(p, signals) };
}

/**
 * RSI mean-reversion strategy.
 *
 * Generates an `enter` signal when RSI drops below `oversold` and an `exit`
 * when it rises above `overbought`.
 */
export function rsiReversion(
  prices: number[],
  period = 14,
  oversold = 30,
  overbought = 70,
): StrategyResult {
  const { prices: p, period: per, oversold: os, overbought: ob } = z
    .object({
      prices: PricesSchema,
      period: z.number().int().positive(),
      oversold: z.number(),
      overbought: z.number(),
    })
    .refine((d) => d.oversold < d.overbought, {
      message: 'oversold must be below overbought',
    })
    .parse({ prices, period, oversold, overbought });
  const r = rsi(p, per);
  const signals: Signal[] = [];
  if (r.length === 0) return { signals, performance: { trades: 0, pnl: 0 } };
  // Seed the RSI comparison with the first value, ensuring it exists under
  // strict optional property rules.
  const seed = r[0];
  if (seed === undefined) return { signals, performance: { trades: 0, pnl: 0 } };
  let prev = seed;
  for (let i = 1; i < r.length; i++) {
    const curr = r[i];
    if (curr === undefined) continue;
    const idx = i + per;
    if (prev >= os && curr < os) signals.push({ index: idx, type: 'enter' });
    if (prev <= ob && curr > ob) signals.push({ index: idx, type: 'exit' });
    prev = curr;
  }
  return { signals, performance: backtest(p, signals) };
}

/**
 * Bollinger Band breakout strategy.
 *
 * Uses previous-period bands to detect a close above the upper band
 * and exits once price falls back below the middle band.
 */
export function breakoutBB(
  prices: number[],
  period = 20,
  multiplier = 2,
): StrategyResult {
  const { prices: p, period: per, multiplier: mult } = z
    .object({
      prices: PricesSchema,
      period: z.number().int().positive(),
      multiplier: z.number().positive(),
    })
    .parse({ prices, period, multiplier });
  const { middle, upper } = bollinger(p, per, mult);
  const signals: Signal[] = [];
  if (upper.length < 2) return { signals, performance: { trades: 0, pnl: 0 } };
  let inPosition = false;
  for (let i = 1; i < upper.length; i++) {
    const price = p[i + per - 1];
    const prevUpper = upper[i - 1];
    const prevMid = middle[i - 1];
    if (price === undefined || prevUpper === undefined || prevMid === undefined) {
      continue;
    }
    if (!inPosition && price > prevUpper) {
      signals.push({ index: i + per - 1, type: 'enter' });
      inPosition = true;
    } else if (inPosition && price < prevMid) {
      signals.push({ index: i + per - 1, type: 'exit' });
      inPosition = false;
    }
  }
  return { signals, performance: backtest(p, signals) };
}

/**
 * Scan a universe of price series for potential trading opportunities.
 *
 * A symbol is flagged when any of the following conditions are met on the
 * latest datapoint:
 *  - annualized volatility exceeds `volThreshold`
 *  - a moving–average bullish crossover occurs
 *  - the price breaks above the previous period's Bollinger upper band
 *
 * The function returns a list of symbols alongside the reasons they were
 * flagged, allowing the caller to build opportunity summaries.
 */
export function opportunityScan(
  series: Record<string, number[]>,
  opts: {
    /** volatility threshold such as 0.2 (20% annualized) */
    volThreshold?: number;
    /** short/long periods for the moving average crossover */
    maShort?: number;
    maLong?: number;
    /** period and multiplier for Bollinger Bands */
    bbPeriod?: number;
    bbMultiplier?: number;
  } = {},
): Array<{ symbol: string; volatility: number; reasons: string[] }> {
  const settings = z
    .object({
      volThreshold: z.number().positive().default(0.2),
      maShort: z.number().int().positive().default(50),
      maLong: z.number().int().positive().default(200),
      bbPeriod: z.number().int().positive().default(20),
      bbMultiplier: z.number().positive().default(2),
    })
    .refine((d) => d.maShort < d.maLong, {
      message: 'maShort must be less than maLong',
    })
    .parse(opts);

  const results: Array<{ symbol: string; volatility: number; reasons: string[] }> = [];
  for (const [symbol, prices] of Object.entries(series)) {
    const { prices: p } = z.object({ prices: PricesSchema }).parse({ prices });
    if (p.length < 2) continue;

    // compute daily returns for volatility calculation
    const returns = [] as number[];
    for (let i = 1; i < p.length; i++) {
      const currPrice = p[i];
      const prevPrice = p[i - 1];
      if (currPrice === undefined || prevPrice === undefined) continue;
      returns.push(currPrice / prevPrice - 1);
    }

    const volatility = annualizedVolatility(returns);
    const reasons: string[] = [];
    if (volatility > settings.volThreshold) reasons.push('volatility');

    const ma = maCrossover(p, settings.maShort, settings.maLong);
    if (ma.signals.some((s) => s.type === 'enter' && s.index === p.length - 1)) {
      reasons.push('ma_crossover');
    }

    const bb = breakoutBB(p, settings.bbPeriod, settings.bbMultiplier);
    if (bb.signals.some((s) => s.type === 'enter' && s.index === p.length - 1)) {
      reasons.push('breakout_bb');
    }

    if (reasons.length) {
      results.push({ symbol, volatility, reasons });
    }
  }

  return results;
}

export interface AssetDeepDiveResult {
  cik: string;
  fundamentals: CompanyFacts & { debtToAssets?: number };
  filings: FilingItem[];
  news: NewsItem[];
}

/**
 * Assemble fundamentals, recent filings and news for a ticker symbol.
 *
 * The deep dive combines multiple public SEC datasets with RSS feeds and
 * computes a simple debt-to-assets ratio to help assess leverage.
 */
export async function assetDeepDive(
  ticker: string,
  fetcher: typeof fetch = fetch,
): Promise<AssetDeepDiveResult> {
  const matches = await searchCompanyCIK(ticker, fetcher);
  const firstMatch = matches[0];
  if (!firstMatch) throw new Error(`CIK for ${ticker} not found`);
  const cik = firstMatch.cik;
  const fundamentals = await fetchCompanyFacts(cik, fetcher);
  const filings = await listFilings(cik, ['10-K', '10-Q', '8-K'], fetcher);
  const news = await fetchRssFeeds(ticker, 7, fetcher);
  const { assets, liabilities } = fundamentals;
  const debtToAssets =
    assets !== undefined && liabilities !== undefined
      ? liabilities / assets
      : undefined;
  const enrichedFundamentals =
    debtToAssets === undefined
      ? fundamentals
      : { ...fundamentals, debtToAssets };
  return {
    cik,
    fundamentals: enrichedFundamentals,
    filings,
    news,
  };
}

export interface FtReportResult {
  symbol: string;
  /** Interval such as '1d' or '1h' */
  interval: string;
  /** Candle data used for chart rendering */
  candles: Candle[];
  indicators: {
    /** Simple moving average over 20 periods */
    sma: number[];
    /** Relative Strength Index over 14 periods */
    rsi: number[];
  };
  /** Signals and performance from a moving-average crossover strategy */
  strategy: StrategyResult;
  risk: {
    /** Annualized volatility of close-to-close returns */
    volatility: number;
    /** Maximum peak-to-trough drawdown */
    maxDrawdown: number;
  };
}

export interface GeneralResearchResult {
  /** Topic or symbol being researched */
  topic: string;
  /** Titles from recent news items that set the context */
  context: string[];
  /** Optional latest quote information */
  data: { price?: number; marketState?: string };
  /** Placeholder arrays for caller-provided insights */
  insights: string[];
  /** Placeholder arrays for caller-provided risks */
  risks: string[];
  /** Raw news items used as sources */
  sources: NewsItem[];
}

/** Map interval strings to an approximate number of periods per year. */
function periodsPerYear(interval: string): number {
  switch (interval) {
    case '1m':
      return 60 * 24 * 252;
    case '5m':
      return 12 * 24 * 252;
    case '15m':
      return 4 * 24 * 252;
    case '30m':
      return 2 * 24 * 252;
    case '1h':
      return 24 * 252;
    case '4h':
      return 6 * 252;
    case '1w':
      return 52;
    case '1mo':
      return 12;
    default:
      return 252; // daily
  }
}

/**
 * Generate a combined fundamental & technical report for a symbol.
 *
 * The report fetches recent OHLC candles, derives common indicators
 * (20-period SMA and 14-period RSI), evaluates a moving-average
 * crossover strategy (5 vs 20 periods) and computes basic risk metrics
 * like annualized volatility and maximum drawdown. Results can be used
 * to populate a research document or drive chart annotations.
 */
export async function ftReport(
  symbol: string,
  interval: string,
  fetcher: (
    symbol: string,
    interval: string,
    opts?: { range?: string; start?: number; end?: number },
  ) => Promise<Candle[]> = fetchOHLCYahoo,
): Promise<FtReportResult> {
  const candles = await fetcher(symbol, interval, { range: '6mo' });
  const closes = candles.map((c) => c.close);

  const indicators = {
    sma: sma(closes, 20),
    rsi: rsi(closes, 14),
  };

  // Use a short/long moving-average crossover as candidate strategy.
  const strategy = maCrossover(closes, 5, 20);

  // Compute close-to-close returns for risk metrics.
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const curr = closes[i];
    const prev = closes[i - 1];
    if (curr === undefined || prev === undefined) continue;
    returns.push(curr / prev - 1);
  }
  const risk = {
    volatility: annualizedVolatility(returns, periodsPerYear(interval)),
    maxDrawdown: maxDrawdown(closes),
  };

  return { symbol, interval, candles, indicators, strategy, risk };
}

/**
 * Assemble a minimal research scaffold for an arbitrary topic or symbol.
 *
 * The helper fetches the latest quote if the topic is a valid symbol and
 * recent news headlines for broader context. It intentionally leaves the
 * `insights` and `risks` arrays empty so that downstream AI agents can
 * populate them based on their own analysis.
 */
export async function generalResearch(
  topic: string,
  deps: {
    quote?: typeof fetchQuoteYahoo;
    news?: typeof fetchRssFeeds;
  } = {},
): Promise<GeneralResearchResult> {
  const quoteFetcher = deps.quote ?? fetchQuoteYahoo;
  const newsFetcher = deps.news ?? fetchRssFeeds;

  let data: { price?: number; marketState?: string } = {};
  try {
    const q = await quoteFetcher(topic);
    data = { price: q.price, marketState: q.marketState };
  } catch {
    // Symbol lookup failures are non-fatal for a general research doc
  }

  let sources: NewsItem[] = [];
  try {
    sources = await newsFetcher(topic, 7);
  } catch {
    // Ignore RSS failures, leaving sources empty
  }

  const context = sources.slice(0, 3).map((n) => n.title);
  return { topic, context, data, insights: [], risks: [], sources };
}

const strategies = {
  maCrossover,
  rsiReversion,
  breakoutBB,
  opportunityScan,
  assetDeepDive,
  ftReport,
  generalResearch,
};

export default strategies;

