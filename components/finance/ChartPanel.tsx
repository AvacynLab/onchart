// @ts-nocheck
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
} from 'lightweight-charts';
import {
  subscribeUIEvents,
  emitUIEvent,
  type UIEvent,
} from '../../lib/ui/events';

/**
 * Shape of an annotation rendered on the chart. A simple price line is used
 * to visualise annotations. The `id` is stored so that later calls to
 * `remove_annotation` can delete the corresponding line.
 */
export interface ChartAnnotation {
  /** Unique identifier for later removal */
  id: string;
  /** Price at which to draw the line */
  price: number;
  /** Optional description rendered as the line title */
  text?: string;
}

/**
 * Representation of a simple overlay/study rendered as a line series. Both
 * overlays and studies share the same shape: a unique identifier, a set of
 * line data points and an optional color.
 */
export interface ChartLine {
  /** Unique identifier so the line can later be updated or removed. */
  id: string;
  /** Line data to render as an overlay or study. */
  data: LineData[];
  /** Optional line color; defaults to the library's default. */
  color?: string;
}

/** Methods exposed by the ChartPanel via `ref`. */
export interface ChartPanelRef {
  /** Replace all series data with a new set of candles or line points. */
  setData(data: CandlestickData[] | LineData[]): void;
  /** Add a line series overlay (e.g. moving average). */
  addOverlay(o: ChartLine): void;
  /** Add a line series study (e.g. indicator output). */
  addStudy(s: ChartLine): void;
  /** Add an annotation represented as a price line. */
  addAnnotation(a: ChartAnnotation): void;
  /** Focus the chart on a specific time range. */
  focusArea(start: number, end: number): void;
  /** Access the underlying chart instance, primarily for overlays. */
  getChart(): IChartApi | undefined;
}

export interface ChartPanelProps {
  /** Symbol rendered by the chart (informational). */
  symbol: string;
  /** Timeframe rendered by the chart (informational). */
  timeframe: string;
  /** Type of series to render. Defaults to candlestick. */
  seriesType?: 'candlestick' | 'line';
  /** Optional preloaded overlays to render on mount. */
  overlays?: ChartLine[];
  /** Optional studies to render on mount. */
  studies?: ChartLine[];
  /** Optional annotations to render on mount. */
  annotations?: ChartAnnotation[];
  /**
   * Optional factory used to create a chart. This is primarily injected in
   * tests so that DOM heavy behaviour can be stubbed.
   */
  createChartFn?: (container: HTMLElement) => IChartApi | Promise<IChartApi>;
}

/**
 * A lightweight-charts wrapper that exposes imperative methods for the agent
 * to control. It subscribes to the UI event bus so server side tools can
 * highlight areas or push annotations.
 */
const ChartPanel = forwardRef<ChartPanelRef, ChartPanelProps>(
  (
    {
      symbol,
      timeframe,
      seriesType = 'candlestick',
      overlays,
      studies,
      annotations,
      createChartFn,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line'>>();
    const overlayRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});
    const studyRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});
    const annotationsRef = useRef<Record<string, { remove: () => void }>>({});

    // Helper to add an annotation and keep track of it for later removal.
    const addAnnotation = useCallback((a: ChartAnnotation) => {
      const line = seriesRef.current?.createPriceLine({
        price: a.price,
        title: a.text,
        color: '#ff4976',
        lineWidth: 2,
      });
      if (line) {
        // Wrap the returned price line in an object exposing a `remove` method
        // so callers can clean up annotations without depending on chart
        // internals.
        annotationsRef.current[a.id] = {
          remove: () => seriesRef.current?.removePriceLine(line),
        };
      }
    }, []);

    // Helper to add a line series overlay or study and store a reference so it
    // can be manipulated later.
    const addLine = useCallback(
      (
        target: React.MutableRefObject<Record<string, ISeriesApi<'Line'>>>,
        l: ChartLine,
      ) => {
        const series = chartRef.current?.addSeries(LineSeries, { color: l.color });
        series?.setData(l.data);
        if (series) target.current[l.id] = series;
      },
      [],
    );

    const addOverlay = useCallback((o: ChartLine) => addLine(overlayRefs, o), [
      addLine,
    ]);
    const addStudy = useCallback((s: ChartLine) => addLine(studyRefs, s), [
      addLine,
    ]);

    // Create the chart instance on mount.
    useEffect(() => {
      if (!containerRef.current) return;
      let mounted = true;
      const cleanupRef: { current: () => void } = { current: () => {} };
      async function init() {
        if (!mounted || !containerRef.current) return;
        const create = createChartFn ?? createChart;
        chartRef.current = await create(containerRef.current);
        seriesRef.current =
          seriesType === 'line'
            ? chartRef.current.addSeries(LineSeries)
            : chartRef.current.addSeries(CandlestickSeries);

        // Apply any initial layers once the chart exists.
        overlays?.forEach(addOverlay);
        studies?.forEach(addStudy);
        annotations?.forEach(addAnnotation);

        // Apply theme based on prefers-color-scheme. Defaults to light if the
        // API is unavailable (e.g. in tests).
        const mq = window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)')
          : ({ matches: false } as any);
        const applyTheme = (dark: boolean) => {
          chartRef.current?.applyOptions({
            layout: {
              background: { color: dark ? '#131722' : '#FFFFFF' },
              textColor: dark ? '#D9D9D9' : '#191919',
            },
            grid: {
              vertLines: { color: dark ? '#2A2E39' : '#E1ECF2' },
              horzLines: { color: dark ? '#2A2E39' : '#E1ECF2' },
            },
            timeScale: { timeVisible: true },
          });
        };
        applyTheme(mq.matches);
        mq.addEventListener?.('change', (e: MediaQueryListEvent) =>
          applyTheme(e.matches),
        );

        // Emit crosshair movements so other components can react (e.g. show
        // price at cursor). We only forward the time for simplicity.
        chartRef.current.subscribeCrosshairMove((param) => {
          if (param.time === undefined) return;
          emitUIEvent({
            type: 'crosshair_move',
            payload: { symbol, time: Number(param.time) },
          });
        });

        // Resize the chart when the container changes dimensions.
        const ro = new ResizeObserver(() => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            });
          }
        });
        ro.observe(containerRef.current);
        cleanupRef.current = () => {
          ro.disconnect();
          chartRef.current?.remove();
        };
      }
      init();
      return () => {
        mounted = false;
        cleanupRef.current();
      };
    }, [
      createChartFn,
      seriesType,
      overlays,
      studies,
      annotations,
      addOverlay,
      addStudy,
      addAnnotation,
      symbol,
    ]);

    useImperativeHandle(ref, () => ({
      setData(data) {
        seriesRef.current?.setData(data as any);
      },
      addOverlay,
      addStudy,
      addAnnotation,
      focusArea(start, end) {
        if (start >= end) return;
        // Cast the numeric range to the generic `Time` type expected by
        // `setVisibleRange` so callers can supply plain epoch seconds without
        // importing chart-specific types.
        chartRef.current?.timeScale().setVisibleRange({
          from: start as any,
          to: end as any,
        });
      },
      getChart() {
        return chartRef.current;
      },
    }));

    // Subscribe to events coming from server side tools.
    useEffect(() => {
      return subscribeUIEvents((event: UIEvent) => {
        if (event.type === 'add_annotation' && event.payload.symbol === symbol) {
          addAnnotation(event.payload);
        } else if (
          event.type === 'remove_annotation' &&
          annotationsRef.current[event.payload.id]
        ) {
          annotationsRef.current[event.payload.id].remove();
          delete annotationsRef.current[event.payload.id];
        } else if (
          event.type === 'focus_area' &&
          event.payload.symbol === symbol
        ) {
          const { start, end } = event.payload;
          if (start < end)
            chartRef.current
              ?.timeScale()
              // Cast plain numbers to the `Time` type expected by
              // lightweight-charts.
              .setVisibleRange({ from: start as any, to: end as any });
        } else if (
          event.type === 'add_overlay' &&
          event.payload.symbol === symbol
        ) {
          addOverlay(event.payload);
        }
      });
    }, [symbol, addAnnotation, addOverlay]);

    // Apply any overlays, studies or annotations provided as props when they
    // change. Using a shallow effect keeps the implementation simple for
    // demonstration purposes; production code might require diffing.
    useEffect(() => {
      overlays?.forEach(addOverlay);
    }, [overlays, addOverlay]);

    useEffect(() => {
      studies?.forEach(addStudy);
    }, [studies, addStudy]);

    useEffect(() => {
      annotations?.forEach(addAnnotation);
    }, [annotations, addAnnotation]);

    return <div ref={containerRef} data-testid="chart-panel" />;
  },
);

ChartPanel.displayName = 'ChartPanel';

export default ChartPanel;
