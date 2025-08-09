import { z } from 'zod';

/**
 * Risk metric utilities calculated locally.
 *
 * Inputs are arrays of periodic returns (e.g. daily percentage changes)
 * or price series for drawdown. All functions validate arguments with zod.
 */

const ReturnsSchema = z.array(z.number());
const PricesSchema = z.array(z.number());

/**
 * Annualized volatility of a return series.
 *
 * \sigma_{annual} = stdev(returns) * sqrt(periodsPerYear)
 */
export function annualizedVolatility(
  returns: number[],
  periodsPerYear = 252,
): number {
  const { returns: r, periodsPerYear: ppy } = z
    .object({ returns: ReturnsSchema, periodsPerYear: z.number().positive() })
    .parse({ returns, periodsPerYear });
  if (r.length < 2) return 0;
  const mean = r.reduce((a, b) => a + b, 0) / r.length; // average return
  const variance = r.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (r.length - 1);
  return Math.sqrt(variance) * Math.sqrt(ppy);
}

/**
 * Maximum drawdown from a price series.
 *
 * Calculates the largest peak-to-trough decline.
 */
export function maxDrawdown(prices: number[]): number {
  const { prices: p } = z.object({ prices: PricesSchema }).parse({ prices });
  if (p.length < 2) return 0;
  let peak = p[0];
  let maxDd = 0;
  for (const price of p) {
    if (price > peak) peak = price; // new high
    const dd = (peak - price) / peak; // drawdown from peak
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/**
 * Sharpe ratio of a return series.
 *
 * Sharpe = (mean(return - rf_per_period) / stdev(return - rf_per_period)) * sqrt(periodsPerYear)
 */
export function sharpeRatio(
  returns: number[],
  riskFreeRate = 0,
  periodsPerYear = 252,
): number {
  const schema = z.object({
    returns: ReturnsSchema,
    riskFreeRate: z.number(),
    periodsPerYear: z.number().positive(),
  });
  const { returns: r, riskFreeRate: rf, periodsPerYear: ppy } = schema.parse({
    returns,
    riskFreeRate,
    periodsPerYear,
  });
  if (r.length < 2) return 0;
  const rfPerPeriod = rf / ppy;
  const excess = r.map((x) => x - rfPerPeriod); // excess returns above risk free
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const variance = excess.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (excess.length - 1);
  const sd = Math.sqrt(variance);
  return sd === 0 ? 0 : (mean / sd) * Math.sqrt(ppy);
}

/**
 * Sortino ratio emphasising downside volatility.
 *
 * Sortino = (mean(excess) * sqrt(periodsPerYear)) / downsideDeviation
 */
export function sortinoRatio(
  returns: number[],
  riskFreeRate = 0,
  periodsPerYear = 252,
): number {
  const schema = z.object({
    returns: ReturnsSchema,
    riskFreeRate: z.number(),
    periodsPerYear: z.number().positive(),
  });
  const { returns: r, riskFreeRate: rf, periodsPerYear: ppy } = schema.parse({
    returns,
    riskFreeRate,
    periodsPerYear,
  });
  if (r.length === 0) return 0;
  const rfPerPeriod = rf / ppy;
  const excess = r.map((x) => x - rfPerPeriod);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const downs = excess.filter((x) => x < 0); // only negative returns
  if (downs.length === 0) return Infinity;
  const downsideDev = Math.sqrt(
    downs.reduce((s, v) => s + v * v, 0) / downs.length,
  );
  return (mean * Math.sqrt(ppy)) / downsideDev;
}

/**
 * Beta of an asset relative to a benchmark.
 *
 * Beta = covariance(asset, benchmark) / variance(benchmark)
 */
export function beta(
  assetReturns: number[],
  benchmarkReturns: number[],
): number {
  const { asset, bench } = z
    .object({ asset: ReturnsSchema, bench: ReturnsSchema })
    .parse({ asset: assetReturns, bench: benchmarkReturns });
  if (asset.length !== bench.length || asset.length < 2) return 0;
  const meanA = asset.reduce((a, b) => a + b, 0) / asset.length;
  const meanB = bench.reduce((a, b) => a + b, 0) / bench.length;
  let cov = 0;
  let varB = 0;
  for (let i = 0; i < asset.length; i++) {
    cov += (asset[i] - meanA) * (bench[i] - meanB);
    varB += Math.pow(bench[i] - meanB, 2);
  }
  cov /= asset.length - 1; // sample covariance
  varB /= bench.length - 1; // sample variance
  return varB === 0 ? 0 : cov / varB;
}

export default {
  annualizedVolatility,
  maxDrawdown,
  sharpeRatio,
  sortinoRatio,
  beta,
};

