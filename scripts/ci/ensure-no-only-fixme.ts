import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Recursively walk through a directory and return all file paths.
 */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const targets = walk(join(process.cwd(), 'tests', 'e2e'));
const forbidden = [/\.only\(/, /test\.skip\(/, /test\.fixme\(/, /describe\.skip\(/, /describe\.fixme\(/];
let found = false;

for (const file of targets) {
  const content = readFileSync(file, 'utf8');
  if (forbidden.some((r) => r.test(content))) {
    console.error(`Forbidden directive found in ${file}`);
    found = true;
  }
}

if (found) {
  process.exit(1);
}
