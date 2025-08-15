import { execSync } from 'node:child_process';

// Count runnable tests by searching for `test(` occurrences across the tests
// directory. This ignores skipped tests since patterns like `test.skip(` do not
// match the simple `test(` regex.
const result = execSync("rg -o '^\\s*test\\(' tests | wc -l", {
  encoding: 'utf8',
});
const count = Number(result.trim());
const MIN = 80;

if (count < MIN) {
  console.error(`Expected at least ${MIN} tests, found ${count}`);
  process.exit(1);
}
