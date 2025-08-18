'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChatDraft } from '@/lib/chat/create-chat';

/**
 * Bottom docked chat input. Submitting fades out the bento content and
 * navigates to a newly created chat page with the typed message.
 */
export function ChatDock() {
  const [text, setText] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    // Create the chat on the server and seed it with the first message.
    const chatId = await createChatDraft(message);
    // Fade out the main content before navigating.
    document.getElementById('bento-content')?.classList.add('fading-out');
    router.push(`/chat/${chatId}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 flex w-full justify-center"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full max-w-xl border rounded-l px-2 py-1"
        placeholder="Ask a question"
      />
      <button type="submit" className="border rounded-r px-3">
        →
      </button>
    </form>
  );
}
