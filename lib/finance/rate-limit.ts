import { RateLimitedError } from './errors';

/**
 * Token bucket rate limiter per domain. Each domain has a bucket of tokens
 * that refill over time. A request consumes one token. When the bucket is
 * empty, the caller waits until a token becomes available.
 */

interface Bucket {
  tokens: number;
  lastRefill: number; // ms timestamp
}

const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  capacity?: number; // max tokens in bucket
  refillRate?: number; // tokens added per interval
  intervalMs?: number; // interval for refill
  timeoutMs?: number; // max time to wait before throwing
}

const DEFAULTS: Required<RateLimitOptions> = {
  capacity: 5,
  refillRate: 5,
  intervalMs: 1000,
  timeoutMs: 10_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Await availability of a token for the given domain. Useful to avoid being
 * blocked by public APIs such as Yahoo or Binance.
 */
export async function rateLimit(domain: string, opts: RateLimitOptions = {}): Promise<void> {
  const options = { ...DEFAULTS, ...opts };
  let bucket = buckets.get(domain);
  if (!bucket) {
    bucket = { tokens: options.capacity, lastRefill: Date.now() };
    buckets.set(domain, bucket);
  }
  const start = Date.now();
  while (bucket.tokens <= 0) {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= options.intervalMs) {
      bucket.tokens = Math.min(
        options.capacity,
        bucket.tokens + Math.floor((elapsed / options.intervalMs) * options.refillRate),
      );
      bucket.lastRefill = now;
    } else {
      const wait = options.intervalMs - elapsed;
      if (Date.now() - start + wait > options.timeoutMs) {
        throw new RateLimitedError(`Rate limit exceeded for domain ${domain}`);
      }
      await sleep(wait);
    }
  }
  bucket.tokens -= 1;
}
