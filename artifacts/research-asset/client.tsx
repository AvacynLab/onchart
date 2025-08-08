import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { Markdown } from '@/components/markdown';

// Client renderer for research-asset documents. Displays markdown content
// produced by the server summarizing an asset's fundamentals, sentiment and
// technical trend.
export const researchAssetArtifact = new Artifact<'research-asset'>({
  kind: 'research-asset',
  description: 'Detailed analysis of a single asset with fundamentals and trend.',
  initialize: async () => {},
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'data-textDelta') {
      setArtifact((draft) => ({
        ...draft,
        content: draft.content + streamPart.data,
        status: 'streaming',
        isVisible: true,
      }));
    }
  },
  content: ({ content, isLoading }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }
    return (
      <div className="p-4">
        <Markdown>{content}</Markdown>
      </div>
    );
  },
  actions: [],
  toolbar: [],
});
