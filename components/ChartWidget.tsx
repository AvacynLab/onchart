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
  /** Optional technical studies to overlay such as `ema20` or `rsi14`. */
  studies?: string[];
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
  studies,
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
      if (studies) {
        applyStudies(chart, data, studies);
      }
    })();

    return () => {
      mounted = false;
      chart?.remove();
      setChart(null);
    };
  }, [symbol, interval, chartFactory, fetchCandles, studies]);

  // Live updates from the market WebSocket
  useEffect(() => {
    applyCandleUpdate(seriesRef.current, candle);
  }, [candle]);

  async function handleAnalysis() {
    try {
      await fetch(
        `/api/ai/analyse-asset?symbol=${encodeURIComponent(symbol)}&emitArtifact=1`,
      );
    } catch (error) {
      console.error('analysis failed', error);
    }
  }

  return (
    <div ref={containerRef} className="relative size-full">
      {chart && <AIAnnotations chart={chart} />}
      <button
        type="button"
        onClick={handleAnalysis}
        className="absolute top-2 right-2 rounded bg-blue-500 px-2 py-1 text-xs text-white"
      >
        Demander une analyse IA
      </button>
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

/**
 * Overlay technical studies on the chart such as moving averages or oscillators.
 *
 * @param chart - Chart instance where the overlays will be drawn.
 * @param candles - Historical OHLCV data used to compute indicators.
 * @param studies - List of studies identifiers (e.g. `ema20`, `rsi14`).
 */
export function applyStudies(
  chart: IChartApi,
  candles: Candle[],
  studies: string[],
): void {
  const closes = candles.map((c) => c.close);

  for (const study of studies) {
    if (study === 'ema20') {
      // 20-period Exponential Moving Average of closing prices
      const ema = computeEMA(closes, 20);
      const series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2 });
      series.setData(ema.map((value, i) => ({ time: candles[i].time, value })));
    } else if (study === 'rsi14') {
      // 14-period Relative Strength Index
      const rsi = computeRSI(closes, 14);
      const series = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 1,
        priceScaleId: 'rsi',
      });
      series.setData(rsi.map((value, i) => ({ time: candles[i].time, value })));
    }
  }
}

/**
 * Compute the Exponential Moving Average for the given values.
 *
 * @param values - Price series to smooth.
 * @param period - Window length for the EMA.
 */
export function computeEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  values.forEach((v, i) => {
    if (i === 0) {
      ema.push(v);
    } else {
      ema.push(v * k + ema[i - 1] * (1 - k));
    }
  });
  return ema;
}

/**
 * Compute the Relative Strength Index for the given values.
 *
 * @param values - Price series to analyze.
 * @param period - Window length for the RSI calculation.
 */
export function computeRSI(values: number[], period: number): number[] {
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(Math.max(change, 0));
    losses.push(Math.max(-change, 0));
  }

  const avgGains = computeEMA(gains, period);
  const avgLosses = computeEMA(losses, period);
  const rsi: number[] = [50]; // Start neutral for first sample

  for (let i = 1; i < values.length; i++) {
    const gain = avgGains[i - 1] ?? 0;
    const loss = avgLosses[i - 1] ?? 0;
    const rs = loss === 0 ? 100 : gain / loss;
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi;
}

