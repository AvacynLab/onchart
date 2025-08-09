import { test, expect } from '@playwright/test';
import {
  timeframeSchema,
  intervalSchema,
  rangeSchema,
  dateSchema,
  symbolSchema,
} from '../../lib/finance/validate';

test('timeframe validation', () => {
  expect(timeframeSchema.parse('1h')).toBe('1h');
  expect(() => timeframeSchema.parse('2h')).toThrow();
});

test('interval validation', () => {
  expect(intervalSchema.parse('1m')).toBe('1m');
  expect(() => intervalSchema.parse('2m')).toThrow();
});

test('range validation', () => {
  expect(rangeSchema.parse('1mo')).toBe('1mo');
  expect(() => rangeSchema.parse('13mo')).toThrow();
});

test('date validation', () => {
  expect(dateSchema.parse('2024-01-01')).toBe('2024-01-01');
  expect(() => dateSchema.parse('2024/01/01')).toThrow();
});

test('symbol validation', () => {
  expect(symbolSchema.parse(' aapl ')).toBe('aapl');
  expect(() => symbolSchema.parse('')).toThrow();
});
