/**
 * Custom error types for finance data fetching and parsing.
 * These help distinguish between network/source issues,
 * malformed payloads and rate limiting so callers can
 * handle them appropriately in tools and UI.
 */

/** Base class for finance-related errors. */
export class FinanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Thrown when a remote data source (API or scraper) responds
 * with a non-OK status code or cannot be reached.
 */
export interface DataSourceInfo {
  url: string;
  attempt: number;
  elapsedMs: number;
}

export class DataSourceError extends FinanceError {
  info?: DataSourceInfo;
  constructor(message: string, info?: DataSourceInfo) {
    super(message);
    this.info = info;
  }
}

/**
 * Thrown when a response payload cannot be parsed into the
 * expected structure or JSON format.
 */
export class ParseError extends FinanceError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when the rate limiter refuses further requests because
 * the allowed quota has been exceeded within a given time window.
 */
export class RateLimitedError extends FinanceError {
  constructor(message: string) {
    super(message);
  }
}

export type FinanceErrorType =
  | DataSourceError
  | ParseError
  | RateLimitedError;
