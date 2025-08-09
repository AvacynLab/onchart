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

const CAPACITY = 100; // maximum number of entries
const store = new Map<string, CacheEntry<unknown>>();

/** Default TTL for intraday data (approx. 15s). */
export const INTRADAY_TTL_MS = 15_000;
/** Default TTL for daily data (approx. 5min). */
export const DAILY_TTL_MS = 300_000;

/**
 * Retrieve a value from cache if it exists and has not expired.
 */
export function getCache<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  // refresh LRU order by reinserting
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

/**
 * Store a value in cache with a time to live in milliseconds.
 */
export function setCache<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= CAPACITY) {
    // delete oldest entry
    const oldestKey = store.keys().next().value as string | undefined;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/**
 * Manually invalidate a cache entry. Used when real-time streams (e.g.
 * WebSocket prices) require bypassing stale cached data.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Convenience wrapper to fetch a URL and cache the parsed JSON response.
 * @param ttlMs Time to live for the cache entry
 */
export async function cachedJsonFetch<T>(
  url: string,
  ttlMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const cached = getCache<T>(url);
  if (cached) return cached;
  const res = await fetchWithRetry(url, { fetcher: fetchImpl });
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
