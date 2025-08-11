import { test } from 'node:test';
import assert from 'node:assert/strict';
import { financePrompts, systemPrompt, type RequestHints } from '../../lib/ai/prompts';

const hints: RequestHints = {
  latitude: 0,
  longitude: 0,
  city: 'Paris',
  country: 'FR',
};

test('financePrompts include FR and EN disclaimers', () => {
  assert.ok(
    financePrompts.fr.includes(
      'Les données sont **publiques** et **non garanties** (Yahoo/SEC/RSS). **Pas un conseil en investissement.**'
    ),
    'missing French disclaimer'
  );
  assert.ok(
    financePrompts.fr.includes('Toujours préciser la **timeframe** avant ui.show_chart.'),
    'missing French timeframe reminder'
  );
  assert.ok(
    financePrompts.en.includes(
      'Data is **public** and **not guaranteed**. **Not investment advice.**'
    ),
    'missing English disclaimer'
  );
  assert.ok(
    financePrompts.en.includes('Always specify **timeframe** before ui.show_chart.'),
    'missing English timeframe reminder'
  );
});

test('systemPrompt respects locale', () => {
  const frPrompt = systemPrompt({
    selectedChatModel: 'gpt-5o',
    requestHints: hints,
    locale: 'fr',
  });
  assert.ok(
    frPrompt.includes('Résumé, Contexte, Données, Graphiques, Signaux, Risques, Sources'),
    'French sections missing'
  );
  const enPrompt = systemPrompt({
    selectedChatModel: 'gpt-5o',
    requestHints: hints,
    locale: 'en',
  });
  assert.ok(
    enPrompt.includes('Summary, Context, Data, Charts, Signals, Risks, Sources'),
    'English sections missing'
  );
});
