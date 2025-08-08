import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { Markdown } from '@/components/markdown';

// Client renderer for research-general documents. Renders the streamed
// markdown outline so users can follow the plan in real time.
export const researchGeneralArtifact = new Artifact<'research-general'>({
  kind: 'research-general',
  description: 'General research plan with sections and summary.',
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
    if (isLoading) return <DocumentSkeleton artifactKind="text" />;
    return (
      <div className="p-4">
        <Markdown>{content}</Markdown>
      </div>
    );
  },
  actions: [],
  toolbar: [],
});
