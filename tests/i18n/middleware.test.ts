import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

// Le middleware doit propager la langue depuis l'en-tête ou le cookie sans réécrire l'URL.

test('négocie la langue et écrit le cookie', () => {
  const request = new NextRequest('https://example.com/', {
    headers: { 'accept-language': 'en-US,en;q=0.9,fr;q=0.8' },
  });
  const response = middleware(request);
  assert.equal(response.headers.get('x-next-intl-locale'), 'en');
  assert.equal(response.cookies.get('lang')?.value, 'en');
});

test('respecte le cookie existant', () => {
  const request = new NextRequest('https://example.com/', {
    headers: { cookie: 'lang=fr' },
  });
  const response = middleware(request);
  assert.equal(response.headers.get('x-next-intl-locale'), 'fr');
  assert.equal(response.cookies.get('lang'), undefined);
});
