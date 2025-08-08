import { NextResponse } from 'next/server';
import { getFundamentals } from '@/lib/db/queries';

/**
 * Returns the latest fundamentals JSON for the requested symbol.
 * The fundamentals table stores a single row per symbol containing
 * raw provider data and the timestamp of the last update.
 */
export async function GET(
  _req: Request,
  { params }: { params: { symbol: string } },
) {
  try {
    const row = await getFundamentals(params.symbol);
    if (!row) {
      return NextResponse.json(
        { error: 'Fundamentals not found' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      symbol: row.symbol,
      json: row.json,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch fundamentals' },
      { status: 500 },
    );
  }
}

