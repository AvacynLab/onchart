import React, { Suspense } from 'react';
import { getLocale } from 'next-intl/server';
import BentoGrid from '@/components/dashboard/BentoGrid';
import CurrentPricesTile from '@/components/dashboard/tiles/CurrentPricesTile';
import { DEFAULT_SYMBOLS } from '@/lib/finance/default-symbols';
import NewsTile from '@/components/dashboard/tiles/NewsTile';
import StrategiesTile from '@/components/dashboard/tiles/StrategiesTile';
import AnalysesTile from '@/components/dashboard/tiles/AnalysesTile';
import MenuTile from '@/components/dashboard/tiles/MenuTile';
import PricesTileSkeleton from '@/components/dashboard/skeletons/PricesTileSkeleton';
import NewsTileSkeleton from '@/components/dashboard/skeletons/NewsTileSkeleton';
import StrategiesTileSkeleton from '@/components/dashboard/skeletons/StrategiesTileSkeleton';
import AnalysesTileSkeleton from '@/components/dashboard/skeletons/AnalysesTileSkeleton';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { fetchLiveQuotes, type QuoteResult } from '@/lib/finance/live';
import { fetchRssFeeds, type NewsItem } from '@/lib/finance/sources/news';

/**
 * Dashboard landing page exposing the Bento layout.
 * Tiles are wrapped in Suspense so they can stream independently.
 *
 * Data is cached briefly to avoid fetching live prices and news on every
 * request. A small revalidation window keeps information reasonably fresh
 * without overloading upstream sources.
 */
export const revalidate = 15; // Revalidate server-rendered data every 15s.

/**
 * Home dashboard page. Data for the prices and news tiles is fetched on the
 * server so the initial render is already populated, improving perceived
 * performance and avoiding layout shifts.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ chatId?: string }>;
}) {
  // `searchParams` is a Promise in Next.js 15 when using partial pre-rendering.
  // Await it before accessing properties to avoid dynamic API warnings.
  const params = await searchParams;
  let quotes: QuoteResult[] = [];
  let news: NewsItem[] = [];

  // During Playwright runs the container lacks external network access. Skip
  // prefetching quotes and news so the dashboard renders immediately with
  // empty placeholders.
  if (!process.env.PLAYWRIGHT) {
    try {
      quotes = await fetchLiveQuotes(DEFAULT_SYMBOLS);
    } catch (err) {
      // Next.js uses a special `react.postpone` symbol to signal that a
      // `no-store` fetch requires dynamic rendering. If we catch that object the
      // build fails; rethrow it so Next can handle the bailout correctly.
      if ((err as any)?.$$typeof === Symbol.for('react.postpone')) throw err;
      // If quote fetching fails we still render the dashboard; the tile will show
      // an empty state which is covered by tests.
      console.error('failed to prefetch quotes', err);
    }

    try {
      news = await fetchRssFeeds('business');
    } catch (err) {
      if ((err as any)?.$$typeof === Symbol.for('react.postpone')) throw err;
      console.error('failed to prefetch news', err);
    }
  }

  const locale = await getLocale();
  return (
    <>
      <div className="p-4">
        <LanguageSwitcher />
      </div>
      <BentoGrid>
        <Suspense fallback={<PricesTileSkeleton locale={locale} />}>
          <CurrentPricesTile initialQuotes={quotes} />
        </Suspense>
        <Suspense fallback={<NewsTileSkeleton locale={locale} />}>
          <NewsTile items={news} />
        </Suspense>
        <Suspense fallback={<StrategiesTileSkeleton locale={locale} />}>
          <StrategiesTile chatId={params?.chatId} />
        </Suspense>
        <Suspense fallback={<AnalysesTileSkeleton locale={locale} />}>
          <AnalysesTile chatId={params?.chatId} />
        </Suspense>
        <MenuTile />
      </BentoGrid>
    </>
  );
}
