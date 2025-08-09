import { z } from 'zod';

/**
 * Minimal OHLC candle representation used by the backtest engine.
 */
export const Candle = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
});
export type Candle = z.infer<typeof Candle>;

/**
 * Signals map bar index to an action. Only one position is tracked (long only)
 * and the engine assumes market orders executed at the close of the bar where
 * the signal is emitted.
 */
export const SignalMap = z.record(z.enum(['enter', 'exit']));
export type SignalMap = Record<string, 'enter' | 'exit'>;

export interface BacktestOptions {
  candles: Candle[];
  signals: SignalMap;
  costs?: number; // proportional transaction costs per trade (e.g. 0.001 for 0.1%)
  slippage?: number; // slippage factor applied to entry and exit prices
}

export interface BacktestMetrics {
  cagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  hitRate: number;
  profitFactor: number;
}

export interface BacktestResult {
  equityCurve: number[]; // equity value after each bar
  metrics: BacktestMetrics;
}

// Annualisation constant: this engine operates on daily candles so we scale
// statistics such as the Sharpe ratio by the number of trading days in a year.
// Adjust this value if using a different bar frequency.
const TRADING_DAYS_PER_YEAR = 365;

/**
 * Compute maximum drawdown of an equity series.
 */
function computeMaxDrawdown(curve: number[]): number {
  let peak = curve[0];
  let maxDd = 0;
  for (const value of curve) {
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length || 1);
  return Math.sqrt(variance);
}

/**
 * Run a simple long-only backtest on OHLC candles using the provided signals.
 * The strategy invests the full equity on each `enter` and exits completely on
 * `exit`. Costs and slippage are applied on both sides of the trade.
 */
export function backtest({
  candles,
  signals,
  costs = 0,
  slippage = 0,
}: BacktestOptions): BacktestResult {
  Candle.array().parse(candles);
  SignalMap.parse(signals);

  let equity = 1; // start with 1 unit of capital
  let position = 0; // number of shares held
  let entryPrice = 0; // price paid per share including costs/slippage
  let entryValue = 0; // capital committed to current trade

  const curve: number[] = [equity];
  const returns: number[] = [];
  let wins = 0;
  let losses = 0;
  let profitSum = 0;
  let lossSum = 0;

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i];
    const signal = signals[i];
    const price = bar.close;

    if (signal === 'enter' && position === 0) {
      const priceWithCosts = price * (1 + slippage) * (1 + costs);
      position = equity / priceWithCosts;
      entryPrice = priceWithCosts;
      entryValue = equity;
      equity = 0;
    } else if (signal === 'exit' && position > 0) {
      const exitPrice = price * (1 - slippage) * (1 - costs);
      const tradeValue = position * exitPrice;
      const pnl = tradeValue - entryValue;
      if (pnl >= 0) {
        wins += 1;
        profitSum += pnl;
      } else {
        losses += 1;
        lossSum += pnl;
      }
      equity += tradeValue;
      position = 0;
      entryPrice = 0;
      entryValue = 0;
    }

    const markToMarket = equity + position * price;
    const prev = curve[curve.length - 1];
    curve.push(markToMarket);
    returns.push((markToMarket - prev) / prev);
  }

  const avgReturn = mean(returns);
  const volatility = stdev(returns);
  const negativeReturns = returns.filter((r) => r < 0);
  const downside = stdev(negativeReturns.length ? negativeReturns : [0]);
  const periods = returns.length;
  const years = periods / TRADING_DAYS_PER_YEAR;
  const ending = curve[curve.length - 1];

  // Compute common performance statistics. CAGR expresses the compounded
  // annual growth rate, Sharpe normalises returns by volatility, Sortino only
  // penalises downside deviation, and profit factor divides gross wins by
  // absolute gross losses.
  const metrics: BacktestMetrics = {
    cagr: Math.pow(ending / curve[0], 1 / years) - 1,
    sharpe: (avgReturn / (volatility || 1)) * Math.sqrt(TRADING_DAYS_PER_YEAR),
    sortino: (avgReturn / (downside || 1)) * Math.sqrt(TRADING_DAYS_PER_YEAR),
    maxDrawdown: computeMaxDrawdown(curve),
    hitRate: wins + losses > 0 ? wins / (wins + losses) : 0,
    profitFactor: lossSum !== 0 ? profitSum / Math.abs(lossSum) : Infinity,
  };

  return { equityCurve: curve, metrics };
}

export type { BacktestResult };
