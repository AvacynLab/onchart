'use client';

import React, { useRef, useState } from 'react';
import { useTranslations } from '@/i18n/useTranslations';
import { z } from 'zod';

/**
 * Schema describing the answers collected from the strategy creation wizard.
 * The `constraints` field is optional so tests can omit it when not needed.
 */
const wizardSchema = z.object({
  horizon: z.string(),
  risk: z.string(),
  universe: z.string(),
  /** Estimated fees or slippage percentage. */
  fees: z.number(),
  /** Maximum acceptable drawdown percentage. */
  drawdown: z.number(),
  /** Additional constraints such as ESG or trading frequency. */
  constraints: z.string().optional(),
});

export type WizardAnswers = z.infer<typeof wizardSchema>;

interface Props {
  /** Callback invoked when the wizard collects all answers. */
  onComplete?: (answers: WizardAnswers) => void;
}

/**
 * Very small multi-step form collecting high level constraints for a trading
 * strategy. Each step exposes a single input in order to keep the component
 * simple and testable.
 */
export default function StrategyWizard({ onComplete }: Props) {
  const t = useTranslations('finance.wizard');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({
    horizon: '',
    risk: '',
    universe: '',
    fees: 0,
    drawdown: 0,
    constraints: undefined,
  });

  const fields: Array<{
    label: string;
    name: keyof WizardAnswers;
    type: string;
  }> = [
    { label: t('horizon'), name: 'horizon', type: 'text' },
    { label: t('risk'), name: 'risk', type: 'text' },
    { label: t('universe'), name: 'universe', type: 'text' },
    { label: t('fees'), name: 'fees', type: 'number' },
    { label: t('drawdown'), name: 'drawdown', type: 'number' },
    { label: t('constraints'), name: 'constraints', type: 'text' },
  ];

  const current = fields[step];
  const inputRef = useRef<HTMLInputElement>(null);

  // Guard against an out-of-bounds step index which could occur if the fields
  // definition changes without resetting the current step.
  if (!current) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = inputRef.current?.value ?? '';
    // Recompute the field in case the step changed before submission.
    const field = fields[step];
    if (!field) return;
    const value = field.type === 'number' ? Number(raw) : raw;
    const nextAnswers = { ...answers, [field.name]: value } as WizardAnswers;
    setAnswers(nextAnswers);
    if (step < fields.length - 1) {
      setStep(step + 1);
    } else {
      // Validate collected answers before forwarding them to the parent.
      const parsed = wizardSchema.parse(nextAnswers);
      onComplete?.(parsed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-1">
        {current.label}
        <input
          name={current.name}
          data-testid={
            current.name === 'constraints' ? 'constraints-input' : undefined
          }
          type={current.type}
          ref={inputRef}
          defaultValue={answers[current.name] as string | number | undefined}
          className="border rounded px-2 py-1"
        />
      </label>
      <button type="submit" className="self-end underline text-xs">
        {step < fields.length - 1 ? t('next') : t('finish')}
      </button>
    </form>
  );
}
