import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Recursively collect all files under `tests/` so we can scan them for test
// declarations without relying on external binaries such as `rg`.
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// Count runnable tests by searching for `test(` occurrences across the tests
// directory. This ignores skipped tests because directives like `test.skip(` do
// not match the simple `test(` regex.
const files = walk(join(process.cwd(), 'tests'));
let count = 0;
for (const file of files) {
  // Only scan TypeScript sources; other files (e.g. fixtures) cannot contain
  // tests.
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
  const matches = readFileSync(file, 'utf8').match(/^\s*test\(/gm);
  if (matches) count += matches.length;
}

const MIN = 80;
if (count < MIN) {
  console.error(`Expected at least ${MIN} tests, found ${count}`);
  process.exit(1);
}
