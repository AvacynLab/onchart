import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import ChartWidget from '@/components/ChartWidget';
import AssetSidebar from '@/components/AssetSidebar';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';

/**
 * Chart dashboard page combining the chart, asset sidebar and contextual chat.
 */
export default async function Page(
  props: { params: Promise<{ symbol: string; interval: string }> },
) {
  const params = await props.params;
  const { symbol, interval } = params;

  const session = await auth();
  if (!session) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');
  const initialModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-0">
          <ChartWidget symbol={symbol} interval={interval} />
        </div>
        <div className="w-80 border-l">
          <AssetSidebar symbol={symbol} />
        </div>
      </div>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={initialModel}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler />
    </div>
  );
}

