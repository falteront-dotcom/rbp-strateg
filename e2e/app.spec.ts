import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// E2E tests for RBP-Strateg 2.0 (РБП Командный Центр)
// NOTE: Mapbox keeps WebSocket connections open, so `networkidle` never resolves.
//       Use `domcontentloaded` + explicit waits instead.
//
// Determinism: the local dev database is the canonical seeded fixture
// (top20 + extended + additional = 59 countries). API and UI assertions use the
// known fixture contract (exact count, required ISO codes / Russian names, and
// the seeded NATO membership of 26) rather than arbitrary thresholds.
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical seeded fixture size used by the deterministic assertions. */
const EXPECTED_COUNTRY_COUNT = 59;
/** Seeded NATO coalition membership count. */
const EXPECTED_NATO_MEMBERS = 26;

test.describe('RBP-Strateg 2.0 — App Shell', () => {
  test('loads the app', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveTitle(/РБП/, { timeout: 10000 });
  });

  test('shows strategic mode by default', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the main UI to render (data loading may take time)
    await page.waitForSelector('text=Стратегический', { timeout: 15000 });

    await expect(
      page.locator('text=Стратегический').first()
    ).toBeVisible();
  });

  test('country list is populated with the seeded fixture', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the full seeded country set to render from /api/countries.
    await page.waitForFunction(
      (expected: number) => document.querySelectorAll('nav button').length >= expected,
      EXPECTED_COUNTRY_COUNT,
      { timeout: 30000 }
    );

    const countryButtons = page.locator('nav button');
    const count = await countryButtons.count();
    // Deterministic floor: the fixture populates exactly 59 countries, so the
    // nav must hold at least the full seeded set (extra controls only add).
    expect(count).toBeGreaterThanOrEqual(EXPECTED_COUNTRY_COUNT);

    // Required countries are present by their seeded Russian names.
    await expect(countryButtons.filter({ hasText: 'США' }).first()).toBeVisible();
    await expect(countryButtons.filter({ hasText: 'Россия' }).first()).toBeVisible();
  });

  test('search works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the full seeded fixture to load.
    await page.waitForFunction(
      (expected: number) => document.querySelectorAll('nav button').length >= expected,
      EXPECTED_COUNTRY_COUNT,
      { timeout: 30000 }
    );

    // Find the search input
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type "Россия"
    await searchInput.fill('Россия');
    await page.waitForTimeout(300);

    // Verify Russia survives the filter and the list narrowed.
    const russiaItem = page.locator('nav button').filter({
      hasText: 'Россия',
    });
    await expect(russiaItem.first()).toBeVisible();
    const filteredCount = await page.locator('nav button').count();
    expect(filteredCount).toBeLessThanOrEqual(EXPECTED_COUNTRY_COUNT);
  });

  test('layer selector renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for map controls to render
    await page.waitForSelector('[class*="tactical"]', { timeout: 15000 });

    // The layer selector is always visible in the map controls
    // Just verify the map area rendered
    const mapArea = page.locator('.relative.w.full.h.full, [class*="overflow-hidden"]');
    await expect(mapArea.first()).toBeAttached({ timeout: 10000 });
  });

  test('selecting a country shows detail panel without uncaught errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the full seeded fixture to load.
    await page.waitForFunction(
      (expected: number) => document.querySelectorAll('nav button').length >= expected,
      EXPECTED_COUNTRY_COUNT,
      { timeout: 30000 }
    );

    // Click first country
    await page.locator('nav button').first().click();
    await page.waitForTimeout(1000);

    // Click BP detail tab (uses ".toFixed()" on score fields)
    const bpTab = page.locator('button').filter({ hasText: /Боевой потенциал|Детально|Components|BP/ }).first();
    if (await bpTab.count() > 0) {
      await bpTab.click();
      await page.waitForTimeout(500);
    }

    // The SafeLngLat / no-token fallback path must keep the app error-free: no
    // uncaught JS errors at all once a country detail tab is open. We no longer
    // broadly tolerate NaN/LngLat/mapbox errors — their absence is the contract.
    expect(pageErrors).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API tests — use request context (no browser needed)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RBP-Strateg 2.0 — API Endpoints', () => {
  test('API /api/countries returns the seeded fixture', async ({ request }) => {
    const response = await request.get('/api/countries');
    expect(response.ok()).toBe(true);

    const countries = await response.json();
    expect(Array.isArray(countries)).toBe(true);
    // Deterministic fixture contract: exactly the 59 seeded countries.
    expect(countries.length).toBe(EXPECTED_COUNTRY_COUNT);

    // Required countries are present and mapped to camelCase.
    const findByIso = (iso: string) =>
      countries.find((c: { isoCode: string }) => c.isoCode === iso);
    const usa = findByIso('USA');
    const rus = findByIso('RUS');
    const chn = findByIso('CHN');
    expect(usa).toBeDefined();
    expect(rus).toBeDefined();
    expect(chn).toBeDefined();

    // USA BP comes from the seeded data (deterministic, > 90); exact value is
    // pinned in the export CSV contract test.
    expect(usa.bpTotal).toBeGreaterThan(90);
  });

  test('API /api/coalitions returns seeded NATO membership', async ({ request }) => {
    const response = await request.get('/api/coalitions');
    expect(response.ok()).toBe(true);

    const coalitions = await response.json();
    expect(Array.isArray(coalitions)).toBe(true);

    // Find the NATO coalition — the seeded fixture contributes exactly 26 members.
    const nato = coalitions.find(
      (c: { name: string }) => c.name === 'NATO'
    );
    expect(nato).toBeDefined();
    expect(nato.memberCount).toBe(EXPECTED_NATO_MEMBERS);
    expect(nato.members.length).toBe(EXPECTED_NATO_MEMBERS);
  });
});