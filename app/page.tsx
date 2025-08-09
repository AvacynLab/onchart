import React, { Suspense } from 'react';
import BentoGrid from '@/components/dashboard/BentoGrid';
import CurrentPricesTile from '@/components/dashboard/tiles/CurrentPricesTile';
import NewsTile from '@/components/dashboard/tiles/NewsTile';
import StrategiesTile from '@/components/dashboard/tiles/StrategiesTile';
import AnalysesTile from '@/components/dashboard/tiles/AnalysesTile';
import MenuTile from '@/components/dashboard/tiles/MenuTile';
import PricesTileSkeleton from '@/components/dashboard/skeletons/PricesTileSkeleton';
import NewsTileSkeleton from '@/components/dashboard/skeletons/NewsTileSkeleton';
import StrategiesTileSkeleton from '@/components/dashboard/skeletons/StrategiesTileSkeleton';
import AnalysesTileSkeleton from '@/components/dashboard/skeletons/AnalysesTileSkeleton';

/**
 * Dashboard landing page exposing the Bento layout.
 * Tiles are wrapped in Suspense so they can stream independently.
 */
export const revalidate = 0; // Always render on the server for fresh data.

export default function HomePage({
  searchParams,
}: {
  searchParams: { chatId?: string };
}) {
  return (
    <BentoGrid>
      <Suspense fallback={<PricesTileSkeleton />}>
        <CurrentPricesTile />
      </Suspense>
      <Suspense fallback={<NewsTileSkeleton />}>
        <NewsTile />
      </Suspense>
      <Suspense fallback={<StrategiesTileSkeleton />}>
        <StrategiesTile chatId={searchParams?.chatId} />
      </Suspense>
      <Suspense fallback={<AnalysesTileSkeleton />}>
        <AnalysesTile chatId={searchParams?.chatId} />
      </Suspense>
      <MenuTile />
    </BentoGrid>
  );
}
