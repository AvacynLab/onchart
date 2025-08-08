import { type NextRequest } from 'next/server';
import { initBus, sub, CHANNEL_AI } from '@/lib/market/bus';
import 'server-only';

export const runtime = 'edge';

/**
 * WebSocket endpoint that relays AI events published on Redis to the browser.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected "websocket"', { status: 400 });
  }

  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  await initBus();

  const handler = (message: string) => {
    server.send(message);
  };

  await sub.subscribe(CHANNEL_AI, handler);

  server.addEventListener('close', async () => {
    await sub.unsubscribe(CHANNEL_AI, handler);
  });

  try {
    return new Response(null, { status: 101, webSocket: client });
  } catch {
    return { status: 200, webSocket: client } as any;
  }
}
