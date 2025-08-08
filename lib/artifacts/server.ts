import { codeDocumentHandler } from '@/artifacts/code/server';
import { imageDocumentHandler } from '@/artifacts/image/server';
import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { textDocumentHandler } from '@/artifacts/text/server';
import { chartDocumentHandler } from '@/artifacts/chart/server';
import { researchAssetDocumentHandler } from '@/artifacts/research-asset/server';
import { researchOpportunityDocumentHandler } from '@/artifacts/research-opportunity/server';
import { researchFaTaDocumentHandler } from '@/artifacts/research-fa-ta/server';
import { researchGeneralDocumentHandler } from '@/artifacts/research-general/server';
import { createRequire } from 'module';
import type { ArtifactKind } from '@/components/artifact';
import type { DocumentHandler } from './handler';

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler,
  chartDocumentHandler,
  researchAssetDocumentHandler,
  researchOpportunityDocumentHandler,
  researchFaTaDocumentHandler,
  researchGeneralDocumentHandler,
];

export const artifactKinds = [
  'text',
  'code',
  'image',
  'sheet',
  'chart',
  'research-asset',
  'research-opportunity',
  'research-fa-ta',
  'research-general',
] as const;
