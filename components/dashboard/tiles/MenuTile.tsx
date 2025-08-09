import React, { useEffect, useRef } from 'react';
import BentoCard from '../BentoCard';
import { financeToolbarItems } from '@/components/finance/toolbar-items';
import { useToolbarStore } from '@/components/toolbar-store';

/**
 * Inline menu tile replacing the previous floating toolbar overlay.
 * It simply lists the finance quick actions and can be toggled open/closed.
 */
export default function MenuTile() {
  const { isVisible, setIsVisible } = useToolbarStore();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // When opening the menu, move focus to the first action. When closing,
  // return focus to the toggle button. This aids keyboard navigation.
  useEffect(() => {
    if (isVisible) {
      const firstItem = listRef.current?.querySelector<HTMLElement>('li');
      firstItem?.focus();
    } else {
      buttonRef.current?.focus();
    }
  }, [isVisible]);

  return (
    <BentoCard
      title="Menu"
      actions={
        <button
          ref={buttonRef}
          aria-label="Basculer le menu"
          aria-expanded={isVisible}
          aria-controls="dashboard-menu-list"
          className="text-xs underline"
          onClick={() => setIsVisible((v) => !v)}
        >
          {isVisible ? 'Fermer' : 'Ouvrir'}
        </button>
      }
    >
      {isVisible ? (
        <ul
          id="dashboard-menu-list"
          role="menu"
          ref={listRef}
          className="space-y-2"
        >
          {financeToolbarItems.map((item) => (
            <li
              key={item.description}
              role="menuitem"
              tabIndex={0}
              className="text-sm focus:outline-none"
            >
              {item.description}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Menu masqué</p>
      )}
    </BentoCard>
  );
}
