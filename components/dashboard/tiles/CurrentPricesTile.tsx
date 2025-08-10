import React, { useEffect, useState, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import BentoCard from '../BentoCard';
import {
  fetchLiveQuotes,
  subscribeBinanceTicker,
  isCryptoSymbol,
  type QuoteResult,
} from '@/lib/finance/live';
import PricesTileEmpty from '../empty/PricesTileEmpty';

/** Default symbols shown when no user history is available. Exported so the
 *  dashboard page can prefetch the same symbols on the server. */
export const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'BTC-USD'];

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

  useEffect(() => {
    const symbols = initialQuotes.map((q) => q.symbol);
    const cryptoSymbols = symbols.filter(isCryptoSymbol);
    const pollSymbols = symbols.filter((s) => !isCryptoSymbol(s));

    // Poll non-crypto symbols via internal API
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
        console.error('failed to refresh quotes', err);
      }
    }, 10_000);

    // Subscribe to Binance WebSocket for crypto symbols
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
  }, [initialQuotes]);

  return (
    <BentoCard title={t('title')} titleId={titleId}>
      {quotes.length === 0 ? (
        <PricesTileEmpty message={t('empty')} />
      ) : (
        <table
          className="w-full text-sm"
          aria-labelledby={titleId}
        >
          <thead>
            <tr>
              <th className="text-left">{t('symbol')}</th>
              <th className="text-right">{t('price')}</th>
              <th className="text-right">{t('change')}</th>
              <th className="text-right">{t('state.label')}</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.symbol}>
                <td>{q.symbol}</td>
                <td className="text-right">{numberFmt.format(q.price)}</td>
                <td
                  className={
                    q.changePercent >= 0
                      ? 'text-green-600 text-right'
                      : 'text-red-600 text-right'
                  }
                >
                  {numberFmt.format(q.changePercent)}%
                </td>
                <td className="text-right">
                  <span
                    className={
                      q.marketState === 'REG'
                        ? 'bg-green-100 text-green-800 px-2 py-0.5 rounded'
                        : 'bg-gray-100 text-gray-800 px-2 py-0.5 rounded'
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
