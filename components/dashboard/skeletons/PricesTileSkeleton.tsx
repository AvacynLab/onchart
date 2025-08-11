import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import { getTranslations } from 'next-intl/server';

/**
 * Skeleton for the current prices tile. Uses translations so the fallback title
 * respects the active UI locale.
 */
export default async function PricesTileSkeleton() {
  const t = await getTranslations('dashboard');
  return <ListTileSkeleton title={t('prices.title')} />;
}
