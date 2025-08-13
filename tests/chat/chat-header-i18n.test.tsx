import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import Module from 'module';
import { NextIntlClientProvider } from 'next-intl';
import { SidebarProvider } from '../../components/ui/sidebar';
import { ChatHeader } from '../../components/chat-header';

// Stub next/navigation and next/link for the test environment.
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === 'next/navigation') {
    return { useRouter: () => ({ push: () => {}, refresh: () => {} }) };
  }
  if (request === 'next/link') {
    return ({ href, children }: any) => React.createElement('a', { href }, children);
  }
  return originalLoad(request, parent, isMain);
};

// Setup jsdom for React rendering.
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-expect-error jsdom globals
globalThis.window = dom.window as any;
// @ts-expect-error jsdom globals
globalThis.document = dom.window.document as any;

test('chat header uses translations', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const messages = {
    chat: {
      newChat: 'New Chat',
      newChatTooltip: 'New Chat',
      deployWithVercel: 'Deploy with Vercel',
    },
  };

  createRoot(container).render(
    React.createElement(
      NextIntlClientProvider,
      { locale: 'en', messages },
      React.createElement(
        SidebarProvider,
        null,
        React.createElement(ChatHeader, {
          chatId: '1',
          selectedModelId: 'gpt',
          selectedVisibilityType: 'private',
          isReadonly: false,
          session: { user: { id: 'u1' } } as any,
        }),
      ),
    ),
  );
  await new Promise((r) => setTimeout(r, 0));
  const enText = container.textContent ?? '';
  assert.match(enText, /Deploy with Vercel/);
  assert.match(enText, /New Chat/);

  // Rerender with French messages
  container.innerHTML = '';
  const frMessages = {
    chat: {
      newChat: 'Nouveau chat',
      newChatTooltip: 'Nouveau chat',
      deployWithVercel: 'Déployer avec Vercel',
    },
  };
  createRoot(container).render(
    React.createElement(
      NextIntlClientProvider,
      { locale: 'fr', messages: frMessages },
      React.createElement(
        SidebarProvider,
        null,
        React.createElement(ChatHeader, {
          chatId: '1',
          selectedModelId: 'gpt',
          selectedVisibilityType: 'private',
          isReadonly: false,
          session: { user: { id: 'u1' } } as any,
        }),
      ),
    ),
  );
  await new Promise((r) => setTimeout(r, 0));
  const frText = container.textContent ?? '';
  assert.match(frText, /Déployer avec Vercel/);
  assert.match(frText, /Nouveau chat/);
});
