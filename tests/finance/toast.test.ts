import { test, expect } from '@playwright/test';
import {
  DataSourceError,
  ParseError,
  RateLimitedError,
} from '@/lib/finance/errors';
import { financeErrorMessage } from '@/components/toast';

// Tests for finance error message mapping.

test('maps RateLimitedError to friendly message', () => {
  const message = financeErrorMessage(new RateLimitedError('limit'));
  expect(message).toContain('Rate limit');
});

test('maps DataSourceError to fetch failure message', () => {
  const message = financeErrorMessage(new DataSourceError('network'));
  expect(message).toContain('Failed to fetch');
});

test('maps ParseError to malformed data message', () => {
  const message = financeErrorMessage(new ParseError('bad json'));
  expect(message).toContain('malformed');
});

test('falls back to error message', () => {
  const message = financeErrorMessage(new Error('boom'));
  expect(message).toBe('boom');
});
