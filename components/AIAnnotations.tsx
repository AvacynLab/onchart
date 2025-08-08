"use client";

import { useEffect } from 'react';
import type { AIEvent } from '@/lib/ai/event-engine';

/**
 * Minimal shape configuration understood by TradingView's Lightweight Charts.
 * Only the fields needed by the project are modelled here.
 */
export interface ShapeConfig {
  /** Price level where the annotation should be drawn. */
  price: number;
  /** Optional text label shown near the annotation. */
  text?: string;
  /** Color used for the annotation, typically driven by severity. */
  color?: string;
}

/**
 * Subset of the chart API used by {@link AIAnnotations}. It only requires the
 * ability to add a shape to the chart.
 */
export interface AnnotationChart {
  addShape: (config: ShapeConfig) => void;
}

// Mapping of AI event levels to chart colors for visual cues.
const levelColors: Record<NonNullable<AIEvent['level']>, string> = {
  info: '#3b82f6', // blue
  success: '#16a34a', // green
  warning: '#facc15', // yellow
  error: '#dc2626', // red
};

/**
 * Apply a single {@link AIEvent} to the provided chart instance by creating a
 * shape that highlights the relevant price level.
 */
export function applyAIEvent(chart: AnnotationChart, event: AIEvent): void {
  if (event.type !== 'highlight-price') return;

  chart.addShape({
    price: event.price,
    text: event.label ?? event.message,
    color: event.level ? levelColors[event.level] : undefined,
  });
}

/**
 * Connects to the global `ai-events` WebSocket channel and forwards incoming
 * events to the provided chart instance. Returns the WebSocket so callers can
 * close it when no longer needed.
 */
export function connectAIAnnotations(chart: AnnotationChart): WebSocket {
  const ws = new WebSocket('/api/ai/events');
  ws.addEventListener('message', (ev) => {
    try {
      const event = JSON.parse(ev.data as string) as AIEvent;
      applyAIEvent(chart, event);
    } catch {
      // ignore malformed events
    }
  });
  return ws;
}

/**
 * React component that subscribes to the global `ai-events` channel and overlays
 * annotations on the supplied chart instance. It renders nothing itself.
 */
export default function AIAnnotations({ chart }: { chart: AnnotationChart }) {
  useEffect(() => {
    const ws = connectAIAnnotations(chart);
    return () => ws.close();
  }, [chart]);

  return null;
}
