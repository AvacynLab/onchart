import React from 'react';
import type { Research } from '@/lib/db/schema';

/**
 * Displays a clickable list of research documents tied to a chat.
 */
export interface ResearchListProps {
  /** research documents to display */
  documents: Array<Pick<Research, 'id' | 'title' | 'kind' | 'updatedAt'>>;
  /** optional callback when a document is selected */
  onSelect?: (id: string) => void;
}

export default function ResearchList({
  documents,
  onSelect,
}: ResearchListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No research documents yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="research list">
      {documents.map((doc) => (
        <li key={doc.id}>
          <button
            type="button"
            className="w-full text-left p-2 rounded hover:bg-muted"
            onClick={() => onSelect?.(doc.id)}
          >
            <div className="font-medium">{doc.title}</div>
            <div className="text-xs text-muted-foreground">
              {doc.kind} · {new Date(doc.updatedAt).toLocaleDateString()}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
