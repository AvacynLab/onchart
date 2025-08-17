'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from '@/i18n/useTranslations';
import type { AnalysisSummary } from './AnalysesTile';
import AnalysisList from './AnalysisList';

interface Props {
  /** Analyses and research summaries to render */
  items: AnalysisSummary[];
  /** id of title element so lists can reference it */
  titleId: string;
}

/**
 * Client component implementing simple filtering by type and symbol.
 */
export default function AnalysesTileClient({ items, titleId }: Props) {
  const t = useTranslations('dashboard.analyses');
  const locale = useLocale();
  const [typeFilter, setTypeFilter] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');

  const filtered = items.filter((i) => {
    const typeMatch = typeFilter ? i.type === typeFilter : true;
    const symbolMatch = symbolFilter
      ? i.symbol?.toLowerCase().includes(symbolFilter.toLowerCase())
      : true;
    return typeMatch && symbolMatch;
  });

  const uniqueTypes = Array.from(new Set(items.map((i) => i.type)));

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <select
          aria-label={t('filters.typeLabel')}
          className="border p-1 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">{t('filters.allTypes')}</option>
          {uniqueTypes.map((tVal) => (
            <option key={tVal} value={tVal} className="capitalize">
              {tVal}
            </option>
          ))}
        </select>
        <input
          aria-label={t('filters.symbolLabel')}
          type="text"
          placeholder={t('filters.symbol')}
          className="flex-1 border p-1 text-sm"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
      </div>
      <AnalysisList
        items={filtered}
        locale={locale}
        emptyLabel={t('empty')}
        labelledBy={titleId}
      />
    </div>
  );
}

