import { createDocumentHandler } from '@/lib/artifacts/handler';
import { scanOpportunities } from '@/lib/ai/tools/scan-opportunities';

// Research-opportunity documents present a list of potential trades found by
// scanning for symbols with positive sentiment and a breakout above their EMA.
// The server generates the list and streams it as markdown so users see the
// opportunities immediately.
export function createResearchOpportunityHandler(scanner = scanOpportunities) {
  return createDocumentHandler<'research-opportunity'>({
    kind: 'research-opportunity',
    onCreateDocument: async ({ dataStream }) => {
      const opportunities = await scanner.execute({ limit: 5 });
      const content = formatOpportunities(opportunities);
      dataStream.write({ type: 'data-textDelta', data: content, transient: true });
      return content;
    },
    onUpdateDocument: async ({ document }) => document.content,
  });
}

export const researchOpportunityDocumentHandler = createResearchOpportunityHandler();

interface Opportunity { symbol: string; score: number }

function formatOpportunities(opps: Opportunity[]): string {
  if (opps.length === 0) return '# Research Opportunities\n\n_No matches found._\n';
  const lines = opps.map((o) => `- **${o.symbol}** (sentiment: ${o.score.toFixed(2)})`);
  return `# Research Opportunities\n\n${lines.join('\n')}\n`;
}
