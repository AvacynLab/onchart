'use server';

import { getSuggestionsByDocumentId, getDocumentById } from '@/lib/db/queries';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}

export async function getChartDocument({
  documentId,
}: {
  documentId: string;
}) {
  return getDocumentById({ id: documentId });
}
