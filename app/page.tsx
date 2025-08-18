import { Bento } from '@/components/bento/Bento';

/**
 * Home page rendering the bento dashboard. On the server we attempt to
 * prefetch the default asset's quote and news so the client can hydrate with
 * cached data. Any network failures are swallowed to avoid crashing SSR.
 */
export default async function HomePage() {
  const symbol = 'AAPL';
  try {
    await Promise.all([
      fetch(`/api/finance/quote?symbol=${symbol}`, { cache: 'no-store' }),
      fetch(`/api/finance/news?symbol=${symbol}`, { cache: 'no-store' }),
    ]);
  } catch {
    // Ignore prefetch errors so the page still renders.
  }
  return <Bento />;
}
