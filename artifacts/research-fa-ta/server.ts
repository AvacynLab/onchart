import { createDocumentHandler } from '@/lib/artifacts/handler';
import { analyseFaTa } from '@/lib/ai/tools/analyse-fa-ta';

// Research-fa-ta documents combine fundamental and technical analysis with a
// simple strategy suggestion and chart configuration for a given symbol.
export const researchFaTaDocumentHandler = createDocumentHandler<'research-fa-ta'>({
  kind: 'research-fa-ta',
  onCreateDocument: async ({ title, dataStream }) => {
    const symbol = title.trim().toUpperCase();
    const analysis = await analyseFaTa.execute({ symbol });
    const content = formatAnalysis(symbol, analysis);
    dataStream.write({ type: 'data-textDelta', data: content, transient: true });
    return content;
  },
  onUpdateDocument: async ({ document }) => document.content,
});

function formatAnalysis(symbol: string, analysis: any): string {
  const fundamentals = JSON.stringify(analysis.fundamentals?.json ?? {}, null, 2);
  return `# ${symbol} FA/TA Research\n\n## Fundamentals\n\n\u0060\u0060\u0060json\n${fundamentals}\n\u0060\u0060\u0060\n\n## Technical\n\nLast close: ${analysis.technical.lastClose}\nEMA20: ${analysis.technical.ema20}\nRSI14: ${analysis.technical.rsi14}\n\n## Strategy\n\n${analysis.strategy}\n`;
}
