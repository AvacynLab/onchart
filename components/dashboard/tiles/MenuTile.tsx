"use client";

import React, { useEffect, useRef, useId } from 'react';
import { useLocale } from 'next-intl';
import BentoCard from '../BentoCard';
import { getFinanceToolbarItems } from '@/components/finance/toolbar-items';
import { useToolbarStore } from '@/components/toolbar-store';
import frDashboard from '@/messages/fr/dashboard.json' assert { type: 'json' };
import enDashboard from '@/messages/en/dashboard.json' assert { type: 'json' };
import frFinance from '@/messages/fr/finance.json' assert { type: 'json' };
import enFinance from '@/messages/en/finance.json' assert { type: 'json' };

/**
 * Inline menu tile replacing the previous floating toolbar overlay.
 * It simply lists the finance quick actions and can be toggled open/closed.
 */
export default function MenuTile() {
  const locale = useLocale();
  const dashboard = locale === 'en' ? (enDashboard as any) : (frDashboard as any);
  const finance = locale === 'en' ? (enFinance as any) : (frFinance as any);
  // Simple dot-notation resolver used by `getFinanceToolbarItems` for
  // translations stored in JSON objects.
  const t = (path: string) => path.split('.').reduce((acc: any, key) => acc[key], finance);
  const items = getFinanceToolbarItems(t);
  const { isVisible, setIsVisible } = useToolbarStore();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const titleId = useId();

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
      title={dashboard.menu.title}
      titleId={titleId}
      actions={
        <button
          ref={buttonRef}
          // Explicit button type prevents form submissions when used inside forms
          type="button"
          aria-label={dashboard.menu.toggle}
          aria-expanded={isVisible}
          aria-controls="dashboard-menu-list"
          className="text-xs underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={() => setIsVisible((v) => !v)}
        >
          {isVisible ? dashboard.menu.close : dashboard.menu.open}
        </button>
      }
    >
      {isVisible ? (
        <ul
          id="dashboard-menu-list"
          role="menu"
          ref={listRef}
          className="space-y-2"
          aria-labelledby={titleId}
        >
          {items.map((item) => (
            <li
              key={item.description}
              role="menuitem"
              tabIndex={0}
              className="text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex items-center gap-2"
            >
              {/* Display the toolbar item's icon to mirror the chat toolbar */}
              <span aria-hidden="true" className="size-4">
                {item.icon}
              </span>
              {item.description}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{dashboard.menu.hidden}</p>
      )}
    </BentoCard>
  );
}
