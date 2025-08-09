import { test, expect } from '@playwright/test';
import { generalResearch } from '../../lib/finance/strategies';

test('collects quote and news context for a topic', async () => {
  const quote = async () => ({ price: 100, change: 1, marketState: 'REGULAR' });
  const news = async () => [
    { title: 'Alpha', link: 'a', pubDate: '2024-01-01', summary: 'A' },
    { title: 'Beta', link: 'b', pubDate: '2024-01-02', summary: 'B' },
  ];
  const res = await generalResearch('AAPL', { quote, news });
  expect(res.topic).toBe('AAPL');
  expect(res.data.price).toBe(100);
  expect(res.context).toEqual(['Alpha', 'Beta']);
  expect(res.sources).toHaveLength(2);
  expect(res.insights).toEqual([]);
  expect(res.risks).toEqual([]);
});
