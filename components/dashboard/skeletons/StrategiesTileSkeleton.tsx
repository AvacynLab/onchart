import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import { getTranslations } from 'next-intl/server';

/**
 * Skeleton for the strategies tile, translating the title to match the current
 * locale.
 */
export default async function StrategiesTileSkeleton() {
  const t = await getTranslations('dashboard');
  return <ListTileSkeleton title={t('strategies.title')} />;
}
