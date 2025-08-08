import { createDocumentHandler } from '@/lib/artifacts/handler';
import { researchGeneral } from '@/lib/ai/tools/research-general';

// Research-general documents capture a free-form investigation plan for any
// topic, streaming markdown so users can read sections as they arrive.
export const researchGeneralDocumentHandler = createDocumentHandler<'research-general'>({
  kind: 'research-general',
  onCreateDocument: async ({ title, dataStream }) => {
    const topic = title.trim();
    const research = await researchGeneral.execute({ topic });
    const content = formatResearch(topic, research);
    dataStream.write({ type: 'data-textDelta', data: content, transient: true });
    return content;
  },
  onUpdateDocument: async ({ document }) => document.content,
});

function formatResearch(topic: string, research: any): string {
  const lines = research.sections.map((s: string) => `- ${s}`).join('\n');
  return `# ${topic} Research\n\n${research.summary}\n\n## Plan\n\n${lines}\n`;
}
