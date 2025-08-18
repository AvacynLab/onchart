'use client';

import React from 'react';
import { useAsset } from '@/lib/asset/AssetContext';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';

/** Fetch helper used by SWR to retrieve news items. */
async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to load news');
  return (await res.json()) as { title: string; url: string; source: string }[];
}

/**
 * Displays a scrollable list of news headlines related to the currently
 * selected asset. A button allows summarising the feed into an artefact.
 */
export function NewsCard() {
  const { asset } = useAsset();
  const t = useTranslations('dashboard');
  const { data } = useSWR(
    () => `/api/finance/news?symbol=${asset.symbol}`,
    fetcher,
    { refreshInterval: 60_000 },
  );

  /**
   * Send the current list of headlines to the server so they can be persisted
   * as a basic analysis artefact. The server currently concatenates the
   * headlines rather than using an LLM to keep the implementation minimal.
   */
  async function summarise() {
    if (!data) return;
    try {
      await fetch('/api/finance/news/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: asset.symbol, items: data }),
      });
    } catch (err) {
      console.error('failed to summarise news', err);
    }
  }

  return (
    <div
      className="border rounded p-4 overflow-y-auto min-h-0 flex flex-col"
      data-testid="news-card"
    >
      <h2 className="mb-2 font-semibold text-sm">{t('bento.news')}</h2>
      <ul className="flex-1 space-y-2 text-sm">
        {data?.map((n) => (
          <li key={n.url}>
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {n.title}
            </a>
            <span className="block text-xs text-muted-foreground">
              {n.source}
            </span>
          </li>
        )) || <li className="text-muted-foreground">—</li>}
      </ul>
      <button
        type="button"
        className="mt-3 text-xs underline self-start"
        onClick={summarise}
      >
        {t('bento.summarize')}
      </button>
    </div>
  );
}
