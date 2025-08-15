import React from 'react';
import ListTileSkeleton from './ListTileSkeleton';
import fr from '@/messages/fr/dashboard.json' assert { type: 'json' };
import en from '@/messages/en/dashboard.json' assert { type: 'json' };

/**
 * Skeleton placeholder for the news tile. The title adapts to the active
 * locale so loading states remain bilingual.
 */
export default function NewsTileSkeleton({ locale }: { locale: string }) {
  const messages = locale === 'en' ? (en as any) : (fr as any);
  return <ListTileSkeleton title={messages.news.title} />;
}
