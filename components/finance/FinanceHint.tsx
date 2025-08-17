'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from '@/i18n/useTranslations';
import { subscribeUIEvents, type UIEvent } from '@/lib/ui/events';

/**
 * FinanceHint displays a guided message explaining how to ask
 * the agent for a chart. It hides itself once a `show_chart`
 * event is emitted on the UI event bus.
 */
export default function FinanceHint({
  subscribe = subscribeUIEvents,
}: {
  /** Allows tests to inject a custom subscription mechanism. */
  subscribe?: typeof subscribeUIEvents;
}) {
  // Visibility flag toggled off once a chart is requested.
  const [visible, setVisible] = useState(true);
  const t = useTranslations('chat');

  useEffect(() => {
    return subscribe((event: UIEvent) => {
      if (event.type === 'show_chart') {
        setVisible(false);
      }
    });
  }, [subscribe]);

  if (!visible) return null;

  return (
    <div
      data-testid="finance-hint"
      className="fixed bottom-4 right-4 z-10 rounded-md border bg-background p-3 text-sm shadow"
    >
      {t('financeHint')}
    </div>
  );
}

