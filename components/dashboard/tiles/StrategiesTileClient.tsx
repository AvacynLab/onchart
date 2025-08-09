'use client';

import React, { useState } from 'react';
import BentoCard from '../BentoCard';
import StrategyWizard, { WizardAnswers } from '@/components/finance/StrategyWizard';
import StrategyCard from '@/components/finance/StrategyCard';
import type { Strategy } from '@/lib/db/schema';
import StrategiesTileEmpty from '../empty/StrategiesTileEmpty';

interface Props {
  initial: Strategy[];
  /** Cursor returned by the initial page; null when no more data. */
  initialCursor?: string | null;
  chatId?: string;
}

/**
 * Client component handling creation of strategies through the wizard and
 * rendering the list of existing entries.
 */
export default function StrategiesTileClient({ initial, initialCursor, chatId }: Props) {
  const [items, setItems] = useState<Strategy[]>(initial);
  const [cursor, setCursor] = useState<string | null | undefined>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleComplete(data: WizardAnswers) {
    if (!chatId) return;
    try {
      const res = await fetch('/api/finance/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo',
          chatId,
          title: `Stratégie ${Date.now()}`,
          universe: { note: data.universe },
          constraints: { horizon: data.horizon, risk: data.risk, fees: data.fees },
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as Strategy;
        setItems([...items, created]);
      }
    } catch (err) {
      console.error('failed to create strategy', err);
    }
    setOpen(false);
  }

  async function loadMore() {
    if (!chatId || !cursor) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/finance/strategy?chatId=${chatId}&cursor=${cursor}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const page = (await res.json()) as { items: Strategy[]; nextCursor: string | null };
        setItems((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      }
    } catch (err) {
      console.error('failed to load more strategies', err);
    }
    setLoading(false);
  }

  function StrategyList({ items }: { items: Strategy[] }) {
    if (items.length === 0) {
      return <StrategiesTileEmpty />;
    }
    return (
      <div>
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id}>
              <StrategyCard strategy={s} />
            </li>
          ))}
        </ul>
        {cursor && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="mt-2 text-xs underline"
          >
            {loading ? 'Chargement…' : 'Afficher plus'}
          </button>
        )}
      </div>
    );
  }

  return (
    <BentoCard
      title="Mes stratégies"
      actions={
        <button onClick={() => setOpen((v) => !v)} className="text-xs underline">
          {open ? 'Annuler' : 'Créer'}
        </button>
      }
    >
      {open ? <StrategyWizard onComplete={handleComplete} /> : <StrategyList items={items} />}
    </BentoCard>
  );
}

