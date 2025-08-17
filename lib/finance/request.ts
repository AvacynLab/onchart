/**
 * Utility helpers for making HTTP requests with explicit timeout and retry
 * semantics. All finance data sources rely on public endpoints that may be
 * slow or unstable; adding a small retry with an abortable timeout helps keep
 * the system responsive.
 */
import { DataSourceError } from './errors';

/**
 * Fetch a URL with a timeout and limited number of retry attempts.
 * Between attempts an exponential backoff delay with small random jitter is
 * applied to avoid hammering flaky public endpoints and to prevent thundering
 * herd effects when many requests fail simultaneously.
 *
 * @param url - Request URL.
 * @param options.timeoutMs - Abort request if it exceeds this time (default 10s).
 * @param options.retries - Number of additional attempts after the first one.
 * @param options.backoffMs - Base delay in milliseconds used for exponential backoff (default 200ms).
 * @param options.fetcher - Custom fetch implementation for tests.
 * @param options.init - Additional RequestInit options.
 */
export async function fetchWithRetry(
  url: string,
  {
    timeoutMs = 10_000,
    retries = 2,
    backoffMs = 200,
    fetcher = fetch,
    init = {},
  }: {
    timeoutMs?: number;
    retries?: number;
    backoffMs?: number;
    fetcher?: typeof fetch;
    init?: RequestInit;
  } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    let timer: NodeJS.Timeout | undefined;
    const start = Date.now();
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const headers = new Headers(init.headers);
      if (!headers.has('User-Agent')) {
        headers.set('User-Agent', 'onchart-dev/alpha');
      }
      const res = await fetcher(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = new DataSourceError(
          `Request failed: ${res.status} ${res.statusText}`,
          { url, attempt, elapsedMs: Date.now() - start },
        );
        throw lastError;
      }
      return res;
    } catch (err) {
      lastError =
        err instanceof DataSourceError
          ? err
          : new DataSourceError((err as Error).message, {
              url,
              attempt,
              elapsedMs: Date.now() - start,
            });
      if (attempt < retries) {
        // Exponential backoff with jitter. The jitter (random 0..backoffMs)
        // prevents clients from retrying in lockstep which could otherwise
        // overload the free data providers.
        const baseDelay = backoffMs * 2 ** attempt;
        const jitter = Math.random() * backoffMs;
        await new Promise((r) => setTimeout(r, baseDelay + jitter));
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new DataSourceError('Request failed', { url, attempt: retries, elapsedMs: 0 });
}

