'use client';

import React, { useRef, useState } from 'react';

/**
 * Answers collected from the strategy creation wizard.
 */
export interface WizardAnswers {
  horizon: string;
  risk: string;
  universe: string;
  fees: number;
}

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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({
    horizon: '',
    risk: '',
    universe: '',
    fees: 0,
  });

  const fields: Array<{
    label: string;
    name: keyof WizardAnswers;
    type: string;
  }> = [
    { label: "Horizon d'investissement", name: 'horizon', type: 'text' },
    { label: 'Tolérance au risque', name: 'risk', type: 'text' },
    { label: 'Univers de titres', name: 'universe', type: 'text' },
    { label: 'Frais (%)', name: 'fees', type: 'number' },
  ];

  const current = fields[step];

  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = inputRef.current?.value ?? '';
    const value = current.type === 'number' ? Number(raw) : raw;
    const nextAnswers = { ...answers, [current.name]: value } as WizardAnswers;
    setAnswers(nextAnswers);
    if (step < fields.length - 1) {
      setStep(step + 1);
    } else {
      onComplete?.(nextAnswers);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-1">
        {current.label}
        <input
          name={current.name}
          type={current.type}
          ref={inputRef}
          defaultValue={answers[current.name] as string | number}
          className="border rounded px-2 py-1"
        />
      </label>
      <button type="submit" className="self-end underline text-xs">
        {step < fields.length - 1 ? 'Suivant' : 'Terminer'}
      </button>
    </form>
  );
}

