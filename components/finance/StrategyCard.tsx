 'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { useTranslations } from '@/i18n/useTranslations';
import type { Strategy } from '@/lib/db/schema';

/**
 * Renders a short summary of a saved trading strategy with status, last update
 * information and quick action links. The actions are placeholders for future
 * workflows such as running a new backtest or refining parameters.
 */
export default function StrategyCard({ strategy }: { strategy: Strategy }) {
  const t = useTranslations('finance.strategy');
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;
  return (
    <div className="flex flex-col gap-1 border rounded-md p-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{strategy.title}</span>
        {/* Human readable status badge */}
        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
          {t(`status.${strategy.status}`)}
        </span>
      </div>
      {/* Relative date of last update */}
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(strategy.updatedAt), {
          addSuffix: true,
          locale: dateLocale,
        })}
      </span>
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          className="text-xs underline"
          aria-label={t('actions.backtest')}
        >
          {t('actions.backtest')}
        </button>
        <button
          type="button"
          className="text-xs underline"
          aria-label={t('actions.refine')}
        >
          {t('actions.refine')}
        </button>
        <button
          type="button"
          className="text-xs underline"
          aria-label={t('actions.finalize')}
        >
          {t('actions.finalize')}
        </button>
      </div>
    </div>
  );
}

