import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';

import { MultimodalInput } from '../../components/multimodal-input';

// Rendering the multimodal input should expose all test IDs used by
// Playwright and surface the scroll-to-bottom control when the message list
// is not positioned at the end.
test('multimodal input exposes expected test IDs', () => {
  const html = renderToString(
    <NextIntlClientProvider locale="en" messages={{}}>
      <MultimodalInput
        chatId="test"
        input=""
        setInput={() => {}}
        status="ready"
        stop={() => {}}
        attachments={[]}
        setAttachments={() => {}}
        messages={[]}
        setMessages={() => {}}
        sendMessage={async () => {}}
        selectedVisibilityType="private"
      />
    </NextIntlClientProvider>
  );

  assert.ok(html.includes('data-testid="multimodal-input"'));
  assert.ok(html.includes('data-testid="send-button"'));
  assert.ok(html.includes('data-testid="attachments-button"'));
  assert.ok(html.includes('data-testid="scroll-to-bottom-button"'));
});
