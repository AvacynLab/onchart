'use client';

import React, { useState } from 'react';
import { useAsset } from '@/lib/asset/AssetContext';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Artifact } from '@/components/artifact/ArtifactViewer';
import { createChatDraft } from '@/lib/chat/create-chat';

// Lazily import the artifact viewer using `eval` to avoid static analysis
// pulling in `lightweight-charts` during server-side rendering and tests.
const ArtifactViewer = dynamic(
  () => eval('import')('@/components/artifact/ArtifactViewer'),
  { ssr: false },
) as React.ComponentType<{ artifact: Artifact }>;

interface DocSummary {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
}

// Fetch helper returning the paginated document list.
async function fetcher(url: string): Promise<{ items: DocSummary[]; total: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to load documents');
  return res.json();
}

/**
 * Lists existing analyses or strategies for the current asset and allows the
 * user to drill into a document or continue the conversation with the agent.
 */
export function AnalysesCard() {
  const { asset } = useAsset();
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [tab, setTab] = useState<'analysis' | 'strategy'>('analysis');
  const [viewer, setViewer] = useState<Artifact | null>(null);
  const { data } = useSWR(
    () => `/api/document/query?asset=${asset.symbol}&kind=${tab}`,
    fetcher,
    { refreshInterval: 60_000 },
  );

  return (
    <div
      className="border rounded p-4 overflow-y-auto min-h-0 flex flex-col"
      data-testid="analyses-card"
    >
      <div className="mb-2 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setTab('analysis')}
          className={tab === 'analysis' ? 'font-semibold underline' : 'underline'}
        >
          {t('bento.analyses')}
        </button>
        <button
          type="button"
          onClick={() => setTab('strategy')}
          className={tab === 'strategy' ? 'font-semibold underline' : 'underline'}
        >
          {t('bento.strategies')}
        </button>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {data?.items?.length
          ? data.items.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="underline"
                  onClick={async () => {
                    // Load full document and display it inside an overlay.
                    try {
                      const res = await fetch(`/api/document?id=${d.id}`);
                      const docs = await res.json();
                      const doc = docs[0];
                      if (doc?.content) {
                        setViewer(JSON.parse(doc.content) as Artifact);
                      }
                    } catch (err) {
                      console.error('failed to load document', err);
                    }
                  }}
                >
                  {d.title}
                </button>
                <span className="block text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))
          : <li className="text-muted-foreground">—</li>}
      </ul>
      <button
        type="button"
        className="mt-3 text-xs underline self-start"
        onClick={async () => {
          // Start a new chat draft and navigate to the chat view.
          const chatId = await createChatDraft('');
          router.push(`/chat/${chatId}`);
        }}
      >
        Continuer avec l’agent
      </button>
      {viewer && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
          data-testid="artifact-view"
        >
          <div className="bg-white dark:bg-neutral-900 p-4 rounded max-w-lg w-full">
            <ArtifactViewer artifact={viewer} />
            <button
              type="button"
              className="mt-2 text-sm underline"
              onClick={() => setViewer(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
