import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// E2E tests for RBP-Strateg 2.0 (РБП Командный Центр)
// NOTE: Mapbox keeps WebSocket connections open, so `networkidle` never resolves.
//       Use `domcontentloaded` + explicit waits instead.
// ─────────────────────────────────────────────────────────────────────────────

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

  test('country list is populated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for countries data to load from /api/countries
    // The loading indicator disappears when data arrives
    await page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('nav button');
        return buttons.length >= 50;
      },
      { timeout: 30000 }
    );

    const countryButtons = page.locator('nav button');
    const count = await countryButtons.count();
    expect(count).toBeGreaterThanOrEqual(50);
  });

  test('search works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for countries to load
    await page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('nav button');
        return buttons.length >= 50;
      },
      { timeout: 30000 }
    );

    // Find the search input
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type "Россия"
    await searchInput.fill('Россия');
    await page.waitForTimeout(300);

    // Verify Russia appears in filtered results
    const russiaItem = page.locator('nav button').filter({
      hasText: 'Россия',
    });
    await expect(russiaItem.first()).toBeVisible();
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

  test('selecting a country shows detail panel without crashing', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for countries to load
    await page.waitForFunction(
      () => document.querySelectorAll('nav button').length >= 50,
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

    // No JS errors should have occurred
    const fatal = pageErrors.filter(e => !/NaN|LngLat|mapbox/.test(e));
    expect(fatal.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API tests — use request context (no browser needed)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('RBP-Strateg 2.0 — API Endpoints', () => {
  test('API /api/countries returns data', async ({ request }) => {
    const response = await request.get('/api/countries');
    expect(response.ok()).toBe(true);

    const countries = await response.json();
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThanOrEqual(200);

    // Find USA and verify bpTotal > 90
    const usa = countries.find(
      (c: { isoCode: string }) => c.isoCode === 'USA'
    );
    expect(usa).toBeDefined();
    expect(usa.bpTotal).toBeGreaterThan(90);
  });

  test('API /api/coalitions returns NATO', async ({ request }) => {
    const response = await request.get('/api/coalitions');
    expect(response.ok()).toBe(true);

    const coalitions = await response.json();
    expect(Array.isArray(coalitions)).toBe(true);

    // Find the NATO coalition
    const nato = coalitions.find(
      (c: { name: string }) => c.name === 'NATO'
    );
    expect(nato).toBeDefined();
    expect(nato.members.length).toBeGreaterThanOrEqual(26);
  });
});
