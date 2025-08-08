import { createDocumentHandler } from '@/lib/artifacts/handler';
import { analyseAsset } from '@/lib/ai/tools/analyse-asset';

// Research-asset documents summarize fundamentals, sentiment and technical trend
// for a single symbol. Content is generated on the server and streamed to clients
// as markdown so users immediately see the analysis.
export const researchAssetDocumentHandler = createDocumentHandler<'research-asset'>({
  kind: 'research-asset',
  onCreateDocument: async ({ title, dataStream }) => {
    const symbol = title.trim().toUpperCase();
    const analysis = await analyseAsset.execute({ symbol });
    const content = formatAnalysis(symbol, analysis);

    dataStream.write({ type: 'data-textDelta', data: content, transient: true });
    return content;
  },
  onUpdateDocument: async ({ document }) => {
    return document.content;
  },
});

function formatAnalysis(symbol: string, analysis: any): string {
  const fundamentals = JSON.stringify(analysis.fundamentals?.json ?? {}, null, 2);
  return `# ${symbol} Research\n\n## Fundamentals\n\n\u0060\u0060\u0060json\n${fundamentals}\n\u0060\u0060\u0060\n\n## Sentiment (24h)\n\nScore: ${analysis.sentiment?.score ?? 'n/a'}\n\n## Technical\n\nLast close: ${analysis.technical?.lastClose ?? 'n/a'}\nEMA20: ${analysis.technical?.ema20 ?? 'n/a'}\nTrend: ${analysis.technical?.trend ?? 'unknown'}\n`;
}
