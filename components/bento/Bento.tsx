'use client';

import { BentoHeader } from './BentoHeader';
import { ChartCard } from './ChartCard';
import { NewsCard } from './NewsCard';
import { AnalysesCard } from './AnalysesCard';
import { ChatDock } from './ChatDock';
import MenuTile from '@/components/dashboard/tiles/MenuTile';

/**
 * Top-level container composing the bento dashboard.
 * It arranges header, content grid and chat dock in three rows that
 * adapt smoothly when the sidebar changes width.
 */
export function Bento() {
  return (
    <div className="h-full grid grid-rows-[auto_1fr_auto] gap-3 p-3">
      <BentoHeader />
      {/* Main grid containing all dashboard tiles. The `bento-grid` class is
          used as a stable hook for tests and to trigger fade-out transitions
          when the user navigates to a chat. */}
      <div
        id="bento-content"
        data-testid="bento-grid"
        className="bento-grid grid grid-cols-[1fr_340px] gap-3 min-h-0"
      >
        <ChartCard />
        <div className="grid grid-rows-[auto_1fr_auto] gap-3 min-h-0">
          <MenuTile />
          <NewsCard />
          <AnalysesCard />
        </div>
      </div>
      <ChatDock />
      {/* Fade out the grid when navigating away so the transition feels smooth. */}
      <style jsx global>{`
        #bento-content {
          transition: opacity 200ms ease;
        }
        #bento-content.fading-out {
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
