import { test } from 'node:test';
import assert from 'node:assert/strict';
import { financePrompt } from '../../lib/ai/prompts';

test('financePrompt contains French disclaimer and guidelines', () => {
  assert.ok(
    financePrompt.includes(
      'Les données sont publiques, non garanties, et peuvent être incomplètes. Les réponses ne constituent pas un conseil en investissement.'
    ),
    'disclaimer missing'
  );
  assert.ok(
    financePrompt.includes('Précise un timeframe avant d\'appeler ui.show_chart.'),
    'timeframe guideline missing'
  );
  assert.ok(
    financePrompt.includes('Utilise compute_indicators pour l\'analyse technique.'),
    'compute_indicators guideline missing'
  );
});
