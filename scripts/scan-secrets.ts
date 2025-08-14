import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Scan all tracked files for potential secret patterns like API keys or bearer tokens.
 * The search is intentionally simple: it runs a case-insensitive regex over each
 * file's text content and reports any matches with file and line numbers.
 *
 * Files such as documentation that legitimately mention these terms are ignored.
 * The function returns an array of matches so tests can assert the repository is
 * clean. When executed directly, the process exits with status 1 if any match is
 * found.
 */
export interface SecretMatch {
  file: string;
  line: number;
  text: string;
}

/**
 * Regular expression detecting common secret keywords.
 * Matches `apiKey`, `api-key`, `x-api-key` or `bearer` (case-insensitive).
 */
const SECRET_REGEX = /api[_-]?key|x-api-key|bearer/i;

/**
 * Files to exclude from the scan, e.g. documentation mentioning the pattern or
 * this script and its accompanying test. Without these exclusions the scanner
 * would flag its own regex definition and the test fixtures as false positives.
 */
const EXCLUDES = new Set([
  'AGENTS.md',
  'README.md',
  '.env.example',
  'scripts/scan-secrets.ts',
  'tests/security/secret-scan.node.test.ts',
]);

export function scanRepoForSecrets(cwd: string = process.cwd()): SecretMatch[] {
  const files = execSync('git ls-files', { cwd, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !EXCLUDES.has(f));

  const matches: SecretMatch[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (SECRET_REGEX.test(line)) {
        matches.push({ file, line: idx + 1, text: line.trim() });
      }
    });
  }
  return matches;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = scanRepoForSecrets();
  if (found.length > 0) {
    for (const m of found) {
      console.error(`${m.file}:${m.line}: ${m.text}`);
    }
    console.error('Secret-like patterns found.');
    process.exit(1);
  } else {
    console.log('No secret patterns found.');
  }
}
