import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import fr from '@/messages/fr/dashboard.json' assert { type: 'json' };
import en from '@/messages/en/dashboard.json' assert { type: 'json' };

/**
 * Skeleton for the strategies tile, translating the title to match the current
 * locale.
 */
export default function StrategiesTileSkeleton({ locale }: { locale: string }) {
  const messages = locale === 'en' ? (en as any) : (fr as any);
  return <ListTileSkeleton title={messages.strategies.title} />;
}
