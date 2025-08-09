/**
 * Utility helpers for making HTTP requests with explicit timeout and retry
 * semantics. All finance data sources rely on public endpoints that may be
 * slow or unstable; adding a small retry with an abortable timeout helps keep
 * the system responsive.
 */
import { DataSourceError } from './errors';

/**
 * Fetch a URL with a timeout and limited number of retry attempts.
 * Between attempts an exponential backoff delay is applied to avoid hammering
 * flaky public endpoints.
 *
 * @param url - Request URL.
 * @param options.timeoutMs - Abort request if it exceeds this time (default 8s).
 * @param options.retries - Number of additional attempts after the first one.
 * @param options.backoffMs - Base delay in milliseconds used for exponential backoff (default 200ms).
 * @param options.fetcher - Custom fetch implementation for tests.
 * @param options.init - Additional RequestInit options.
 */
export async function fetchWithRetry(
  url: string,
  {
    timeoutMs = 8_000,
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
    try {
      const controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetcher(url, { ...init, signal: controller.signal });
      if (!res.ok) {
        throw new DataSourceError(
          `Request failed: ${res.status} ${res.statusText}`,
        );
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = backoffMs * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new DataSourceError('Request failed');
}

export default fetchWithRetry;
