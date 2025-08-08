import { tool } from 'ai';
import { z } from 'zod';
import { saveDocument } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

/**
 * Tool that produces a brief research outline for an arbitrary topic.
 * The returned structure contains a summary and a list of sections that can
 * be expanded by the caller.
 */
export const researchGeneral = tool({
  description: 'Provide a high-level research plan for any topic.',
  inputSchema: z.object({
    topic: z.string().min(1),
    emitArtifact: z.literal('research-general').optional(),
  }),
  execute: async ({ topic, emitArtifact }, { session }) => {
    const result = {
      topic,
      summary: `Overview of ${topic}.`,
      sections: ['Background', 'Analysis', 'Conclusion'],
    };

    if (emitArtifact === 'research-general' && session?.user?.id) {
      const id = generateUUID();
      await saveDocument({
        id,
        title: `${topic} research`,
        kind: 'research-general',
        content: JSON.stringify(result),
        userId: session.user.id,
      });
      return { ...result, documentId: id };
    }

    return result;
  },
});
