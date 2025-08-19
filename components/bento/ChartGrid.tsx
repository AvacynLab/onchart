// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import type { AssetState, Timeframe } from '@/lib/asset/AssetContext';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts';
import { emitSelection } from './emit-selection';
import useDebounce from '@/hooks/use-debounce';
import { computeOverlay, type Candle } from '@/lib/finance/overlays';

export interface ChartGridProps {
  /** Number of panes to display. */
  panes: 1 | 2 | 4;
  /** Asset information including the symbol to fetch. */
  asset: AssetState;
  /** Selected timeframe for the candles. */
  timeframe: Timeframe;
  /** Whether crosshair/zoom should be synchronised across panes. */
  sync: boolean;
}


/**
 * Render a grid of lightweight-charts instances. Each pane fetches its own
 * OHLC candles from the internal API and updates when the asset or timeframe
 * changes. When `sync` is enabled, scrolling one chart propagates to all
 * others to keep them aligned.
 */
export function ChartGrid({ panes, asset, timeframe, sync }: ChartGridProps) {
  const containerRefs = useRef<HTMLDivElement[]>([]);
  const charts = useRef<IChartApi[]>([]);
  const series = useRef<ISeriesApi<'Candlestick'>[]>([]);
  const clickHandlers = useRef<((p: MouseEventParams) => void)[]>([]);
  const markers = useRef<Record<number, any[]>>({});
  const overlays = useRef<Record<number, ISeriesApi<'Line'>[]>>({});
  const candleData = useRef<Record<number, Candle[]>>({});
  const debouncedSymbol = useDebounce(asset.symbol, 250);
  const debouncedTimeframe = useDebounce(timeframe, 250);

  // Instantiate charts and load data whenever the layout or asset changes.
  useEffect(() => {
    charts.current.forEach((c) => c.remove());
    charts.current = [];
    series.current = [];
    const controllers: AbortController[] = [];

    for (let i = 0; i < panes; i++) {
      const el = containerRefs.current[i];
      if (!el) continue;
      // Cast the chart instance to `any` because the `lightweight-charts`
      // typings bundled with the version used in tests do not yet expose the
      // `addCandlestickSeries` method on `IChartApi`. The cast keeps the build
      // type-safe elsewhere while avoiding compilation failures.
      const chart = createChart(el, {
        width: el.clientWidth,
        height: el.clientHeight,
        layout: { background: { color: '#ffffff' }, textColor: '#222' },
        grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
      }) as any;
      charts.current.push(chart as IChartApi);
      const s = chart.addCandlestickSeries();
      series.current.push(s as ISeriesApi<'Candlestick'>);

      // Emit a selection event whenever the user clicks a candle so the next
      // chat message can be anchored to the chosen timestamp.
      const clickHandler = (param: MouseEventParams) => {
        if (param.time === undefined) return;
        emitSelection(
          debouncedSymbol,
          debouncedTimeframe,
          (param.time as number) * 1000,
        );
      };
      chart.subscribeClick(clickHandler);
      clickHandlers.current[i] = clickHandler;

      const controller = new AbortController();
      controllers.push(controller);
      fetch(`/api/finance/ohlc?symbol=${debouncedSymbol}&interval=${debouncedTimeframe}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          const candles = data.candles.map((c: any) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          candleData.current[i] = candles;
          const chartData = candles.map((c: Candle) => ({
            time: (c.time / 1000) as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          s.setData(chartData);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error('ohlc fetch failed', err);
        });
    }

    return () => {
      controllers.forEach((c) => c.abort());
      charts.current.forEach((c, i) => {
        if (clickHandlers.current[i]) c.unsubscribeClick(clickHandlers.current[i]);
        c.remove();
      });
      charts.current = [];
      series.current = [];
      clickHandlers.current = [];
      markers.current = {};
      overlays.current = {};
      candleData.current = {};
    };
  }, [panes, debouncedSymbol, debouncedTimeframe]);

  // Simple synchronisation of visible range across panes when enabled.
  useEffect(() => {
    if (!sync || charts.current.length < 2) return;
    const main = charts.current[0];
    const others = charts.current.slice(1);
    const handler = () => {
      const range = main.timeScale().getVisibleLogicalRange();
      if (!range) return;
      others.forEach((c) => c.timeScale().setVisibleLogicalRange(range));
    };
    main.timeScale().subscribeVisibleLogicalRangeChange(handler);
    return () => {
      main.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
    };
  }, [sync, panes]);

  // Listen for overlay and annotation events so tools can augment charts.
  useEffect(() => {
    return ui.on((evt) => {
      if (evt.type === 'add_annotation') {
        const at = (evt.payload.at / 1000) as UTCTimestamp;
        const text = evt.payload.text;
        const paneIdx = 0; // currently annotate first pane
        const s = series.current[paneIdx];
        if (!s) return;
        const arr = markers.current[paneIdx] || [];
        arr.push({
          time: at,
          position: 'aboveBar',
          shape: 'arrowDown',
          color: 'red',
          text,
        });
        // Limit stored annotations to avoid performance degradation.
        const MAX_MARKERS = 100;
        markers.current[paneIdx] = arr.slice(-MAX_MARKERS);
        (s as any).setMarkers(markers.current[paneIdx]);
      }

      if (evt.type === 'add_overlay') {
        const { pane, kind, params } = evt.payload;
        const chart = charts.current[pane];
        const base = candleData.current[pane];
        if (!chart || !base) return;
        const data = computeOverlay(base, kind, params);
        if (!data.length) return;
        const line = chart.addLineSeries({ color: 'blue', lineWidth: 1 });
        line.setData(data);
        const arr = overlays.current[pane] || [];
        arr.push(line);
        overlays.current[pane] = arr;
      }
    });
  }, []);

  const gridClass =
    panes === 1
      ? 'grid grid-cols-1'
      : panes === 2
      ? 'grid grid-rows-2'
      : 'grid grid-cols-2 grid-rows-2';

  // Expose a stable test id so end-to-end tests can locate the grid.
  return (
    <div className={`min-h-0 ${gridClass}`} data-testid="chart-grid">
      {Array.from({ length: panes }).map((_, i) => (
        <div
          key={PANE_KEYS[i]}
          ref={(el) => {
            if (el) containerRefs.current[i] = el;
          }}
          data-testid="chart-pane"
          className="min-h-0"
        />
      ))}
    </div>
  );
}

export default ChartGrid;

