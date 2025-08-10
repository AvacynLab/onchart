import React from 'react';
import { LineChartIcon, SummarizeIcon } from '../icons';
import type { ArtifactToolbarItem } from '../create-artifact';
import { useTranslations } from 'next-intl';

/**
 * Build finance-related quick action items using the provided translator.
 */
export function getFinanceToolbarItems(
  t: (path: string) => string,
): ArtifactToolbarItem[] {
  return [
    {
      icon: <LineChartIcon />,
      description: t('toolbar.showAAPL.label'),
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: t('toolbar.showAAPL.prompt') }],
        });
      },
    },
    {
      icon: <SummarizeIcon />,
      description: t('toolbar.scanFx.label'),
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: t('toolbar.scanFx.prompt') }],
        });
      },
    },
  ];
}

/**
 * Hook returning localized finance quick actions for the active locale.
 */
export function useFinanceToolbarItems(): ArtifactToolbarItem[] {
  const t = useTranslations('finance');
  return getFinanceToolbarItems(t);
}
