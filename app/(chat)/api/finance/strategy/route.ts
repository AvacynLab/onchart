import {
  createStrategy,
  listStrategiesByChat,
  getStrategyById,
  createStrategyVersion,
  getStrategyVersion,
  saveBacktest,
  updateStrategyStatus,
} from '@/lib/db/queries';
import { backtest, Candle, SignalMap } from '@/lib/finance/backtest';
import { z } from 'zod';

// Force Node runtime for database access
export const runtime = 'nodejs';

/**
 * CRUD endpoint for strategies used by the finance agent.
 *
 * - GET    ?chatId=&cursor=&limit= -> list strategies for a chat with pagination
 * - GET    ?id=     -> fetch a strategy by id
 * - POST   { userId, chatId, title, universe, constraints, status? } -> create strategy
 * - POST   { action:'backtest', versionId, candles, signals, ... } -> run & save backtest
 * - POST   { action:'finalize', versionId } -> mark strategy as validated
 * - PATCH  { versionId, description?, rules, params, notes? } -> create refined version
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const chatId = searchParams.get('chatId');
  if (id) {
    const strat = await getStrategyById({ id });
    return Response.json(strat ?? null);
  }
  if (chatId) {
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');
    const page = await listStrategiesByChat({
      chatId,
      cursor: cursor ? new Date(cursor) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return Response.json(page);
  }
  return new Response(JSON.stringify({ error: 'id or chatId required' }), {
    status: 400,
  });
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  // Default create strategy when no action is provided
  if (!body.action) {
    const { userId, chatId, title, universe = {}, constraints = {}, status } = body || {};
    if (!userId || !chatId || !title) {
      return new Response(JSON.stringify({ error: 'invalid body' }), {
        status: 400,
      });
    }
    const created = await createStrategy({
      userId,
      chatId,
      title,
      universe,
      constraints,
      status,
    });
    return Response.json(created);
  }

  // Run a backtest for an existing strategy version and persist the result
  if (body.action === 'backtest') {
    const schema = z.object({
      action: z.literal('backtest'),
      versionId: z.string(),
      candles: Candle.array(),
      signals: SignalMap,
      costs: z.number().optional(),
      slippage: z.number().optional(),
      symbolSet: z.unknown().optional(),
      window: z.unknown().optional(),
      assumptions: z.unknown().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'invalid body' }), {
        status: 400,
      });
    }
    const { versionId, candles, signals, costs, slippage, symbolSet, window, assumptions } =
      parsed.data;
    const result = backtest({ candles, signals, costs, slippage });
    const saved = await saveBacktest({
      strategyVersionId: versionId,
      symbolSet: symbolSet ?? {},
      window: window ?? {},
      metrics: result.metrics,
      equityCurve: result.equityCurve,
      assumptions: assumptions ?? {},
    });
    return Response.json({ backtestId: saved.id, ...result });
  }

  // Finalize a strategy by marking it validated
  if (body.action === 'finalize') {
    const schema = z.object({ action: z.literal('finalize'), versionId: z.string() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'invalid body' }), {
        status: 400,
      });
    }
    const version = await getStrategyVersion({ id: parsed.data.versionId });
    if (!version) {
      return new Response(JSON.stringify({ error: 'unknown version' }), {
        status: 404,
      });
    }
    const updated = await updateStrategyStatus({
      id: version.strategyId,
      status: 'validated',
    });
    return Response.json(updated);
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });
}

export async function PATCH(req: Request): Promise<Response> {
  const body = await req.json();
  const schema = z.object({
    versionId: z.string(),
    description: z.string().optional(),
    rules: z.unknown(),
    params: z.unknown(),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid body' }), {
      status: 400,
    });
  }
  const prev = await getStrategyVersion({ id: parsed.data.versionId });
  if (!prev) {
    return new Response(JSON.stringify({ error: 'unknown version' }), { status: 404 });
  }
  const next = await createStrategyVersion({
    strategyId: prev.strategyId,
    description: parsed.data.description,
    rules: parsed.data.rules,
    params: parsed.data.params,
    notes: parsed.data.notes,
  });
  return Response.json(next);
}
