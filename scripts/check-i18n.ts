import { readFileSync } from 'node:fs';
import path from 'node:path';

type Locale = 'fr' | 'en';
const NAMESPACES = ['common', 'dashboard', 'finance', 'chat'] as const;

type MissingMap = Record<Locale, string[]>;

/**
 * Recursively flattens an object of translation messages into dot-separated
 * keys. For example `{ prices: { title: '...' } }` becomes `['prices.title']`.
 */
function collectKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      keys.push(...collectKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

/**
 * Load translations for the given locale and namespace, returning all nested
 * keys.
 */
function loadKeys(locale: Locale, ns: string): string[] {
  const file = path.join(process.cwd(), 'messages', locale, `${ns}.json`);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return collectKeys(data);
}

/**
 * Compares translation keys between French and English message bundles. Returns
 * an object listing missing keys per locale so CI can fail fast when new
 * strings are added to only one language.
 */
export function checkI18nKeys(): MissingMap {
  const missing: MissingMap = { fr: [], en: [] };
  for (const ns of NAMESPACES) {
    const frKeys = loadKeys('fr', ns);
    const enKeys = loadKeys('en', ns);
    for (const key of frKeys) {
      if (!enKeys.includes(key)) missing.en.push(`${ns}.${key}`);
    }
    for (const key of enKeys) {
      if (!frKeys.includes(key)) missing.fr.push(`${ns}.${key}`);
    }
  }
  return missing;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const diff = checkI18nKeys();
  const problems = Object.entries(diff).filter(([, arr]) => arr.length > 0);
  if (problems.length > 0) {
    for (const [locale, keys] of problems) {
      console.error(`${locale} missing: ${keys.join(', ')}`);
    }
    process.exit(1);
  } else {
    console.log('Translation keys in sync.');
  }
}
