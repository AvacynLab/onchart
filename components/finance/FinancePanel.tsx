'use client';

import React, { useEffect, useRef, useState } from 'react';
import ChartPanel, { type ChartPanelRef } from './ChartPanel';
import ChartToolbar from './ChartToolbar';
import AttentionLayer from './AttentionLayer';
import SymbolRecent from './SymbolRecent';
import {
  subscribeUIEvents,
  emitUIEvent,
  type UIEvent,
} from '../../lib/ui/events';
import { toastFinanceError } from '@/components/toast';

/**
 * FinancePanel renders a collapsible sidebar containing the chart and its
 * toolbar. It listens for `show_chart` events on the UI bus and fetches OHLC
 * data from the server when requested by the agent.
 */
export default function FinancePanel({
  chatId,
  userId,
  subscribe = subscribeUIEvents,
  fetcher = fetch,
  createChartFn,
}: {
  /** Identifier of the current chat for DB lookups. */
  chatId: string;
  /** Identifier of the current user for annotation persistence. */
  userId: string;
  /** Allows tests to inject a custom subscription mechanism. */
  subscribe?: typeof subscribeUIEvents;
  /** Allows tests to mock network requests. */
  fetcher?: typeof fetch;
  /** Optional chart factory passed to ChartPanel for testing. */
  createChartFn?: any;
}) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1h' | '1d'>('1d');
  const [seriesType, setSeriesType] = useState<'candlestick' | 'line'>('candlestick');
  const [recent, setRecent] = useState<string[]>([]);
  const [range, setRange] = useState<string | undefined>();
  const chartRef = useRef<ChartPanelRef>(null);
  const [chart, setChart] = useState<any>();

  // Load recent symbols from localStorage on first render.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('finance:recent');
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist the list whenever it changes.
  useEffect(() => {
    try {
      window.localStorage.setItem('finance:recent', JSON.stringify(recent));
    } catch {
      /* ignore */
    }
  }, [recent]);

  // Helper adding a symbol to the recent list.
  const rememberSymbol = (s: string) => {
    setRecent((prev) => [s, ...prev.filter((p) => p !== s)].slice(0, 5));
  };

  // Helper fetching data from the server and updating the chart.
  const loadData = async (
    sym: string,
    tf: string,
    range?: string,
  ) => {
    const params = new URLSearchParams({ symbol: sym, interval: tf });
    if (range) params.set('range', range);
    try {
      const res = await fetcher(`/api/finance/ohlc?${params.toString()}`);
      if (!('ok' in res) || !res.ok) {
        toastFinanceError(`Request failed: ${(res as any).status}`);
        chartRef.current?.setData([]);
        setChart(chartRef.current?.getChart());
        return false;
      }
      const json = await res.json();
      chartRef.current?.setData(json.candles ?? []);
      setChart(chartRef.current?.getChart());
      rememberSymbol(sym);

      // Fetch existing attention markers for this chat/symbol/timeframe.
      const attParams = new URLSearchParams({
        chatId,
        symbol: sym,
        timeframe: tf,
      });
      try {
        const resMarks = await fetcher(
          `/api/finance/attention?${attParams.toString()}`,
        );
        const marks = await resMarks.json();
        setTimeout(() => {
          marks.forEach((m: any) =>
            emitUIEvent({
              type: 'add_annotation',
              payload: { symbol: sym, timeframe: tf, id: m.id, ...m.payload },
            }),
          );
        }, 0);
      } catch {
        /* ignore */
      }
      return true;
    } catch (err) {
      toastFinanceError(err);
      chartRef.current?.setData([]);
      setChart(chartRef.current?.getChart());
      return false;
    }
  };

  // Subscribe to server side requests.
  useEffect(() => {
    return subscribe((event: UIEvent) => {
      if (event.type === 'show_chart') {
        const { symbol, timeframe, range } = event.payload;
        setSymbol(symbol);
        setTimeframe((timeframe as any) || '1d');
        setOpen(true);
        setRange(range);
      }
    });
  }, [subscribe]);

  // Load data whenever the panel is open and the symbol/timeframe change.
  useEffect(() => {
    if (open && symbol) {
      loadData(symbol, timeframe, range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, symbol, timeframe, range]);

  if (!open) return null;

  return (
    <aside
      className="fixed right-0 top-0 size-full md:w-1/3 border-l bg-background p-2 flex flex-col gap-2"
      data-testid="finance-panel"
    >
      <SymbolRecent
        symbols={recent}
        onSelect={(s) => {
          setSymbol(s);
          setOpen(true);
          loadData(s, timeframe);
        }}
      />
      <ChartToolbar
        timeframe={timeframe}
        seriesType={seriesType}
        onTimeframeChange={(tf) => {
          setTimeframe(tf);
          loadData(symbol, tf);
        }}
        onSeriesTypeChange={setSeriesType}
      />
      <div className="relative flex-1">
        <ChartPanel
          ref={chartRef}
          symbol={symbol}
          timeframe={timeframe}
          seriesType={seriesType}
          createChartFn={createChartFn}
        />
        {chart && (
          <AttentionLayer
            chart={chart}
            symbol={symbol}
            chatId={chatId}
            userId={userId}
            fetcher={fetcher}
          />
        )}
      </div>
    </aside>
  );
}

