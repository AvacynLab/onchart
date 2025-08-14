import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import fr from '@/messages/fr/dashboard.json' assert { type: 'json' };
import en from '@/messages/en/dashboard.json' assert { type: 'json' };

/**
 * Skeleton for the analyses tile. The title is translated according to the
 * current locale so users see a localized loading state.
 */
export default function AnalysesTileSkeleton({ locale }: { locale: string }) {
  const messages = locale === 'en' ? (en as any) : (fr as any);
  return <ListTileSkeleton title={messages.analyses.title} />;
}
