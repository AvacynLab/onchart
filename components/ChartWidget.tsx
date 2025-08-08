"use client";

/* eslint-disable import/no-unresolved */
import React, { useEffect, useRef, useState } from 'react';
import type { CandlestickData, IChartApi, ISeriesApi } from 'lightweight-charts';
import useMarketSocket, { Candle } from '@/hooks/useMarketSocket';
import AIAnnotations from './AIAnnotations';

/**
 * Properties for the {@link ChartWidget} component.
 *
 * Optional props allow dependency injection to ease testing by
 * providing custom data fetchers, WebSocket hooks or chart factories.
 */
export interface ChartWidgetProps {
  /** Ticker symbol, e.g. `AAPL`. */
  symbol: string;
  /** Candle interval such as `1m` or `1h`. */
  interval: string;
  /**
   * Custom candle fetcher for tests. Defaults to fetching the API route
   * `/api/market/${symbol}/candles/${interval}`.
   */
  fetchCandles?: (symbol: string, interval: string) => Promise<Candle[]>;
  /** Allows injecting the chart factory in tests. */
  chartFactory?: { createChart: typeof import('lightweight-charts').createChart };
  /** Allows injecting a mock socket hook in tests. */
  socketHook?: typeof useMarketSocket;
}

/**
 * TradingView Lightweight Chart wrapper that displays candle data and
 * updates with real-time feed via {@link useMarketSocket}.
 */
export default function ChartWidget({
  symbol,
  interval,
  fetchCandles = defaultFetchCandles,
  chartFactory,
  socketHook = useMarketSocket,
}: ChartWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const { candle } = socketHook(symbol, interval);

  // Initialize chart and load historical candles when symbol/interval change
  useEffect(() => {
    let chart: IChartApi | null = null;
    let mounted = true;

    (async () => {
      const factory = chartFactory ?? (await import('lightweight-charts'));
      if (!mounted || !containerRef.current) return;
      chart = factory.createChart(containerRef.current);
      setChart(chart);
      seriesRef.current = chart.addCandlestickSeries();

      const data = await fetchCandles(symbol, interval);
      // Casting is safe as our {@link Candle} matches library expectations
      seriesRef.current.setData(data as unknown as CandlestickData[]);
    })();

    return () => {
      mounted = false;
      chart?.remove();
      setChart(null);
    };
  }, [symbol, interval, chartFactory, fetchCandles]);

  // Live updates from the market WebSocket
  useEffect(() => {
    applyCandleUpdate(seriesRef.current, candle);
  }, [candle]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {chart && <AIAnnotations chart={chart} />}
    </div>
  );
}

async function defaultFetchCandles(symbol: string, interval: string): Promise<Candle[]> {
  const res = await fetch(`/api/market/${symbol}/candles/${interval}`);
  return res.json();
}

/**
 * Helper that applies a new candle to the given chart series. Exported for
 * testing so we can verify that live updates are forwarded correctly.
 */
export function applyCandleUpdate(
  series: ISeriesApi<'Candlestick'> | null,
  candle: Candle | null,
): void {
  if (candle && series) {
    series.update(candle as unknown as CandlestickData);
  }
}

