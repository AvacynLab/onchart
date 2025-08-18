import { describe, expect, test, vi } from 'vitest';
import { createArtifactTools } from '@/lib/ai/tools-artifact';
import { ui } from '@/lib/ui/events';

const ctx = { userId: 'u1', chatId: 'c1' };

describe('artifact tools', () => {
  test('creates workflow and persists', async () => {
    const create = vi.fn(async (args) => ({ id: 'wf1', ...args }));
    const persist = vi.fn();
    const tools = createArtifactTools(ctx, { createWorkflow: create, persist });
    const res = await tools.artifact.workflow.create({
      title: 'Plan',
      steps: [{ content: 'step' }],
    });
    expect(res.id).toBe('wf1');
    expect(create).toHaveBeenCalledWith({
      userId: 'u1',
      chatId: 'c1',
      title: 'Plan',
      steps: [{ content: 'step' }],
    });
    expect(persist).toHaveBeenCalled();
  });

  test('appends workflow step', async () => {
    const append = vi.fn(async ({ id, content }) => ({
      id,
      steps: [{ content }],
    }));
    const persist = vi.fn();
    const tools = createArtifactTools(ctx, {
      appendWorkflowStep: append,
      persist,
    });
    await tools.artifact.workflow.appendStep({ id: 'wf1', content: 'next' });
    expect(append).toHaveBeenCalledWith({ id: 'wf1', content: 'next' });
    expect(persist).toHaveBeenCalled();
  });

  test('annotate emits add_annotation events', async () => {
    const emit = vi.spyOn(ui, 'emit');
    const tools = createArtifactTools(ctx);
    await tools.artifact.chart.annotate({
      symbol: 'AAPL',
      timeframe: '1h',
      annotations: [{ at: 1, text: 'hi' }],
    });
    expect(emit).toHaveBeenCalledWith({
      type: 'add_annotation',
      payload: { at: 1, text: 'hi' },
    });
    emit.mockRestore();
  });
});
