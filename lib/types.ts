import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { getChart } from './ai/tools/get-chart';
import type { highlightPrice } from './ai/tools/highlight-price';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { scanOpportunities } from './ai/tools/scan-opportunities';
import type { analyseAsset } from './ai/tools/analyse-asset';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type chartTool = InferUITool<typeof getChart>;
type highlightPriceTool = InferUITool<typeof highlightPrice>;
type scanOpportunitiesTool = InferUITool<typeof scanOpportunities>;
type analyseAssetTool = InferUITool<typeof analyseAsset>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  getChart: chartTool;
  highlightPrice: highlightPriceTool;
  scanOpportunities: scanOpportunitiesTool;
  analyseAsset: analyseAssetTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
