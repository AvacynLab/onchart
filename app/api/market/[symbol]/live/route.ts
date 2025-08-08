import { type NextRequest } from 'next/server';
import { initBus, sub, CHANNEL_TICK, CHANNEL_CANDLE } from '@/lib/market/bus';
import 'server-only';

export const runtime = 'edge';

/**
 * Maximum amount of unsent data (in bytes) allowed in the WebSocket buffer
 * before tick updates start getting dropped. Candles are still delivered
 * so the client can catch up once the buffer drains.
 */
const BACKPRESSURE_LIMIT = 64 * 1024; // 64 KiB

interface MarketTick {
  symbol: string;
  ts: number;
  price: number;
  volume: number;
}

interface MarketCandle {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tsStart: number;
  tsEnd: number;
}

/**
 * WebSocket endpoint streaming live market ticks and the latest candle.
 */
export async function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected "websocket"', { status: 400 });
  }

  const { 0: client, 1: server } = new WebSocketPair();
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get('interval') ?? '1m';
  const symbol = params.symbol.toUpperCase();

  server.accept();
  await initBus();

  const tickListener = (message: string) => {
    try {
      const tick: MarketTick = JSON.parse(message);
      if (tick.symbol !== symbol) return;
      // Apply a simple backpressure strategy: if the WebSocket buffer grows
      // beyond the threshold we drop the tick. Candles are still forwarded so
      // the client can resynchronise once the connection catches up.
      if (server.bufferedAmount > BACKPRESSURE_LIMIT) return;
      server.send(JSON.stringify({ type: 'tick', data: tick }));
    } catch (err) {
      console.warn('malformed tick message', err);
    }
  };

  const candleListener = (message: string) => {
    try {
      const candle: MarketCandle = JSON.parse(message);
      if (candle.symbol !== symbol || candle.interval !== interval) return;
      server.send(JSON.stringify({ type: 'candle', data: candle }));
    } catch (err) {
      console.warn('malformed candle message', err);
    }
  };

  await sub.subscribe(CHANNEL_TICK, tickListener);
  await sub.subscribe(CHANNEL_CANDLE, candleListener);

  server.addEventListener('close', async () => {
    await sub.unsubscribe(CHANNEL_TICK, tickListener);
    await sub.unsubscribe(CHANNEL_CANDLE, candleListener);
  });

  try {
    return new Response(null, { status: 101, webSocket: client });
  } catch {
    // Undici used in tests doesn't support 101 responses or the
    // `webSocket` option. Returning a plain object allows unit tests
    // to access the WebSocket instance directly.
    return { status: 200, webSocket: client } as any;
  }
}
