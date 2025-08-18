// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
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
  steps: Array<{ content: string }>;
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
  overlays?: any[];
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
export function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  if (artifact.type === 'workflow') {
    return (
      <div>
        <h2 className="font-semibold mb-2">{artifact.title}</h2>
        <ol className="list-decimal pl-4">
          {artifact.steps.map((s, idx) => (
            <li key={idx} className="mb-1">
              {s.content}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return <ChartViewer artifact={artifact} />;
}

/** Internal component handling chart rendering and interactions. */
function ChartViewer({ artifact }: { artifact: ChartArtifact }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Cast to `any` to work around missing `addCandlestickSeries` in the
    // ambient typings shipped with `lightweight-charts` during tests.
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: { background: { color: '#ffffff' }, textColor: '#222' },
      grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
    }) as any;
    chartRef.current = chart as IChartApi;
    const series = chart.addCandlestickSeries();
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

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [artifact]);

  function openInChat() {
    if (!selected) return;
    const anchor = `${artifact.symbol},${artifact.timeframe},${selected}`;
    router.push(`/chat?anchor=${encodeURIComponent(anchor)}`);
  }

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="h-64" />
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
