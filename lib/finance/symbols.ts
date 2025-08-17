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

// Stablecoins recognised when detecting crypto pairs. Extend as needed.
const STABLECOINS = ['USDT', 'USDC', 'BUSD'];

/**
 * Quick sanity check to reject obviously unsupported symbols before hitting
 * external data providers. Allows basic letters, numbers and common
 * delimiters used by Yahoo/crypto pairs.
 */
export function isSupportedSymbol(raw: string): boolean {
  return /^[A-Za-z0-9^:=\/.-]{1,20}$/.test(raw.trim());
}

/** Determine if a raw symbol string refers to a crypto pair. */
export function isCryptoSymbol(raw: string): boolean {
  const input = raw.trim().toUpperCase();
  if (input.includes(':CRYPTO:')) return true;
  if (/^[A-Z]+-USD$/.test(input)) return true;
  return STABLECOINS.some((stable) =>
    input.endsWith(stable) && input.length > stable.length,
  );
}

/**
 * Convert a symbol to the Binance trading pair format.
 * `BTC-USD` -> `BTCUSDT`, `BTCUSDT` -> `BTCUSDT`.
 */
export function toBinancePair(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s.endsWith('USDT')) return s;
  if (s.endsWith('-USD')) return `${s.slice(0, -4)}USDT`;
  if (s.endsWith('USD')) return `${s}T`;
  return s;
}

/**
 * Convert a symbol to the Stooq ticker format. Default to US market.
 */
export function toStooqTicker(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s.includes('.')) return s;
  return `${s}.US`;
}

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
        binance: toBinancePair(pair),
        assetClass: 'crypto',
      };
    }
    return {
      symbol: pair,
      yahoo: `${base}${quote}=X`,
      assetClass: 'fx',
    };
  }

  // Crypto pairs using a hyphen (e.g. BTC-USD).
  if (/^[A-Z]+-USD$/.test(input)) {
    const base = input.slice(0, -4);
    const pair = `${base}USD`;
    return {
      symbol: pair,
      yahoo: `${base}-USD`,
      binance: toBinancePair(pair),
      assetClass: 'crypto',
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

