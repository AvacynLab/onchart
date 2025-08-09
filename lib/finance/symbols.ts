import { z } from 'zod';

/** Asset classes supported for symbol normalisation. */
export const assetClassSchema = z.enum(['equity', 'etf', 'index', 'fx', 'crypto']);
export type AssetClass = z.infer<typeof assetClassSchema>;

/**
 * Result returned by {@link normalizeSymbol}.
 * - `symbol`: canonical symbol without delimiters.
 * - `yahoo`: symbol formatted for Yahoo Finance requests.
 * - `binance`: optional symbol for Binance endpoints (crypto pairs).
 * - `assetClass`: detected asset class.
 */
export interface NormalizedSymbol {
  symbol: string;
  yahoo: string;
  binance?: string;
  assetClass: AssetClass;
}

const STABLECOINS = ['USDT', 'USDC', 'BUSD'];

/**
 * Normalise a user supplied symbol string and attempt to detect its asset class.
 * The implementation is heuristic and therefore not exhaustive, but covers
 * common equity, index, forex and crypto formats.
 */
export function normalizeSymbol(raw: string): NormalizedSymbol {
  const input = raw.trim().toUpperCase();

  // Indices on Yahoo start with a caret (e.g. ^GSPC)
  if (input.startsWith('^')) {
    return {
      symbol: input,
      yahoo: input,
      assetClass: 'index',
    };
  }

  // Pairs separated by '/' are typically crypto or FX.
  if (input.includes('/')) {
    const [base, quote] = input.split('/');
    const pair = `${base}${quote}`;
    if (STABLECOINS.includes(quote) || STABLECOINS.includes(base)) {
      // Treat as crypto pair.
      return {
        symbol: pair,
        yahoo: `${base}-${quote.replace('USDT', 'USD')}`,
        binance: pair,
        assetClass: 'crypto',
      };
    }
    return {
      symbol: pair,
      yahoo: `${base}${quote}=X`,
      assetClass: 'fx',
    };
  }

  // Yahoo already uses '=X' suffix for FX pairs (e.g. EURUSD=X)
  if (input.endsWith('=X') && input.length === 8) {
    return {
      symbol: input.slice(0, 6),
      yahoo: input,
      assetClass: 'fx',
    };
  }

  // Six letter codes without separator are likely FX pairs.
  if (/^[A-Z]{6}$/.test(input)) {
    return {
      symbol: input,
      yahoo: `${input}=X`,
      assetClass: 'fx',
    };
  }

  // Detect crypto pairs already without separator (e.g. BTCUSDT)
  for (const stable of STABLECOINS) {
    if (input.endsWith(stable) && input.length > stable.length) {
      const base = input.slice(0, -stable.length);
      return {
        symbol: `${base}${stable}`,
        yahoo: `${base}-${stable.replace('USDT', 'USD')}`,
        binance: `${base}${stable}`,
        assetClass: 'crypto',
      };
    }
  }

  // Basic heuristic for ETFs: a small whitelist of common ETFs
  const ETF_WHITELIST = new Set(['SPY', 'QQQ', 'IWM', 'EEM', 'VTI', 'GLD']);
  if (ETF_WHITELIST.has(input)) {
    return { symbol: input, yahoo: input, assetClass: 'etf' };
  }

  // Default to equity.
  return { symbol: input, yahoo: input, assetClass: 'equity' };
}

