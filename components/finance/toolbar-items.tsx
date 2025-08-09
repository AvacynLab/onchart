import React from 'react';
import { LineChartIcon, SummarizeIcon } from '../icons';
import type { ArtifactToolbarItem } from '../create-artifact';

/**
 * Finance related quick actions displayed in the main toolbar. Each item sends
 * a pre-defined message to the chat so the agent can execute finance tools.
 */
export const financeToolbarItems: ArtifactToolbarItem[] = [
  {
    icon: <LineChartIcon />, 
    description: 'Afficher AAPL 1D',
    onClick: ({ sendMessage }) => {
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: 'Affiche le graphique AAPL en 1D' }],
      });
    },
  },
  {
    icon: <SummarizeIcon />,
    description: 'Scanner opportunités FX',
    onClick: ({ sendMessage }) => {
      sendMessage({
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Scanne les opportunités sur les paires FX majeures',
          },
        ],
      });
    },
  },
];
