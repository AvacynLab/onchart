import { NextResponse } from 'next/server';
import { getCandles } from '@/lib/db/queries';

/**
 * API route returning up to 500 OHLCV candles for a given symbol and interval.
 */
export async function GET(
  _req: Request,
  { params }: { params: { symbol: string; interval: string } },
) {
  try {
    const candles = await getCandles({
      symbol: params.symbol,
      interval: params.interval,
    });
    return NextResponse.json(candles);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch candles' },
      { status: 500 },
    );
  }
}
