import test from 'node:test';
import { strict as assert } from 'node:assert';
import { sanitizeSummary, formatRelative } from '../../components/dashboard/tiles/NewsTile';

test('sanitizeSummary strips HTML tags and script content', () => {
  const dirty = "<p>Hello <strong>world</strong><script>alert('x')</script></p>";
  const clean = sanitizeSummary(dirty);
  assert.equal(clean.trim(), 'Hello world');
  assert(!clean.includes('alert'));
});

test('formatRelative localises output', () => {
  const realNow = Date.now;
  // Freeze time for deterministic output
  Date.now = () => new Date('2020-01-01T12:00:00Z').getTime();
  const sample = new Date('2020-01-01T11:00:00Z');
  const en = formatRelative(sample, 'en');
  const fr = formatRelative(sample, 'fr');
  assert.notEqual(en, fr);
  assert.match(en, /ago/);
  assert.match(fr, /il y a/);
  // Restore Date.now
  Date.now = realNow;
});
