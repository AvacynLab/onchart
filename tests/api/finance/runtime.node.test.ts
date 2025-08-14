import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Helper reading a route file and asserting it exports the Node.js runtime.
function expectNodeRuntime(routePath: string): void {
  const file = readFileSync(routePath, 'utf8');
  // Ensure each finance route explicitly opts into the Node.js runtime so
  // scrapers execute server-side instead of attempting to run in Edge
  // environments. The literal string check keeps the test lightweight while
  // still catching accidental omissions.
  assert.match(file, /export const runtime = 'nodejs'/);
}

test('finance routes execute on nodejs runtime', () => {
  const base = join(__dirname, '../../../app/(chat)/api/finance');
  expectNodeRuntime(join(base, 'quote/route.ts'));
  expectNodeRuntime(join(base, 'ohlc/route.ts'));
  expectNodeRuntime(join(base, 'fundamentals/route.ts'));
  expectNodeRuntime(join(base, 'filings/route.ts'));
  expectNodeRuntime(join(base, 'news/route.ts'));
  expectNodeRuntime(join(base, 'attention/route.ts'));
  expectNodeRuntime(join(base, 'research/route.ts'));
  expectNodeRuntime(join(base, 'strategy/route.ts'));
});
