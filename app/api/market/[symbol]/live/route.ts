import { type NextRequest } from 'next/server';
import { marketEvents, type MarketTick, type MarketCandle } from '@/lib/market/events';
import 'server-only';

/**
 * WebSocket endpoint streaming live market ticks and the latest candle.
 */
export function GET(request: NextRequest, { params }: { params: { symbol: string } }) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected "websocket"', { status: 400 });
  }

  const { 0: client, 1: server } = new WebSocketPair();
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get('interval') ?? '1m';
  const symbol = params.symbol.toUpperCase();

  const tickListener = (tick: MarketTick) => {
    if (tick.symbol !== symbol) return;
    server.send(JSON.stringify({ type: 'tick', data: tick }));
  };

  const candleListener = (candle: MarketCandle) => {
    if (candle.symbol !== symbol || candle.interval !== interval) return;
    server.send(JSON.stringify({ type: 'candle', data: candle }));
  };

  server.accept();
  marketEvents.on('tick', tickListener);
  marketEvents.on('candle', candleListener);

  server.addEventListener('close', () => {
    marketEvents.off('tick', tickListener);
    marketEvents.off('candle', candleListener);
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
