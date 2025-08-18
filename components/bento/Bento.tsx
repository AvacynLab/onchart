'use client';

import { BentoHeader } from './BentoHeader';
import { ChartCard } from './ChartCard';
import { NewsCard } from './NewsCard';
import { AnalysesCard } from './AnalysesCard';
import { ChatDock } from './ChatDock';

/**
 * Top-level container composing the bento dashboard.
 * It arranges header, content grid and chat dock in three rows that
 * adapt smoothly when the sidebar changes width.
 */
export function Bento() {
  return (
    <div className="h-full grid grid-rows-[auto_1fr_auto] gap-3 p-3">
      <BentoHeader />
      <div
        id="bento-content"
        className="grid grid-cols-[1fr_340px] gap-3 min-h-0"
      >
        <ChartCard />
        <div className="grid grid-rows-[1fr_auto] gap-3 min-h-0">
          <NewsCard />
          <AnalysesCard />
        </div>
      </div>
      <ChatDock />
    </div>
  );
}
