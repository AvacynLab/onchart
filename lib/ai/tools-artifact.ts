import { tool } from 'ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { emitUIEvent } from '@/lib/ui/events';

/** Context passed to artifact tools for persistence and auditing. */
export interface ArtifactToolContext {
  userId: string;
  chatId: string;
}

/** Function used to record tool invocations for later analysis. */
type PersistFn = (record: {
  userId: string;
  chatId: string;
  type: string;
  input: unknown;
  output: unknown;
}) => Promise<void>;

interface ArtifactDeps {
  persist?: PersistFn;
  createWorkflow?: (args: {
    userId: string;
    chatId: string;
    title: string;
    steps: Array<{ content: string }>;
  }) => Promise<{ id: string; title: string; steps: Array<{ content: string }> }>;
  appendWorkflowStep?: (args: {
    id: string;
    content: string;
  }) => Promise<{ id: string; steps: Array<{ content: string }> }>;
}

/**
 * Build artifact manipulation tools that allow the agent to create workflows
 * or annotate charts while emitting UI events for visual feedback.
 */
export function createArtifactTools(
  ctx: ArtifactToolContext,
  { persist, createWorkflow, appendWorkflowStep }: ArtifactDeps = {},
) {
  const persistFn: PersistFn =
    persist ?? (async () => {});

  const createWorkflowFn =
    createWorkflow ?? (async (args) => ({ id: nanoid(), ...args }));
  const appendWorkflowStepFn =
    appendWorkflowStep ??
    (async ({ id, content }) => ({ id, steps: [{ content }] }));

  return {
    artifact: {
      workflow: {
        /** Create a new workflow artifact with an initial set of steps. */
        create: tool({
          description: 'Create a workflow artifact',
          inputSchema: z.object({
            title: z.string(),
            steps: z.array(z.object({ content: z.string() })),
          }),
          execute: async ({ title, steps }) => {
            const wf = await createWorkflowFn({
              userId: ctx.userId,
              chatId: ctx.chatId,
              title,
              steps,
            });
            await persistFn({
              userId: ctx.userId,
              chatId: ctx.chatId,
              type: 'workflow_create',
              input: { title, steps },
              output: wf,
            });
            return wf;
          },
        }),
        /** Append a step to an existing workflow artifact. */
        appendStep: tool({
          description: 'Append a step to a workflow',
          inputSchema: z.object({ id: z.string(), content: z.string() }),
          execute: async ({ id, content }) => {
            const wf = await appendWorkflowStepFn({ id, content });
            await persistFn({
              userId: ctx.userId,
              chatId: ctx.chatId,
              type: 'workflow_append',
              input: { id, content },
              output: wf,
            });
            return wf;
          },
        }),
      },
      chart: {
        /** Annotate a chart and mirror annotations on the UI via events. */
        annotate: tool({
          description: 'Annotate a chart with overlays and markers',
          inputSchema: z.object({
            symbol: z.string(),
            timeframe: z.string(),
            overlays: z.array(z.any()).optional(),
            annotations: z
              .array(
                z.object({ at: z.number(), text: z.string() }),
              )
              .optional(),
          }),
          execute: async ({
            symbol,
            timeframe,
            overlays = [],
            annotations = [],
          }) => {
            // Emit UI events for each annotation so the chart displays markers.
            for (const a of annotations) {
              emitUIEvent({ type: 'add_annotation', payload: a });
            }
            const output = { symbol, timeframe, overlays, annotations };
            await persistFn({
              userId: ctx.userId,
              chatId: ctx.chatId,
              type: 'chart_annotate',
              input: { symbol, timeframe, overlays, annotations },
              output,
            });
            return output;
          },
        }),
      },
    },
  } as const;
}

export type ArtifactTools = ReturnType<typeof createArtifactTools>;
