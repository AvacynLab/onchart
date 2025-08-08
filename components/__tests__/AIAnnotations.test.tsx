import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectAIAnnotations, type AnnotationChart } from '../AIAnnotations';

test('websocket message payload results in chart annotation', () => {
  const shapes: any[] = [];
  const chart: AnnotationChart = { addShape: (c) => shapes.push(c) };

  // Minimal WebSocket mock that can emit messages to listeners.
  class MockWebSocket {
    url: string;
    listeners: Record<string, Array<(ev: any) => void>> = {};
    constructor(url: string) {
      this.url = url;
    }
    addEventListener(type: string, fn: (ev: any) => void) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type]!.push(fn);
    }
    sendMessage(data: string) {
      this.listeners['message']?.forEach((fn) => fn({ data }));
    }
    close() {}
  }
  (global as any).WebSocket = MockWebSocket as any;

  const ws: any = connectAIAnnotations(chart);
  ws.sendMessage(
    JSON.stringify({ type: 'highlight-price', symbol: 'AAPL', price: 100, ts: 1 }),
  );

  assert.equal(shapes.length, 1);
  assert.deepEqual(shapes[0], { price: 100, text: undefined, color: undefined });

  ws.close();
});
