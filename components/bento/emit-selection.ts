import { ui } from '@/lib/ui/events';

/**
 * Emit an `ask_about_selection` UI event so subsequent chat messages can be
 * anchored to the chosen candle timestamp.
 */
export function emitSelection(symbol: string, timeframe: string, at: number) {
  ui.emit({
    type: 'ask_about_selection',
    payload: { symbol, timeframe, at, kind: 'candle' },
  });
}
