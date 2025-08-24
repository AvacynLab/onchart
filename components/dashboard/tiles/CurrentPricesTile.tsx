'use client';

import React, { useEffect, useState, useId } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from '@/i18n/useTranslations';
import cx from 'clsx';
import BentoCard from '../BentoCard';
import {
  fetchLiveQuotes,
  subscribeBinanceTicker,
  isCryptoSymbol,
  type QuoteResult,
} from '@/lib/finance/live';
import { DEFAULT_SYMBOLS } from '@/lib/finance/default-symbols';
import PricesTileEmpty from '../empty/PricesTileEmpty';

/**
 * Client component responsible for rendering the list of quotes and refreshing
 * them every 10 seconds to provide near real-time updates.
 */
export function PricesClient({
  initialQuotes,
}: {
  initialQuotes: QuoteResult[];
}) {
  'use client';
  const t = useTranslations('dashboard.prices');
  const locale = useLocale();
  const numberFmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Generate a stable id so the table can reference the card's heading via
  // `aria-labelledby` for better screen-reader announcements.
  const titleId = useId();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>(
    initialQuotes.length === 0 ? 'loading' : 'ok',
  );

  /**
   * Fetch latest quotes and update state accordingly.
   */
  async function fetchPrices() {
    setStatus('loading');
    try {
      const fresh = await fetchLiveQuotes(DEFAULT_SYMBOLS);
      setQuotes(fresh);
      setStatus('ok');
    } catch (err) {
      console.debug('quote fetch failed', err);
      setStatus('error');
    }
  }

  // Attempt initial fetch when the server provided no quotes.
  useEffect(() => {
    if (initialQuotes.length === 0) {
      void fetchPrices();
    }
  }, [initialQuotes]);

  // Keep quotes refreshed every 10 seconds and via Binance websocket.
  useEffect(() => {
    if (status !== 'ok') return;
    const symbols = quotes.map((q) => q.symbol);
    const cryptoSymbols = symbols.filter(isCryptoSymbol);
    const pollSymbols = symbols.filter((s) => !isCryptoSymbol(s));

    const id = setInterval(async () => {
      if (pollSymbols.length === 0) return;
      try {
        const fresh = await fetchLiveQuotes(pollSymbols);
        setQuotes((prev) => {
          const map = new Map(prev.map((q) => [q.symbol, q]));
          fresh.forEach((q) => map.set(q.symbol, q));
          return Array.from(map.values());
        });
      } catch (err) {
        console.debug('failed to refresh quotes', err);
      }
    }, 10_000);

    const unsubs = cryptoSymbols.map((s) =>
      subscribeBinanceTicker(s, (quote) =>
        setQuotes((prev) =>
          prev.map((q) => (q.symbol === quote.symbol ? quote : q)),
        ),
      ),
    );

    return () => {
      clearInterval(id);
      unsubs.forEach((u) => u());
    };
  }, [quotes, status]);

  return (
    <BentoCard
      title={t('title')}
      titleId={titleId}
      titleTestId="tile-prices-title"
    >
      {status === 'ok' && quotes.length > 0 ? (
        <table className="w-full text-sm" aria-labelledby={titleId}>
          <thead>
            <tr>
              <th className="text-left">{t('symbol')}</th>
              <th className="text-right">{t('price')}</th>
              <th className="text-right">{t('change')}</th>
              <th className="text-right">{t('state.label')}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.filter(Boolean).map((q) => (
              <tr key={q.symbol}>
                <td>{q.symbol}</td>
                <td className="text-right">{numberFmt.format(q.price)}</td>
                {/*
                 * Use higher-contrast green/red tones for price movements and
                 * provide darker-mode variants so the values remain legible on
                 * both themes.
                 */}
                <td
                  className={cx('text-right', {
                    'text-green-600 dark:text-green-400':
                      typeof q.changePercent === 'number' &&
                      q.changePercent >= 0,
                    'text-red-600 dark:text-red-400':
                      typeof q.changePercent === 'number' &&
                      q.changePercent < 0,
                  })}
                >
                  {typeof q.changePercent === 'number'
                    ? `${numberFmt.format(q.changePercent)}%`
                    : '—'}
                </td>
                <td className="text-right">
                  {/*
                   * Badge colours are also theme-aware so the market state is
                   * distinguishable in both light and dark modes.
                   */}
                  <span
                    className={
                      q.marketState === 'REG'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-2 py-0.5 rounded'
                    }
                  >
                    {q.marketState === 'REG'
                      ? t('state.open')
                      : t('state.closed')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-2">
          <PricesTileEmpty message={t('offline')} />
          <button
            type="button"
            onClick={fetchPrices}
            className="text-sm underline"
            data-testid="prices-retry"
          >
            {t('retry')}
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      )}
    </BentoCard>
  );
}

/**
 * Server component expecting pre-fetched quotes from the dashboard page. The
 * heavy lifting is done in {@link PricesClient} which hydrates on the client
 * and keeps quotes up to date.
 */
export default function CurrentPricesTile({
  initialQuotes,
}: {
  /** Quotes rendered on first paint */
  initialQuotes: QuoteResult[];
}) {
  return <PricesClient initialQuotes={initialQuotes} />;
}
