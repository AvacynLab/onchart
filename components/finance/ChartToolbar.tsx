// Client component because it relies on interactivity hooks.
'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Props for the ChartToolbar component controlling the displayed data.
 *
 * The toolbar exposes callbacks so the surrounding UI can react to user
 * selections and update the chart accordingly.
 */
export interface ChartToolbarProps {
  /** Currently selected timeframe shown to the user. */
  timeframe: '1m' | '5m' | '1h' | '1d';
  /** Currently active series visualisation. */
  seriesType: 'candlestick' | 'line';
  /** Optional list of indicators that are toggled on the chart. */
  indicators?: string[];
  /** Invoked when the user picks a different timeframe. */
  onTimeframeChange?: (tf: ChartToolbarProps['timeframe']) => void;
  /** Invoked when switching between candlestick and line view. */
  onSeriesTypeChange?: (type: ChartToolbarProps['seriesType']) => void;
  /**
   * Invoked when toggling an indicator; receives the updated list so callers
   * can keep a unique set without worrying about race conditions.
   */
  onToggleIndicator?: (indicators: string[]) => void;
}

// Timeframes offered by the toolbar.
const TIMEFRAMES: ChartToolbarProps['timeframe'][] = ['1m', '5m', '1h', '1d'];
// Supported series types.
const SERIES_TYPES: ChartToolbarProps['seriesType'][] = ['candlestick', 'line'];
// A small default set of indicators that can be toggled.
const DEFAULT_INDICATORS = ['sma', 'rsi'];

/**
 * A simple toolbar with timeframe, series type and indicator controls.
 * It is intentionally presentation agnostic so tests can interact with it
 * without requiring the full application shell.
 */
export default function ChartToolbar({
  timeframe,
  seriesType,
  indicators = [],
  onTimeframeChange,
  onSeriesTypeChange,
  onToggleIndicator,
}: ChartToolbarProps) {
  // Translation helper for series/indicator labels.
  const t = useTranslations('finance.chart');
  // Mirror the externally controlled indicator list so we can compute the next
  // state using a Set and avoid duplicate entries when users toggle quickly.
  const [activeIndicators, setActiveIndicators] = useState<string[]>(indicators);
  useEffect(() => {
    setActiveIndicators(indicators);
  }, [indicators]);

  return (
    <div className="flex gap-2" data-testid="chart-toolbar">
      {/* Timeframe selection */}
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            data-testid={`tf-${tf}`}
            className={
              tf === timeframe
                ? 'bg-blue-500 text-white px-2 py-1 rounded'
                : 'bg-gray-200 px-2 py-1 rounded'
            }
            onClick={() => onTimeframeChange?.(tf)}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Series type toggle */}
      <div className="flex gap-1">
        {SERIES_TYPES.map((st) => (
          <button
            key={st}
            type="button"
            data-testid={`series-${st}`}
            className={
              st === seriesType
                ? 'bg-blue-500 text-white px-2 py-1 rounded'
                : 'bg-gray-200 px-2 py-1 rounded'
            }
            onClick={() => onSeriesTypeChange?.(st)}
          >
            {t(`series.${st}`)}
          </button>
        ))}
      </div>

      {/* Indicator toggles */}
      <div className="flex gap-1">
        {DEFAULT_INDICATORS.map((name) => (
          <label key={name} className="flex items-center gap-1">
            <input
              type="checkbox"
              data-testid={`ind-${name}`}
              checked={activeIndicators.includes(name)}
              onChange={() => {
                setActiveIndicators((prev) => {
                  const s = new Set(prev);
                  s.has(name) ? s.delete(name) : s.add(name);
                  const list = [...s];
                  onToggleIndicator?.(list);
                  return list;
                });
              }}
            />
            {t(`indicators.${name}`)}
          </label>
        ))}
      </div>
    </div>
  );
}

