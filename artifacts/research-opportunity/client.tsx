import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { Markdown } from '@/components/markdown';

// Client renderer for research-opportunity documents. Displays a markdown list
// of potential trades streamed from the server.
export const researchOpportunityArtifact = new Artifact<'research-opportunity'>({
  kind: 'research-opportunity',
  description: 'List of symbols with strong sentiment and EMA breakout.',
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
