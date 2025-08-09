import { test, expect } from '@playwright/test';
import BentoGrid from '../../components/dashboard/BentoGrid';
import { financeToolbarItems } from '../../components/finance/toolbar-items';

test('dashboard modules are available', () => {
  expect(typeof BentoGrid).toBe('function');
  expect(Array.isArray(financeToolbarItems)).toBeTruthy();
  expect(financeToolbarItems[0].description.length).toBeGreaterThan(0);
});
