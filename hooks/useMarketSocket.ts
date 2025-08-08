import { useEffect, useRef, useState } from 'react';

/**
 * Represents a single market tick.
 */
export interface Tick {
  /** Unix epoch milliseconds when the trade occurred. */
  ts: number;
  /** Traded price. */
  price: number;
  /** Traded volume. */
  volume: number;
}

/**
 * OHLCV candle structure expected by the chart library.
 */
export interface Candle {
  /** Candle open time in seconds since epoch (Lightweight Charts format). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SocketState {
  tick?: Tick;
  candle?: Candle;
}

/**
 * Hook establishing a WebSocket connection to the market feed.
 *
 * The hook automatically reconnects when the connection drops and
 * throttles incoming messages to at most 5 Hz (one update every 200 ms).
 */
export default function useMarketSocket(symbol: string, interval: string): SocketState {
  const [state, setState] = useState<SocketState>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    let active = true;

    const connect = () => {
      const ws = new WebSocket(`/api/market/${symbol}/live?interval=${interval}`);
      wsRef.current = ws;

      ws.addEventListener('message', (event) => {
        const now = Date.now();
        // Throttle messages to 5 Hz
        if (now - lastUpdateRef.current < 200) {
          return;
        }
        lastUpdateRef.current = now;
        try {
          const msg = JSON.parse(event.data);
          if (!active) return;
          if (msg.type === 'tick') {
            setState((s) => ({ ...s, tick: msg.data as Tick }));
          } else if (msg.type === 'candle') {
            setState((s) => ({ ...s, candle: msg.data as Candle }));
          }
        } catch {
          // ignore malformed payloads
        }
      });

      const scheduleReconnect = () => {
        if (!active) return;
        reconnectRef.current = setTimeout(connect, 1000);
      };

      ws.addEventListener('close', scheduleReconnect);
      ws.addEventListener('error', scheduleReconnect);
    };

    connect();

    return () => {
      active = false;
      wsRef.current?.close();
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
  }, [symbol, interval]);

  return state;
}

