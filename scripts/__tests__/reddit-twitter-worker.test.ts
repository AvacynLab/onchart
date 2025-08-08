import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshSocial } from '../reddit-twitter-worker';

const symbols = ['AAPL'];

test('refreshSocial inserts sentiment rows from twitter and reddit', async () => {
  const inserts: any[] = [];
  const db = {
    insert: () => ({
      values: (val: any) => {
        inserts.push(val);
        return Promise.resolve();
      },
    }),
  } as any;

  const fetchMock = async (url: string) => {
    if (url.includes('twitter')) {
      return {
        json: async () => ({
          data: [
            {
              id: '1',
              text: 'Great quarter for $AAPL',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      } as any;
    }
    return {
      json: async () => ({
        data: {
          children: [
            {
              data: {
                title: 'Reddit also likes $AAPL',
                permalink: '/r/stocks/1',
                created_utc: 1700000000,
              },
            },
          ],
        },
      }),
    } as any;
  };

  await refreshSocial(db, symbols, 'token', fetchMock as any);

  assert.equal(inserts.length, 2);
  const [tweet, reddit] = inserts;
  assert.equal(tweet.symbol, 'AAPL');
  assert.equal(tweet.url, 'https://twitter.com/i/web/status/1');
  assert.equal(reddit.url, 'https://reddit.com/r/stocks/1');
});

