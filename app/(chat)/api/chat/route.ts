import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import { createFinanceTools } from '@/lib/ai/tools-finance';
import type { Tool } from 'ai';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

// --- Finance tools helpers -------------------------------------------------

/**
 * Wrap a tool so that any thrown error is converted into a `ChatSDKError` with
 * a namespaced identifier. The original tool metadata (description, schema)
 * is preserved by copying properties onto the wrapper function.
 */
function wrapTool(name: string, t: Tool) {
  const fn = async (args: unknown) => {
    try {
      // The `ai` library returns a plain object with an `execute` method.
      // Some tools may still be callable directly, so support both forms.
      const impl = typeof t === 'function' ? t : (t as any).execute;
      return await impl(args);
    } catch (error) {
      // Surface tool execution failures as generic chat bad requests so they
      // return a structured response instead of crashing the stream.
      throw new ChatSDKError('bad_request:chat', `tool ${name} failed`);
    }
  };

  return Object.assign(fn, t);
}

/**
 * Prefix all tool names under a namespace so that the LLM can call them using
 * dotted identifiers like `finance.get_quote`.
 */
function prefixTools(prefix: string, tools: Record<string, Tool>) {
  return Object.fromEntries(
    Object.entries(tools).map(([key, value]) => [
      `${prefix}.${key}`,
      wrapTool(`${prefix}.${key}`, value),
    ]),
  );
}

/**
 * Build the full finance tool map with prefixed namespaces so the chat route
 * can expose `finance.*`, `ui.*`, `research.*` and `strategy.*` helpers.
 * Exported for runtime verification in tests.
 */
export function buildFinanceToolMap(ft: ReturnType<typeof createFinanceTools>) {
  const {
    finance,
    ui: uiTools,
    research: researchTools,
    strategy: strategyTools,
  } = ft as any;
  return {
    ...prefixTools('finance', finance as Record<string, Tool>),
    ...prefixTools('ui', uiTools as Record<string, Tool>),
    ...prefixTools('research', researchTools as Record<string, Tool>),
    ...prefixTools('strategy', strategyTools as Record<string, Tool>),
  };
}

/**
 * Convert a `ChatSDKError` into a `Response` while attaching a diagnostic
 * `X-Error-Code` header. Centralizing this logic ensures that all API error
 * responses expose machine-readable codes for debugging without inspecting the
 * body. The API always returns a 200 status so clients can process errors
 * through the stream without triggering fetch-level failures.
 */
function errorResponse(error: ChatSDKError) {
  // Surface the full error details in logs so failures during streaming can be
  // diagnosed from CI output. The response itself always returns 200 with a
  // diagnostic header, allowing clients to handle errors without fetch-level
  // failures.
  console.error(error);
  const base = error.toResponse();
  const headers = new Headers(base.headers);
  headers.set('X-Error-Code', `${error.type}:${error.surface}`);
  return new Response(base.body, { status: 200, headers });
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return errorResponse(new ChatSDKError('bad_request:api'));
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return errorResponse(new ChatSDKError('unauthorized:chat'));
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return errorResponse(new ChatSDKError('rate_limit:chat'));
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return errorResponse(new ChatSDKError('forbidden:chat'));
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    // Build finance toolset with context-specific persistence and namespacing.
    const locale =
      (request.headers.get('x-next-intl-locale') as 'fr' | 'en') || 'fr';
    const ft = createFinanceTools({
      userId: session.user.id,
      chatId: id,
      locale,
    });
    const financeToolMap = buildFinanceToolMap(ft);

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            locale,
          }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          // Expose all finance tools to the model so filtering can happen
          // declaratively at runtime. The list is built from the prefixed
          // tool map and enables calls like `finance.get_quote`.
          // Cast is required because `experimental_activeTools` expects a
          // string literal union from the base template; forcing `any` lets
          // the expanded finance map be accepted by the API.
          experimental_activeTools: Object.keys(
            financeToolMap,
          ) as any,
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
            ...financeToolMap,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return errorResponse(error);
    }
    return errorResponse(new ChatSDKError('bad_request:chat'));
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return errorResponse(new ChatSDKError('bad_request:api'));
  }

  const session = await auth();

  if (!session?.user) {
    return errorResponse(new ChatSDKError('unauthorized:chat'));
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return errorResponse(new ChatSDKError('forbidden:chat'));
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
