/**
 * World Bank Open Data API fetcher
 * Gets GDP, population, military expenditure for all countries
 *
 * Indicators:
 *   NY.GDP.MKTP.PP.CD  — GDP PPP (current intl$)
 *   SP.POP.TOTL        — Population total
 *   MS.MIL.XPND.GD.ZS  — Military expenditure (% of GDP)
 *   MS.MIL.XPND.CD     — Military expenditure (current USD)
 *   AG.LND.TOTL.K2     — Land area (km²)
 *   SE.ADT.LITR.ZS     — Literacy rate
 *
 * Reliability:
 *   - Bounded 15s per-request timeout via `AbortSignal.timeout` (Node 22+).
 *   - At most 2 retries for transient failures (timeouts / network / 5xx)
 *     with a bounded linear back-off; 4xx client errors are not retried.
 *   - Malformed responses (unexpected JSON shape) are not retried: the
 *     indicator is treated as empty for that page and we stop paginating it.
 *   - Pagination is explicit: the WB metadata reports `pages`; we follow
 *     `page` 1..`pages` (capped defensively) instead of assuming one page.
 *   - Each indicator is independent: a failing indicator degrades gracefully
 *     to the merging fallback (GFP / seed), preserving the existing path.
 */

const WB_BASE = "https://api.worldbank.org/v2/country";
const PER_PAGE = 300;
const FORMAT = "json";
const YEAR = "2023"; // latest reliable year

/** Bounded per-request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Initial request + at most this many retries for transient failures. */
const MAX_RETRIES = 2;
/** Linear back-off base in milliseconds (attempt * base). */
const RETRY_BASE_DELAY_MS = 500;
/** Defensive cap on the number of pages we will follow per indicator. */
const MAX_PAGES = 20;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface WBPageMeta {
  page: number;
  pages: number;
  per_page: number;
  count: number;
  total: number;
}

interface WBRecord {
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  indicator: { id: string; value: string };
}

interface WBCountryData {
  iso3: string;
  name: string;
  gdpPppBn: number | null;
  populationM: number | null;
  militaryBudgetBn: number | null;
  defensePctGdp: number | null;
  areaKm2: number | null;
}

const INDICATORS: Record<string, keyof WBCountryData> = {
  "NY.GDP.MKTP.PP.CD": "gdpPppBn",
  "SP.POP.TOTL": "populationM",
  "MS.MIL.XPND.CD": "militaryBudgetBn",
  "MS.MIL.XPND.GD.ZS": "defensePctGdp",
  "AG.LND.TOTL.K2": "areaKm2",
};

/** Transient errors are retried; client (4xx) and malformed responses are not. */
function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Fetch a single URL with a bounded timeout and bounded retries.
 * Returns the `Response` on the first success or non-retryable status.
 * Throws only after retries are exhausted for transient failures.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (isTransientStatus(res.status) && attempt < MAX_RETRIES) {
        console.warn(`  WB transient ${res.status} (attempt ${attempt + 1}), retrying...`);
        await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      // Network/timeout errors are transient; malformed responses surface here
      // as AbortError/TypeError and are also retried, but only up to the bound.
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`  WB fetch error (attempt ${attempt + 1}): ${err instanceof Error ? err.message : err}`);
        await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("World Bank fetch retries exhausted");
}

/** Fetch all pages for one indicator, following the reported page count. */
async function fetchIndicator(indicator: string): Promise<WBRecord[]> {
  const records: WBRecord[] = [];
  let pages = 1;
  for (let page = 1; page <= pages && page <= MAX_PAGES; page++) {
    const url =
      `${WB_BASE}/all/indicator/${indicator}` +
      `?format=${FORMAT}&per_page=${PER_PAGE}&date=${YEAR}&page=${page}`;
    console.log(`  Fetching ${indicator} page ${page}/${pages}...`);

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      // Non-retryable client error or retries exhausted for a server error:
      // stop fetching this indicator; the merge fallback covers the gap.
      console.warn(`  WB ${indicator} page ${page} unavailable: HTTP ${res.status}`);
      break;
    }

    const data = await res.json() as unknown;
    // WB success response is `[metadata, records]`. Anything else is malformed;
    // do not retry infinitely on a bad shape — stop this indicator.
    if (!Array.isArray(data) || data.length < 1) {
      console.warn(`  WB ${indicator} page ${page}: malformed response (non-array)`);
      break;
    }
    const meta = data[0] as WBPageMeta | null;
    if (meta && typeof meta.pages === "number" && meta.pages > 0) {
      pages = meta.pages;
    }
    const pageRecords = data[1];
    if (Array.isArray(pageRecords)) records.push(...pageRecords);
    if (!Array.isArray(pageRecords)) break;
  }
  return records;
}

function convertValue(key: keyof WBCountryData, raw: number | null): number | null {
  if (raw === null || raw === undefined) return null;
  switch (key) {
    case "gdpPppBn": return Math.round(raw / 1e9 * 100) / 100;       // current intl$ → billions
    case "populationM": return Math.round(raw / 1e6 * 100) / 100;     // → millions
    case "militaryBudgetBn": return Math.round(raw / 1e9 * 100) / 100; // current USD → billions
    case "defensePctGdp": return Math.round(raw * 100) / 100;          // already %
    case "areaKm2": return Math.round(raw);                            // km²
    default: return raw;
  }
}

export async function fetchWorldBankData(): Promise<Map<string, WBCountryData>> {
  console.log("🌍 Fetching World Bank data...");
  const countryMap = new Map<string, WBCountryData>();

  for (const [indicator, field] of Object.entries(INDICATORS)) {
    let records: WBRecord[] = [];
    try {
      records = await fetchIndicator(indicator);
    } catch (err) {
      // This indicator is unavailable after retries; fall back gracefully.
      console.warn(
        `  ⚠ World Bank indicator ${indicator} unavailable: ${err instanceof Error ? err.message : err}`,
      );
      continue;
    }
    console.log(`  Got ${records.length} records for ${indicator}`);

    for (const rec of records) {
      const iso = rec.countryiso3code;
      if (!iso || iso === "") continue;

      if (!countryMap.has(iso)) {
        countryMap.set(iso, {
          iso3: iso,
          name: rec.country.value,
          gdpPppBn: null,
          populationM: null,
          militaryBudgetBn: null,
          defensePctGdp: null,
          areaKm2: null,
        });
      }

      const entry = countryMap.get(iso)!;
      const converted = convertValue(field, rec.value);
      if (converted !== null) {
        (entry as unknown as Record<string, unknown>)[field] = converted;
      }
    }
  }

  console.log(`  ✓ World Bank: ${countryMap.size} countries`);
  return countryMap;
}
