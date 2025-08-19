// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { subscribeUIEvents, type UIEvent } from '../../lib/ui/events';

/**
 * Description of an annotation emitted by the `ui.add_annotation` tool.
 * The annotation is positioned by timestamp along the x‑axis and is
 * currently rendered at the top of the chart container.
 */
export interface AttentionAnnotation {
  /** Unique identifier returned when the annotation was created. */
  id: string;
  /** UNIX timestamp (seconds) indicating when the marker should appear. */
  at: number;
  /** Optional label describing the annotation. */
  text?: string;
  /** Optional type, e.g. 'note' or 'area'. */
  type?: string;
}

export interface AttentionLayerProps {
  /** Chart instance used to convert times to pixel coordinates. */
  chart: IChartApi;
  /** Series instance (currently unused but allows price based positioning later). */
  series?: ISeriesApi<'Candlestick' | 'Line'>;
  /** Symbol the annotations belong to so that unrelated events are ignored. */
  symbol: string;
  /** Identifier of the current chat for persistence. */
  chatId: string;
  /** User adding the annotation; required for persistence. */
  userId: string;
  /** Allows tests to stub network requests. */
  fetcher?: typeof fetch;
  /** Called when a marker is clicked. */
  onSelect?: (a: AttentionAnnotation) => void;
}

/**
 * Overlay component rendering annotations on top of a chart. It listens to the
 * global UI event bus for `add_annotation` and `remove_annotation` events and
 * displays simple labels that can trigger a callback when clicked.
 */
const AttentionLayer: React.FC<AttentionLayerProps> = ({
  chart,
  symbol,
  chatId,
  userId,
  fetcher = fetch,
  onSelect,
}) => {
  const [markers, setMarkers] = useState<AttentionAnnotation[]>([]);
  const [, forceUpdate] = useState(0);
  // Store pending annotation payloads so rapid hovers do not spam the API.
  const pending = useRef<any | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to annotation add/remove events.
  useEffect(() => {
    const unsubscribe = subscribeUIEvents(async (event: UIEvent) => {
      if (event.type === 'add_annotation' && event.payload.symbol === symbol) {
        const payload = event.payload as any;
        if (payload.id) {
          // Marker already persisted; just render it immediately.
          setMarkers((prev) => [...prev, payload]);
          return;
        }
        // Debounce persistence to avoid spamming the API when tools emit
        // multiple hover events in quick succession.
        pending.current = payload;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          const data = pending.current;
          pending.current = null;
          try {
            const res = await fetcher('/api/finance/attention', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                chatId,
                symbol,
                timeframe: data.timeframe,
                payload: { at: data.at, type: data.type, text: data.text },
              }),
            });
            const { id } = await res.json();
            setMarkers((prev) => [...prev, { ...data, id }]);
          } catch {
            /* ignore persistence errors */
          }
        }, 250);
      } else if (event.type === 'remove_annotation') {
        setMarkers((prev) => prev.filter((m) => m.id !== event.payload.id));
      }
    });
    return () => {
      unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [symbol, chatId, userId, fetcher]);

  // Re-render markers when the visible range changes so coordinates update.
  useEffect(() => {
    const ts = chart.timeScale();
    const handler = () => forceUpdate((n) => n + 1);
    ts.subscribeVisibleTimeRangeChange(handler);
    return () => ts.unsubscribeVisibleTimeRangeChange(handler);
  }, [chart]);

  // Helper converting a time to an x coordinate within the chart.
  const toX = (t: number) => {
    const x = chart.timeScale().timeToCoordinate(t as any);
    return x ?? 0;
  };

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid="attention-layer"
    >
      {markers.map((m) => (
        <button
          key={m.id}
          type="button"
          data-testid="attention-marker"
          className="pointer-events-auto absolute top-0 -translate-x-1/2 cursor-pointer bg-yellow-300 px-1 text-xs"
          style={{ left: `${toX(m.at)}px` }}
          onClick={() => onSelect?.(m)}
        >
          {m.text || m.type || 'marker'}
        </button>
      ))}
    </div>
  );
};

export default AttentionLayer;
