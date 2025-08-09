import React, { useEffect, useState } from 'react';
import BentoCard from '../BentoCard';
import {
  fetchLiveQuotes,
  subscribeBinanceTicker,
  isCryptoSymbol,
  type QuoteResult,
} from '@/lib/finance/live';
import PricesTileEmpty from '../empty/PricesTileEmpty';

/** Default symbols shown when no user history is available */
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'BTC-USD'];

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
    <BentoCard title="Cours actuels">
      {quotes.length === 0 ? (
        <PricesTileEmpty />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Symbole</th>
              <th className="text-right">Prix</th>
              <th className="text-right">Var. %</th>
              <th className="text-right">État</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.symbol}>
                <td>{q.symbol}</td>
                <td className="text-right">{q.price.toFixed(2)}</td>
                <td
                  className={
                    q.changePercent >= 0
                      ? 'text-green-600 text-right'
                      : 'text-red-600 text-right'
                  }
                >
                  {q.changePercent.toFixed(2)}%
                </td>
                <td className="text-right">
                  <span
                    className={
                      q.marketState === 'REG'
                        ? 'bg-green-100 text-green-800 px-2 py-0.5 rounded'
                        : 'bg-gray-100 text-gray-800 px-2 py-0.5 rounded'
                    }
                  >
                    {/* Localize market state for French users */}
                    {q.marketState === 'REG' ? 'Ouvert' : 'Fermé'}
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
 * Server wrapper that fetches initial quotes before rendering the client
 * component. This allows the tile to be server-side rendered with data and
 * then hydrated on the client for periodic updates.
 */
export default async function CurrentPricesTile() {
  try {
    const quotes = await fetchLiveQuotes(DEFAULT_SYMBOLS);
    return <PricesClient initialQuotes={quotes} />;
  } catch (err) {
    // If the initial fetch fails (e.g. network error or rate limit), log the
    // error and render an empty tile so the dashboard still loads.
    console.error('failed to load initial quotes', err);
    return <PricesClient initialQuotes={[]} />;
  }
}
