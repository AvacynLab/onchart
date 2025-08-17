/**
 * Simple in-memory LRU cache with TTL support.
 * The key is generally the request URL and parameters stringified.
 * Older entries are evicted when capacity is exceeded.
 */
import { ParseError } from './errors';
import { fetchWithRetry } from './request';

interface CacheEntry<T> {
  value: T;
  /** Expiration timestamp in milliseconds */
  expires: number;
}

/** Interface that allows swapping the cache backend (e.g. Redis in prod). */
export interface CacheDriver {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  delete(key: string): void;
}

/** In-memory driver used for development and tests. */
class InMemoryDriver implements CacheDriver {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly capacity = 100;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU order by reinserting
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.capacity) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expires: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

const driver: CacheDriver = new InMemoryDriver();

/**
 * Default TTL for intraday data (~15s). Keeping this under 20s respects the
 * 10–15s refresh window noted in the project spec while avoiding excessive
 * hammering of free APIs.
 */
export const TTL_INTRADAY_MS = 15_000;
/** Daily data changes slowly; cache for one minute to smooth traffic. */
export const TTL_DAILY_MS = 60_000;

/**
 * Retrieve a value from cache if it exists and has not expired.
 */
export function getCache<T>(key: string): T | undefined {
  return driver.get<T>(key);
}

/**
 * Store a value in cache with a time to live in milliseconds.
 */
export function setCache<T>(key: string, value: T, ttlMs: number): void {
  driver.set(key, value, ttlMs);
}

/**
 * Manually invalidate a cache entry. Used when real-time streams (e.g.
 * WebSocket prices) require bypassing stale cached data.
 */
export function invalidateCache(key: string): void {
  driver.delete(key);
}

/**
 * Convenience wrapper to fetch a URL and cache the parsed JSON response.
 * @param ttlMs Time to live for the cache entry
 */
export async function cachedJsonFetch<T>(
  url: string,
  ttlMs: number,
  fetchImpl: typeof fetch = fetch,
  init: RequestInit = {},
): Promise<T> {
  const cached = getCache<T>(url);
  if (cached) return cached;
  // All network requests go through fetchWithRetry to enforce a 10s timeout and
  // small exponential backoff. This protects the app from hanging on slow
  // public endpoints while remaining keyless.
  const res = await fetchWithRetry(url, { fetcher: fetchImpl, init });
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch (err) {
    throw new ParseError(
      `Failed to parse JSON from ${url}: ${(err as Error).message}`,
    );
  }
  setCache(url, data, ttlMs);
  return data;
}

export type { CacheEntry };
