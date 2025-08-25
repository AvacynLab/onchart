import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { convertToUIMessages } from '@/lib/utils';
import FinancePanel from '@/components/finance/FinancePanel';
import FinanceHint from '@/components/finance/FinanceHint';
import { parseAnchor, buildInitialInput } from '@/lib/chat/anchor';

export default async function Page(props: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ anchor?: string }>;
}) {
  const params = await props.params;
  const search = (await props.searchParams) ?? {};
  const anchor = parseAnchor(search.anchor);
  // Ensure `initialInput` is always a string so exact optional property types
  // allow passing it directly to the `<Chat>` component without omitting the
  // prop when no anchor is present.
  const initialInput = anchor ? buildInitialInput(anchor) : '';
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  if (chat.visibility === 'private') {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={uiMessages}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
          session={session}
          autoResume={true}
          initialInput={initialInput}
          {...(anchor ? { anchor } : {})}
        />
        <DataStreamHandler />
        <FinancePanel chatId={chat.id} userId={session.user.id} />
        <FinanceHint />
      </>
    );
  }

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={uiMessages}
        initialChatModel={chatModelFromCookie.value}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        session={session}
        autoResume={true}
        initialInput={initialInput}
        {...(anchor ? { anchor } : {})}
      />
      <DataStreamHandler />
      <FinancePanel chatId={chat.id} userId={session.user.id} />
      <FinanceHint />
    </>
  );
}
