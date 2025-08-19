'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateUUID } from '@/lib/utils';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { UIMessage } from 'ai';
import type { Attachment, ChatMessage } from '@/lib/types';
import { MultimodalInput } from '@/components/multimodal-input';

/**
 * Bottom docked chat input reusing the main `MultimodalInput` component. It
 * collects a message (and optional file attachments), creates a new chat on
 * the server and then fades out the bento grid before navigating to the chat
 * page. Using the shared component keeps behaviour consistent with the chat
 * view and unlocks attachment uploads for the landing page.
 */
export function ChatDock() {
  const router = useRouter();

  // Local state mirrors the props required by `MultimodalInput` but the chat is
  // only created once the user submits their first message.
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [messages, setMessages] = useState<Array<UIMessage>>([]);

  // Generate a stable chat id so the input can optimistically change the URL
  // before the server confirms creation. Using a ref avoids re-renders.
  const chatIdRef = useRef(generateUUID());

  // Minimal `sendMessage` implementation that persists the message server-side
  // and then redirects the user to the newly created chat.
  const sendMessage: (args: {
    role: ChatMessage['role'];
    parts: ChatMessage['parts'];
  }) => void = async ({ role, parts }) => {
    const messageId = generateUUID();
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chatIdRef.current,
          message: { id: messageId, role, parts },
          selectedChatModel: DEFAULT_CHAT_MODEL,
          selectedVisibilityType: 'private',
        }),
        keepalive: true,
      });
    } catch (err) {
      console.error('failed to create chat', err);
    }

    // Fade out the bento grid before leaving the page for a smoother UX.
    document.getElementById('bento-content')?.classList.add('fading-out');
    router.push(`/chat/${chatIdRef.current}`);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-6">
      <div className="pointer-events-auto w-full max-w-xl" data-testid="multimodal-input">
        <MultimodalInput
          chatId={chatIdRef.current}
          input={input}
          setInput={setInput}
          status="ready"
          stop={() => {}}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          setMessages={setMessages as any}
          sendMessage={sendMessage as any}
          selectedVisibilityType="private"
        />
      </div>
    </div>
  );
}
