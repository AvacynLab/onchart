import '../helpers/next-intl-stub';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { useTranslations } from '@/i18n/useTranslations';

// Ensure that missing translation keys do not throw during development and
// instead render the key wrapped in brackets.

test('missing translation falls back to key', () => {
  function Comp() {
    const t = useTranslations('dashboard.prices');
    return <span>{t('does.not.exist')}</span>;
  }
  const html = renderToString(
    <NextIntlClientProvider messages={{}}>
      <Comp />
    </NextIntlClientProvider>
  );
  assert.ok(html.includes('[does.not.exist]'));
});
