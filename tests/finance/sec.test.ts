import { test, expect } from '@playwright/test';
import {
  searchCompanyCIK,
  listFilings,
  fetchFilingDocument,
  fetchCompanyFacts,
} from '../../lib/finance/sources/sec';

// Sample dataset for company_tickers.json
const tickersJson = {
  '0': { cik_str: 32, ticker: 'AAPL', title: 'Apple Inc.' },
  '1': { cik_str: 789019, ticker: 'MSFT', title: 'Microsoft Corporation' },
};

// Sample dataset for submissions JSON
const submissionsJson = {
  filings: {
    recent: {
      accessionNumber: ['000032-000001', '000032-000002'],
      form: ['10-K', '8-K'],
      filingDate: ['2024-01-01', '2024-02-01'],
      primaryDocument: ['a10k.htm', 'a8k.htm'],
    },
  },
};

// Sample companyfacts JSON
const companyFactsJson = {
  facts: {
    Revenues: {
      units: {
        USD: [
          { end: '2023-12-31', val: 1000 },
          { end: '2022-12-31', val: 900 },
        ],
      },
    },
    EarningsPerShareDiluted: {
      units: {
        USD: [{ end: '2023-12-31', val: 5 }],
      },
    },
    Assets: {
      units: { USD: [{ end: '2023-12-31', val: 2000 }] },
    },
    Liabilities: {
      units: { USD: [{ end: '2023-12-31', val: 1500 }] },
    },
  },
};

const fakeFetch = async (url: any) => {
  const href = url.toString();
  if (href.includes('company_tickers'))
    return new Response(JSON.stringify(tickersJson), { status: 200 });
  if (href.includes('submissions'))
    return new Response(JSON.stringify(submissionsJson), { status: 200 });
  if (href.includes('companyfacts'))
    return new Response(JSON.stringify(companyFactsJson), { status: 200 });
  if (href.endsWith('a10k.htm'))
    return new Response('<html><body><p>Report</p></body></html>', {
      status: 200,
    });
  return new Response('not found', { status: 404 });
};

test('searchCompanyCIK finds ticker', async () => {
  const matches = await searchCompanyCIK('AAPL', fakeFetch as any);
  expect(matches[0]).toEqual({
    cik: '0000000032',
    name: 'Apple Inc.',
    ticker: 'AAPL',
  });
});

test('listFilings returns filtered forms', async () => {
  const filings = await listFilings('32', ['10-K'], fakeFetch as any);
  expect(filings).toHaveLength(1);
  expect(filings[0].form).toBe('10-K');
});

test('fetchFilingDocument extracts text', async () => {
  const text = await fetchFilingDocument(
    'https://example.com/a10k.htm',
    fakeFetch as any,
  );
  expect(text).toBe('Report');
});

test('fetchCompanyFacts parses metrics', async () => {
  const facts = await fetchCompanyFacts('32', fakeFetch as any);
  expect(facts).toEqual({
    revenue: 1000,
    eps: 5,
    assets: 2000,
    liabilities: 1500,
  });
});
