import React, { Suspense } from 'react';
import BentoGrid from '@/components/dashboard/BentoGrid';
import CurrentPricesTile, {
  DEFAULT_SYMBOLS,
} from '@/components/dashboard/tiles/CurrentPricesTile';
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
import fetchRssFeeds, { type NewsItem } from '@/lib/finance/sources/news';

/**
 * Dashboard landing page exposing the Bento layout.
 * Tiles are wrapped in Suspense so they can stream independently.
 */
export const revalidate = 0; // Always render on the server for fresh data.

/**
 * Home dashboard page. Data for the prices and news tiles is fetched on the
 * server so the initial render is already populated, improving perceived
 * performance and avoiding layout shifts.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: { chatId?: string };
}) {
  let quotes: QuoteResult[] = [];
  let news: NewsItem[] = [];

  // During Playwright runs the container lacks external network access. Skip
  // prefetching quotes and news so the dashboard renders immediately with
  // empty placeholders.
  if (!process.env.PLAYWRIGHT) {
    try {
      quotes = await fetchLiveQuotes(DEFAULT_SYMBOLS);
    } catch (err) {
      // If quote fetching fails we still render the dashboard; the tile will show
      // an empty state which is covered by tests.
      console.error('failed to prefetch quotes', err);
    }

    try {
      news = await fetchRssFeeds('business');
    } catch (err) {
      console.error('failed to prefetch news', err);
    }
  }

  return (
    <>
      <div className="p-4">
        <LanguageSwitcher />
      </div>
      <BentoGrid>
        <Suspense fallback={<PricesTileSkeleton />}>
          <CurrentPricesTile initialQuotes={quotes} />
        </Suspense>
        <Suspense fallback={<NewsTileSkeleton />}>
          <NewsTile items={news} />
        </Suspense>
        <Suspense fallback={<StrategiesTileSkeleton />}>
          <StrategiesTile chatId={searchParams?.chatId} />
        </Suspense>
        <Suspense fallback={<AnalysesTileSkeleton />}>
          <AnalysesTile chatId={searchParams?.chatId} />
        </Suspense>
        <MenuTile />
      </BentoGrid>
    </>
  );
}
