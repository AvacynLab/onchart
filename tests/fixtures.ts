import { expect as baseExpect, test as baseTest } from '@playwright/test';
import { createAuthenticatedContext, type UserContext } from './helpers';
import { getUnixTime } from 'date-fns';

interface Fixtures {
  adaContext: UserContext;
  babbageContext: UserContext;
  curieContext: UserContext;
}

// Extend Playwright's base test with authenticated user contexts and network logging.
export const test = baseTest.extend<{}, Fixtures>({
  page: async ({ page }, use, testInfo) => {
    page.on('request', (req) => {
      console.log(`>> [${testInfo.title}] ${req.method()} ${req.url()}`);
    });
    page.on('response', (res) => {
      console.log(`<< [${testInfo.title}] ${res.status()} ${res.url()}`);
    });
    await use(page);
  },
  adaContext: [
    async ({ browser }, use, workerInfo) => {
      const ada = await createAuthenticatedContext({
        browser,
        name: `ada-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
      });

      await use(ada);
      await ada.context.close();
    },
    { scope: 'worker' },
  ],
  babbageContext: [
    async ({ browser }, use, workerInfo) => {
      const babbage = await createAuthenticatedContext({
        browser,
        name: `babbage-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
      });

      await use(babbage);
      await babbage.context.close();
    },
    { scope: 'worker' },
  ],
  curieContext: [
    async ({ browser }, use, workerInfo) => {
      const curie = await createAuthenticatedContext({
        browser,
        name: `curie-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
        chatModel: 'gpt-5o',
      });

      await use(curie);
      await curie.context.close();
    },
    { scope: 'worker' },
  ],
});

export const expect = baseExpect;
