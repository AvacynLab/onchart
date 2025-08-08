import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAIEvent } from '../AIAnnotations';
import type { AnnotationChart } from '../AIAnnotations';

test('applyAIEvent creates a shape on highlight-price events', () => {
  const shapes: any[] = [];
  const chart: AnnotationChart = {
    addShape: (config) => shapes.push(config),
  };

  applyAIEvent(chart, {
    type: 'highlight-price',
    symbol: 'AAPL',
    price: 123,
    ts: 1,
    label: 'test',
    level: 'success',
  });

  assert.equal(shapes.length, 1);
  assert.deepEqual(shapes[0], {
    price: 123,
    text: 'test',
    color: '#16a34a',
  });
});
