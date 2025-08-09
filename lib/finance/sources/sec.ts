import { load } from 'cheerio';
import { getCache, setCache } from '../cache';
import { rateLimit } from '../rate-limit';

/**
 * User agent string required by the SEC when scraping their APIs.
 * A generic email is provided to comply with their terms.
 */
const USER_AGENT = 'onchart/1.0 (support@example.com)';

/** Base URL for SEC data APIs */
const SEC_API = 'https://data.sec.gov';

/**
 * Helper to pad a CIK to 10 digits as required by SEC endpoints.
 */
function padCIK(cik: string | number): string {
  return String(cik).padStart(10, '0');
}

/**
 * Fetch JSON data from the SEC with a cache layer and mandatory User-Agent.
 * @param ttlMs Time to live for the cached entry in milliseconds.
 */
async function secJsonFetch<T>(
  url: string,
  ttlMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const cached = getCache<T>(url);
  if (cached) return cached;
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`SEC request failed ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as T;
  setCache(url, data, ttlMs);
  return data;
}

export interface CompanyMatch {
  cik: string;
  name: string;
  ticker: string;
}

/**
 * Search a company by name or ticker and return matching CIK identifiers.
 */
export async function searchCompanyCIK(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CompanyMatch[]> {
  await rateLimit('sec');
  const url = 'https://www.sec.gov/files/company_tickers.json';
  type Entry = { cik_str: number; ticker: string; title: string };
  const data = await secJsonFetch<Record<string, Entry>>(
    url,
    24 * 60 * 60 * 1000,
    fetchImpl,
  );
  const q = query.toLowerCase();
  return Object.values(data)
    .filter(
      (e) =>
        e.ticker.toLowerCase() === q ||
        e.title.toLowerCase().includes(q) ||
        e.cik_str.toString() === query,
    )
    .map((e) => ({ cik: padCIK(e.cik_str), name: e.title, ticker: e.ticker }));
}

export interface FilingItem {
  accession: string;
  form: string;
  filedAt: string;
  primaryDocument: string;
  url: string;
}

/**
 * List filings for a given CIK filtered by form types.
 */
export async function listFilings(
  cik: string,
  formTypes: string[] = ['10-K', '10-Q', '8-K'],
  fetchImpl: typeof fetch = fetch,
): Promise<FilingItem[]> {
  await rateLimit('sec');
  const padded = padCIK(cik);
  const url = `${SEC_API}/submissions/CIK${padded}.json`;
  const data = await secJsonFetch<any>(url, 60_000, fetchImpl);
  const recent = data.filings?.recent;
  const filings: FilingItem[] = [];
  if (recent) {
    for (let i = 0; i < recent.accessionNumber.length; i++) {
      const form = recent.form[i];
      if (!formTypes.includes(form)) continue;
      const accession = recent.accessionNumber[i];
      const filedAt = recent.filingDate[i];
      const primary = recent.primaryDocument[i];
      const accNo = accession.replace(/-/g, '');
      const urlDoc = `https://www.sec.gov/Archives/edgar/data/${parseInt(padded, 10)}/${accNo}/${primary}`;
      filings.push({
        accession,
        form,
        filedAt,
        primaryDocument: primary,
        url: urlDoc,
      });
    }
  }
  return filings;
}

/**
 * Download a filing document (HTML) and extract its plain text content.
 */
export async function fetchFilingDocument(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  await rateLimit('sec');
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch filing ${res.status}`);
  const html = await res.text();
  const $ = load(html);
  return $('body').text().replace(/\s+/g, ' ').trim();
}

export interface CompanyFacts {
  revenue?: number;
  eps?: number;
  assets?: number;
  liabilities?: number;
}

/**
 * Fetch high-level fundamental metrics from the SEC companyfacts API.
 */
export async function fetchCompanyFacts(
  cik: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CompanyFacts> {
  await rateLimit('sec');
  const padded = padCIK(cik);
  const url = `${SEC_API}/api/xbrl/companyfacts/CIK${padded}.json`;
  const data = await secJsonFetch<any>(url, 60_000, fetchImpl);
  const facts = data.facts || {};
  const latest = (fact: any, unit: string) => {
    const arr = fact?.units?.[unit];
    if (!arr || arr.length === 0) return undefined;
    // Choose the most recent entry by end or instant date.
    arr.sort(
      (a: any, b: any) =>
        new Date(b.end || b.instant).getTime() -
        new Date(a.end || a.instant).getTime(),
    );
    return arr[0]?.val;
  };
  return {
    revenue: latest(
      facts['Revenues'] ||
        facts['RevenueFromContractWithCustomerExcludingAssessedTax'],
      'USD',
    ),
    eps: latest(
      facts['EarningsPerShareDiluted'] || facts['EarningsPerShareBasic'],
      'USD',
    ),
    assets: latest(facts['Assets'], 'USD'),
    liabilities: latest(facts['Liabilities'], 'USD'),
  };
}

export { padCIK };
