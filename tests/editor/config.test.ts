import { headingRule } from '@/lib/editor/config';

// Ensure headingRule produces a valid input rule without throwing.
// This protects against missing optional schema nodes.
test('headingRule returns an input rule', () => {
  expect(() => headingRule(1)).not.toThrow();
});
