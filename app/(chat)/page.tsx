import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import FinancePanel from '@/components/finance/FinancePanel';
import FinanceHint from '@/components/finance/FinanceHint';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { parseAnchor, buildInitialInput } from '@/lib/chat/anchor';

export default async function Page(props: { searchParams?: Promise<{ anchor?: string }> }) {
  const session = await auth();
  const search = (await props.searchParams) ?? {};
  const anchor = parseAnchor(search.anchor);
  const initialInput = anchor ? buildInitialInput(anchor) : undefined;

  if (!session) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType="private"
          isReadonly={false}
          session={session}
          autoResume={false}
          initialInput={initialInput}
          anchor={anchor ?? undefined}
        />
        <DataStreamHandler />
        <FinancePanel chatId={id} userId={session.user.id} />
        <FinanceHint />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie.value}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
        initialInput={initialInput}
        anchor={anchor ?? undefined}
      />
      <DataStreamHandler />
      <FinancePanel chatId={id} userId={session.user.id} />
      <FinanceHint />
    </>
  );
}
