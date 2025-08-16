import React from 'react';

/**
 * Renders a structured research document with canonical finance sections.
 * Sections are displayed in a fixed order to keep documents predictable.
 */
export interface ResearchSection {
  /** stable identifier for the section (e.g. 'summary', 'market-context') */
  id: string;
  /** optional custom heading displayed instead of the default label */
  title?: string;
  /** freeform markdown or plain text content */
  content: string;
}

export interface ResearchDocProps {
  /** document title */
  title: string;
  /** ordered list of sections composing the document */
  sections: ResearchSection[];
}

import { useTranslations } from 'next-intl';

// Ordered list of canonical section identifiers expected by the finance agent.
// The default labels are resolved at runtime via i18n so that empty sections
// render translated headings in both French and English.
const SECTION_ORDER = [
  'summary',
  'market-context',
  'data',
  'charts',
  'signals',
  'risks',
  'sources',
] as const;

export default function ResearchDoc({ title, sections }: ResearchDocProps) {
  const t = useTranslations('finance.research');

  return (
    <article aria-label={title} className="space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {SECTION_ORDER.map((id) => {
        const section = sections.find((s) => s.id === id);
        if (!section) return null;
        const label = section.title ?? t(id);
        return (
          <section key={id} className="space-y-2">
            <h3 className="text-lg font-medium">{label}</h3>
            <p className="whitespace-pre-wrap text-sm">{section.content}</p>
          </section>
        );
      })}
    </article>
  );
}
