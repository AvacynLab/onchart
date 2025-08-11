import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import { getTranslations } from 'next-intl/server';

/**
 * Skeleton placeholder for the news tile. Title is resolved through
 * `next-intl` so the loading state matches the active locale.
 */
export default async function NewsTileSkeleton() {
  const t = await getTranslations('dashboard');
  return <ListTileSkeleton title={t('news.title')} />;
}
