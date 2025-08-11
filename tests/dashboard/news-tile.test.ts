import test from 'node:test';
import { strict as assert } from 'node:assert';
import { sanitizeSummary } from '../../components/dashboard/tiles/NewsTile';

test('sanitizeSummary strips HTML tags and script content', () => {
  const dirty = "<p>Hello <strong>world</strong><script>alert('x')</script></p>";
  const clean = sanitizeSummary(dirty);
  assert.equal(clean.trim(), 'Hello world');
  assert(!clean.includes('alert'));
});
