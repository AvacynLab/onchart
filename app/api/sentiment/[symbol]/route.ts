import { NextResponse } from 'next/server';
import { getSentiment24h } from '@/lib/db/queries';

/**
 * Returns the aggregated sentiment over the last 24 hours for a symbol.
 * The payload includes the average score and an hourly histogram
 * of mean sentiment values.
 */
export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } },
) {
  try {
    const data = await getSentiment24h(params.symbol);
    return NextResponse.json({
      symbol: params.symbol,
      score: data.score,
      histogram: data.histogram.map((h) => ({
        ts: h.ts.toISOString(),
        score: h.score,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sentiment' },
      { status: 500 },
    );
  }
}
