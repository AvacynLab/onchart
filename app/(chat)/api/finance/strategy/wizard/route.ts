import { createFinanceTools } from '@/lib/ai/tools-finance';
import { z } from 'zod';

// Force Node runtime for DB access and tool execution
export const runtime = 'nodejs';

/**
 * API endpoint orchestrating strategy creation through the LLM tools.
 * It first records that the wizard has started, then proposes an initial
 * strategy using the collected answers.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const schema = z.object({
    userId: z.string(),
    chatId: z.string(),
    title: z.string(),
    answers: z.record(z.any()),
    locale: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
  }
  const { userId, chatId, title, answers, locale } = parsed.data;
  // Create finance tools scoped to the user/chat and locale
  const tools = createFinanceTools({ userId, chatId, locale });
  // Persist the wizard start for traceability
  await tools.strategy.start_wizard.execute({});
  // Propose an initial strategy using the collected answers
  const result = await tools.strategy.propose.execute({
    title,
    answers,
    universe: { note: answers.universe },
    constraints: { horizon: answers.horizon, risk: answers.risk, fees: answers.fees },
  });
  return Response.json(result);
}
