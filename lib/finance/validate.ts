import { z } from 'zod';

/**
 * Zod schemas used across finance tools to validate user supplied parameters.
 */

/** Valid timeframes for chart data and indicators. */
export const timeframeSchema = z.enum([
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
  '1mo',
]);

/** Intervals supported by Yahoo/Binance OHLC endpoints. */
export const intervalSchema = z.enum([
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '4h',
  '1d',
  '1w',
]);

/** Range strings accepted by Yahoo Finance chart API. */
export const rangeSchema = z.enum([
  '1d',
  '5d',
  '1mo',
  '3mo',
  '6mo',
  '1y',
  '2y',
  '5y',
  '10y',
  'ytd',
  'max',
]);

/** Date in YYYY-MM-DD format. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must be YYYY-MM-DD');

/** Symbol string (non-empty, trimmed). */
export const symbolSchema = z.string().min(1).transform((s) => s.trim());

