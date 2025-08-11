import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import { getTranslations } from 'next-intl/server';

/**
 * Skeleton for the analyses tile. The fallback title is localised using
 * `next-intl` so loading states remain bilingual.
 */
export default async function AnalysesTileSkeleton() {
  const t = await getTranslations('dashboard');
  return <ListTileSkeleton title={t('analyses.title')} />;
}
