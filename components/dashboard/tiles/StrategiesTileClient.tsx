'use client';

import React, { useState, useId } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from '@/i18n/useTranslations';
import BentoCard from '../BentoCard';
import StrategyWizard, {
  type WizardAnswers,
} from '@/components/finance/StrategyWizard';
import StrategyCard from '@/components/finance/StrategyCard';
import type { Strategy } from '@/lib/db/schema';
import StrategiesTileEmpty from '../empty/StrategiesTileEmpty';

interface Props {
  initial: Strategy[];
  /** Cursor returned by the initial page; null when no more data. */
  initialCursor?: string | null;
  chatId?: string;
  /** id of the title element so lists can reference it */
  titleId?: string;
  /** Optional test id attached to the tile heading. */
  titleTestId?: string;
}

/**
 * Client component handling creation of strategies through the wizard and
 * rendering the list of existing entries.
 */
export default function StrategiesTileClient({
  initial,
  initialCursor,
  chatId,
  titleId: externalTitleId,
  titleTestId,
}: Props) {
  const t = useTranslations('dashboard.strategies');
  const locale = useLocale();
  const [items, setItems] = useState<Strategy[]>(initial);
  const [cursor, setCursor] = useState<string | null | undefined>(
    initialCursor,
  );
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // Generate a title id if the parent did not provide one.
  // Generate an identifier once and fall back to it when the parent does not
  // provide one to maintain predictable hook ordering.
  const generatedTitleId = useId();
  const titleId = externalTitleId ?? generatedTitleId;

  async function handleComplete(data: WizardAnswers) {
    if (!chatId) return;
    try {
      const res = await fetch('/api/finance/strategy/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo',
          chatId,
          locale,
          title: `Stratégie ${Date.now()}`,
          answers: data,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as { strategy: Strategy };
        setItems([...items, created.strategy]);
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
        const page = (await res.json()) as {
          items: Strategy[];
          nextCursor: string | null;
        };
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
      return <StrategiesTileEmpty message={t('empty')} />;
    }
    return (
      <div>
        <ul className="space-y-2" aria-labelledby={titleId}>
          {items.map((s) => (
            <li key={s.id}>
              <StrategyCard strategy={s} />
            </li>
          ))}
        </ul>
        {cursor && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="mt-2 text-xs underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {loading ? t('loading') : t('loadMore')}
          </button>
        )}
      </div>
    );
  }

  return (
    <BentoCard
      title={t('title')}
      titleId={titleId}
      titleTestId={titleTestId}
      actions={
        <button
          type="button"
          data-testid="strategy-create"
          onClick={() => setOpen((v) => !v)}
          className="text-xs underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          {open ? t('cancel') : t('create')}
        </button>
      }
    >
      {open ? (
        <StrategyWizard onComplete={handleComplete} />
      ) : (
        <StrategyList items={items} />
      )}
    </BentoCard>
  );
}
