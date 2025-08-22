// @ts-nocheck
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { ui } from '@/lib/ui/events';

/**
 * Union describing the supported artifact payloads that can be visualised by
 * {@link ArtifactViewer}.
 */
export type Artifact = WorkflowArtifact | ChartArtifact;

/** Description of a workflow artifact consisting of ordered textual steps. */
export interface WorkflowArtifact {
  type: 'workflow';
  title: string;
  /**
   * Ordered steps forming the workflow. Each step may include a stable `id`
   * so list rendering can avoid using the array index as key. If absent, the
   * step content is assumed unique and used as a fallback key.
   */
  steps: Array<{ id?: string; content: string }>;
}

/**
 * Description of a chart artifact referencing a tradable symbol and timeframe.
 * Optional overlays and annotations can be provided to recreate the chart
 * state when displayed to the user.
 */
export interface ChartArtifact {
  type: 'chart';
  symbol: string;
  timeframe: string;
  /**
   * Optional indicator overlays to render on top of the base candlestick
   * series. Each overlay is expected to expose a `data` array of objects in
   * milliseconds since epoch. The shape is intentionally loose so agents can
   * supply pre-computed series for indicators like SMA, EMA, RSI or Bollinger
   * bands without the viewer needing to know their exact parameterisation.
   */
  overlays?: Array<{
    name: string;
    color?: string;
    data?: Array<{ time: number; value: number }>;
    upper?: Array<{ time: number; value: number }>;
    lower?: Array<{ time: number; value: number }>;
    middle?: Array<{ time: number; value: number }>;
  }>;
  /** Optional annotation markers rendered above candles. */
  annotations?: Array<{ at: number; text: string }>;
}

/**
 * Render an artifact either as a numbered workflow or an interactive chart.
 *
 * When the artifact represents a chart, candle clicks emit a typed
 * `ask_about_selection` event so agents can react to user questions about
 * specific timestamps. A button allows opening the selection directly in the
 * chat by passing an `anchor` query string.
 */
export function ArtifactViewer({
  artifact,
  createChartFn,
  useRouterHook,
}: {
  artifact: Artifact;
  /** Optional factory for injecting a stubbed chart implementation in tests. */
  createChartFn?: (container: HTMLElement, options: any) => IChartApi;
  /** Optional hook override to stub `useRouter` during tests. */
  useRouterHook?: typeof useRouter;
}) {
  if (artifact.type === 'workflow') {
    return (
      <div>
        <h2 className="font-semibold mb-2">{artifact.title}</h2>
        <ol className="list-decimal pl-4">
          {artifact.steps.map((s) => (
            // Use the step `id` when available; otherwise fall back to the
            // content which is expected to be unique within the workflow.
            <li key={s.id ?? s.content} className="mb-1">
              {s.content}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <ChartViewer
      artifact={artifact as ChartArtifact}
      createChartFn={createChartFn}
      useRouterHook={useRouterHook}
    />
  );
}

/** Internal component handling chart rendering and interactions. */
function ChartViewer({
  artifact,
  createChartFn,
  useRouterHook = useRouter,
}: {
  artifact: ChartArtifact;
  createChartFn?: (container: HTMLElement, options: any) => IChartApi;
  useRouterHook?: typeof useRouter;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const router = useRouterHook();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let chart: any;
    let series: any;

    // Initialise the chart on the next animation frame to ensure the DOM
    // container has been laid out. Without this some tests could attempt to
    // interact with a canvas that has zero dimensions.
    const raf: typeof requestAnimationFrame =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => cb(0);
    const caf: typeof cancelAnimationFrame =
      typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : clearTimeout;

    const frameId = raf(async () => {
      const creator =
        createChartFn ?? (await import('lightweight-charts')).createChart;
      chart = creator(el, {
        width: el.clientWidth,
        height: el.clientHeight,
        layout: { background: { color: '#ffffff' }, textColor: '#222' },
        grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
      }) as any;
      chartRef.current = chart as IChartApi;
      series = chart.addCandlestickSeries();
      seriesRef.current = series as ISeriesApi<'Candlestick'>;

      // Fetch OHLC candles for the chart.
      fetch(
        `/api/finance/ohlc?symbol=${artifact.symbol}&interval=${artifact.timeframe}`,
      )
        .then((r) => r.json())
        .then((data) => {
          const candles = data.candles.map((c: any) => ({
            time: (c.time / 1000) as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          series.setData(candles);
        })
        .catch((err) => console.error('artifact ohlc fetch failed', err));

      // Apply technical indicator overlays. Each overlay can either provide a
      // single `data` series or Bollinger-like `upper`/`lower`/`middle` bands.
      artifact.overlays?.forEach((o) => {
        const toLineData = (pts?: Array<{ time: number; value: number }>) =>
          pts?.map((p) => ({
            time: (p.time / 1000) as UTCTimestamp,
            value: p.value,
          })) ?? [];
        if (o.data?.length) {
          const line = chart.addLineSeries({ color: o.color || '#2962FF' });
          line.setData(toLineData(o.data));
        }
        if (o.upper?.length && o.lower?.length && o.middle?.length) {
          const upper = chart.addLineSeries({ color: o.color || '#FF6D00' });
          const lower = chart.addLineSeries({ color: o.color || '#FF6D00' });
          const mid = chart.addLineSeries({ color: o.color || '#FF6D00' });
          upper.setData(toLineData(o.upper));
          lower.setData(toLineData(o.lower));
          mid.setData(toLineData(o.middle));
        }
      });

      // Apply annotations if provided.
      if (artifact.annotations?.length) {
        series.setMarkers(
          artifact.annotations.map((a) => ({
            time: (a.at / 1000) as UTCTimestamp,
            position: 'aboveBar',
            shape: 'arrowDown',
            color: 'red',
            text: a.text,
          })),
        );
      }

      // Emit an event when the user clicks a candle.
      chart.subscribeClick((param: any) => {
        if (param.time) {
          const ts = (param.time as number) * 1000;
          setSelected(ts);
          ui.emit({
            type: 'ask_about_selection',
            payload: {
              symbol: artifact.symbol,
              timeframe: artifact.timeframe,
              at: ts,
              kind: 'candle',
            },
          });
        }
      });
    });

    return () => {
      caf(frameId as any);
      chart?.remove?.();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [artifact, createChartFn]);

  function openInChat() {
    if (!selected) return;
    const anchor = `${artifact.symbol},${artifact.timeframe},${selected}`;
    router.push(`/chat?anchor=${encodeURIComponent(anchor)}`);
  }

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="h-64" data-testid="artifact-view" />
      <button
        type="button"
        onClick={openInChat}
        disabled={!selected}
        className="mt-2 self-start border rounded px-2 py-1 text-sm"
      >
        Ouvrir dans le chat
      </button>
    </div>
  );
}

export default ArtifactViewer;
