import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import fr from '@/messages/fr/dashboard.json' assert { type: 'json' };
import en from '@/messages/en/dashboard.json' assert { type: 'json' };

/**
 * Skeleton for the current prices tile. Chooses the title based on the
 * resolved locale so loading states remain translated.
 */
export default function PricesTileSkeleton({ locale }: { locale: string }) {
  const messages = locale === 'en' ? (en as any) : (fr as any);
  return <ListTileSkeleton title={messages.prices.title} />;
}
