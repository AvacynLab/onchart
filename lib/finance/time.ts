import type { UTCTimestamp } from 'lightweight-charts';

/**
 * Convert a JavaScript Date into a lightweight-charts UTCTimestamp.
 * The timestamp is expressed in seconds since Unix epoch.
 */
export function toUTCTimestamp(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

/**
 * Convert a UTCTimestamp (seconds) into a Date object in the given time zone.
 *
 * @param ts - Epoch seconds representing the UTC time.
 * @param timeZone - IANA time zone identifier, e.g. 'America/New_York'.
 */
export function fromUTCTimestamp(ts: UTCTimestamp, timeZone: string): Date {
  const utc = new Date(ts * 1000);
  // Use Intl to render the date in the target time zone then parse back.
  const locale = utc.toLocaleString('en-US', { timeZone });
  return new Date(locale);
}

/**
 * Determine whether a market is open for a given date in a specific time zone.
 * Weekends are considered closed. Opening and closing times are provided in
 * HH:MM 24h format (local to the given time zone).
 */
export function isMarketOpen(
  date: Date,
  timeZone = 'America/New_York',
  open = '09:30',
  close = '16:00',
): boolean {
  const local = fromUTCTimestamp(toUTCTimestamp(date), timeZone);
  const day = local.getDay();
  if (day === 0 || day === 6) return false; // Sunday/Saturday

  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  if (
    openH === undefined ||
    openM === undefined ||
    closeH === undefined ||
    closeM === undefined
  ) {
    return false;
  }
  const minutes = local.getHours() * 60 + local.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return minutes >= openMinutes && minutes < closeMinutes;
}
