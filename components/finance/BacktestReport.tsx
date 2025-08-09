'use client';

import React, { useEffect, useRef } from 'react';

export interface BacktestMetrics {
  cagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  hitRate: number; // expressed 0-1
  profitFactor: number;
}

export interface EquityPoint {
  time: number | string;
  value: number;
}

interface Props {
  metrics: BacktestMetrics;
  curve: EquityPoint[];
}

/**
 * Renders a miniature equity curve along with a table of performance metrics
 * for a strategy backtest. The chart is intentionally lightweight and
 * downsampled to at most 100 points to keep rendering costs low.
 */
export default function BacktestReport({ metrics, curve }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip chart rendering in non-browser or test environments where
    // essential browser APIs like `matchMedia` are absent. This keeps
    // unit tests lightweight and avoids noisy console errors.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    let chart: any;
    (async () => {
      try {
        const mod = await import('lightweight-charts');
        if (!ref.current) return;
        chart = mod.createChart(ref.current, {
          width: ref.current.clientWidth,
          height: 100,
        });
        const series = chart.addAreaSeries({ lineWidth: 1 });
        const step = Math.ceil(curve.length / 100);
        const data = curve.filter((_, i) => i % step === 0).map((p) => ({
          time: p.time as number,
          value: p.value,
        }));
        series.setData(data);
      } catch (err) {
        // Charting is non-critical for tests; ignore load errors.
        console.error('chart init failed', err);
      }
    })();
    return () => chart?.remove();
  }, [curve]);

  return (
    <div className="space-y-2">
      <div ref={ref} className="w-full h-[100px]" />
      <table className="text-xs w-full">
        <tbody>
          <tr>
            <td>CAGR</td>
            <td className="text-right">{metrics.cagr.toFixed(2)}%</td>
          </tr>
          <tr>
            <td>Sharpe</td>
            <td className="text-right">{metrics.sharpe.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Sortino</td>
            <td className="text-right">{metrics.sortino.toFixed(2)}</td>
          </tr>
          <tr>
            <td>MDD</td>
            <td className="text-right">{metrics.maxDrawdown.toFixed(2)}%</td>
          </tr>
          <tr>
            <td>Hit rate</td>
            <td className="text-right">{(metrics.hitRate * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Profit factor</td>
            <td className="text-right">{metrics.profitFactor.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

