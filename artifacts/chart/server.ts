import { createDocumentHandler } from '@/lib/artifacts/handler';

interface ChartConfig {
  symbol: string;
  interval: string;
  studies: string[];
}

// Chart documents simply persist the configuration needed to render a price chart.
// The configuration is sent to the client immediately for instant feedback and
// stored as JSON in the document record.
export const chartDocumentHandler = createDocumentHandler<'chart'>({
  kind: 'chart',
  onCreateDocument: async ({ title, dataStream }) => {
    // Accept titles like "TSLA 15m" or just "TSLA" and default the interval to 1d.
    const [rawSymbol = 'AAPL', rawInterval = '1d'] = title.trim().split(/\s+/);
    const config: ChartConfig = {
      symbol: rawSymbol.toUpperCase(),
      interval: rawInterval,
      studies: [],
    };

    // Stream the configuration so the client can render immediately.
    dataStream.write({
      type: 'data-chartConfig',
      data: config,
      transient: true,
    });

    return JSON.stringify(config);
  },
  onUpdateDocument: async ({ document }) => {
    // Updating a chart document currently just persists the provided content.
    return document.content;
  },
});
