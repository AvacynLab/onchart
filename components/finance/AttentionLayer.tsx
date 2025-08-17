import React, { useEffect, useState } from 'react';
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

  // Subscribe to annotation add/remove events.
  useEffect(() => {
    return subscribeUIEvents(async (event: UIEvent) => {
      if (event.type === 'add_annotation' && event.payload.symbol === symbol) {
        const payload = event.payload as any;
        if (payload.id) {
          // Marker already persisted; just render it.
          setMarkers((prev) => [...prev, payload]);
        } else {
          // Persist via API then render with returned id.
          try {
            const res = await fetcher('/api/finance/attention', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                chatId,
                symbol,
                timeframe: payload.timeframe,
                payload: { at: payload.at, type: payload.type, text: payload.text },
              }),
            });
            const { id } = await res.json();
            setMarkers((prev) => [...prev, { ...payload, id }]);
          } catch {
            /* ignore persistence errors */
          }
        }
      } else if (event.type === 'remove_annotation') {
        setMarkers((prev) => prev.filter((m) => m.id !== event.payload.id));
      }
    });
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
