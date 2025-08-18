import { render, screen } from '@testing-library/react';
import { vi, expect, test, beforeEach } from 'vitest';
import ArtifactViewer from '@/components/artifact/ArtifactViewer';
import { ui } from '@/lib/ui/events';

// Mock lightweight-charts so we can trigger click handlers manually.
vi.mock('lightweight-charts', () => {
  return {
    createChart: vi.fn(() => ({
      addCandlestickSeries: vi.fn(() => ({
        setData: vi.fn(),
        setMarkers: vi.fn(),
      })),
      subscribeClick: vi.fn(),
      remove: vi.fn(),
    })),
  };
});

// Provide a stub fetch implementation for OHLC requests.
beforeEach(() => {
  global.fetch = vi.fn(async () => ({ json: async () => ({ candles: [] }) })) as any;
});

test('renders workflow steps', () => {
  render(
    <ArtifactViewer
      artifact={{
        type: 'workflow',
        title: 'Plan',
        steps: [{ content: 'first' }, { content: 'second' }],
      }}
    />,
  );
  expect(screen.getByText('first')).toBeInTheDocument();
  expect(screen.getByText('second')).toBeInTheDocument();
});

test('emits ask_about_selection on candle click', () => {
  const emit = vi.spyOn(ui, 'emit');
  render(
    <ArtifactViewer
      artifact={{ type: 'chart', symbol: 'AAPL', timeframe: '1h' }}
    />,
  );
  const { createChart } = require('lightweight-charts') as any;
  const chart = createChart.mock.results[0].value;
  const handler = chart.subscribeClick.mock.calls[0][0];
  handler({ time: 123 });
  expect(emit).toHaveBeenCalledWith({
    type: 'ask_about_selection',
    payload: { symbol: 'AAPL', timeframe: '1h', at: 123000, kind: 'candle' },
  });
  emit.mockRestore();
});
