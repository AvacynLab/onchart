import ChartWidget from '@/components/ChartWidget';
import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { getChartDocument } from '../actions';

interface ChartConfig {
  symbol: string;
  interval: string;
  studies: string[];
}

interface Metadata {
  config: ChartConfig | null;
}

export const chartArtifact = new Artifact<'chart', Metadata>({
  kind: 'chart',
  description: 'Displays an interactive price chart with AI overlays.',
  initialize: async ({ documentId, setMetadata }) => {
    const doc = await getChartDocument({ documentId });
    if (doc?.content) {
      try {
        setMetadata({ config: JSON.parse(doc.content) as ChartConfig });
      } catch {
        setMetadata({ config: null });
      }
    } else {
      setMetadata({ config: null });
    }
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'data-chartConfig') {
      const cfg = streamPart.data as ChartConfig;
      setMetadata({ config: cfg });
      setArtifact((draft) => ({
        ...draft,
        content: JSON.stringify(cfg),
        status: 'streaming',
        isVisible: true,
      }));
    }
  },
  content: ({ metadata, content, isLoading }) => {
    const cfg = metadata?.config || (content ? (JSON.parse(content) as ChartConfig) : null);

    if (isLoading || !cfg) {
      return <DocumentSkeleton artifactKind="chart" />;
    }

    return <ChartWidget symbol={cfg.symbol} interval={cfg.interval} />;
  },
  actions: [],
  toolbar: [],
});
