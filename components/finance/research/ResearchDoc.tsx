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

// Canonical order of sections expected by the finance agent.
const SECTION_ORDER: Array<{ id: string; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'market-context', label: 'Market Context' },
  { id: 'data', label: 'Data' },
  { id: 'charts', label: 'Charts' },
  { id: 'signals', label: 'Signals' },
  { id: 'risks', label: 'Risks' },
  { id: 'sources', label: 'Sources' },
];

export default function ResearchDoc({ title, sections }: ResearchDocProps) {
  return (
    <article aria-label={title} className="space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {SECTION_ORDER.map(({ id, label }) => {
        const section = sections.find((s) => s.id === id);
        if (!section) return null;
        return (
          <section key={id} className="space-y-2">
            <h3 className="text-lg font-medium">{section.title ?? label}</h3>
            <p className="whitespace-pre-wrap text-sm">{section.content}</p>
          </section>
        );
      })}
    </article>
  );
}
