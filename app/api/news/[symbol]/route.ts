import { NextResponse } from 'next/server';
import { getLatestNews } from '@/lib/db/queries';

/**
 * Returns the most recent news articles for the requested symbol.
 * Each item includes the headline, link, sentiment score and timestamp.
 */
export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } },
) {
  try {
    const rows = await getLatestNews(params.symbol);
    return NextResponse.json({
      symbol: params.symbol,
      news: rows.map((r) => ({
        headline: r.headline,
        url: r.url,
        score: r.score,
        ts: r.ts.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 },
    );
  }
}
