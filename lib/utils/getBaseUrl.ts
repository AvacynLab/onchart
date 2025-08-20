import { headers as defaultHeaders } from 'next/headers';

/**
 * Determine the absolute base URL for server-side fetches.
 *
 * The helper checks forwarded headers set by proxies (e.g. Vercel) and
 * falls back to `NEXT_PUBLIC_VERCEL_URL` in production or `localhost` in
 * development. When the DEBUG_BASE_URL environment variable is set to `1`,
 * the chosen URL is logged to aid diagnosis in CI environments.
 */
export async function getBaseUrl(
  getHeaders: () => Headers | Promise<Headers> = defaultHeaders,
): Promise<string> {
  const debug = process.env.DEBUG_BASE_URL === '1';
  const h = await getHeaders();
  const proto = h.get('x-forwarded-proto');
  const host = h.get('x-forwarded-host');
  if (proto && host) {
    const url = `${proto}://${host}`;
    if (debug) console.log('[base-url] derived from forwarded headers', url);
    return url;
  }
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    if (debug) console.log('[base-url] using Vercel URL', url);
    return url;
  }
  if (debug) console.log('[base-url] falling back to http://localhost:3000');
  return 'http://localhost:3000';
}
