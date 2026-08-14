import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Core API contracts for the repaired/mapped routes.
// These exercise the live server (Playwright `request` fixture, baseURL from
// playwright.config). They verify the snake_case SQLite columns are read
// correctly and surfaced as camelCase, and that `region` is derived, not a
// stored column. Run against `npm run dev` on http://localhost:3000.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('core API contracts', () => {
  test('countries returns mapped USA data with non-zero BP', async ({ request }) => {
    const response = await request.get('/api/countries');
    expect(response.ok()).toBe(true);
    const countries = await response.json();
    const usa = countries.find((country: { isoCode: string }) => country.isoCode === 'USA');

    expect(usa).toBeDefined();
    // region is derived from coalition/side, not read from a SQL column
    expect(usa.region).toBe('NATO');
    // bp_total is read via snake_case and surfaced as bpTotal
    expect(usa.bpTotal).toBeGreaterThan(0);
    // legitimate numeric fields are present and mapped
    expect(usa.nuclearWarheads).toBeGreaterThan(0);
    expect(typeof usa.bpWeapon).toBe('number');
  });

  test('compare resolves requested countries using mapped rows', async ({ request }) => {
    const response = await request.get('/api/compare?iso=USA&iso=RUS');
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.countries.map((country: { isoCode: string }) => country.isoCode)).toEqual(['USA', 'RUS']);
    expect(body.countries[0].bpTotal).toBeGreaterThan(0);
  });

  test('coalitions returns aggregated NATO data', async ({ request }) => {
    const response = await request.get('/api/coalitions');
    expect(response.ok()).toBe(true);
    const coalitions = await response.json();
    const nato = coalitions.find((coalition: { name: string }) => coalition.name === 'NATO');

    expect(nato).toBeDefined();
    expect(nato.memberCount).toBeGreaterThan(0);
    expect(nato.totalBP).toBeGreaterThan(0);
  });

  test('analytics ranking returns mapped USA data', async ({ request }) => {
    const response = await request.get('/api/analytics?type=ranking');
    expect(response.ok()).toBe(true);
    const body = await response.json();
    const usa = body.data.find((country: { isoCode: string }) => country.isoCode === 'USA');

    expect(body.type).toBe('ranking');
    expect(usa).toBeDefined();
    expect(usa.bpTotal).toBeGreaterThan(0);
  });

  test('data quality resolves USA and treats zero values as present', async ({ request }) => {
    const response = await request.get('/api/data-quality?iso=USA');
    expect(response.ok()).toBe(true);
    const report = await response.json();

    expect(report.isoCode).toBe('USA');
    // USA has 5244 warheads; the field must never be reported missing
    expect(report.missingFields).not.toContain('nuclearWarheads');
  });

  test('data quality returns 404 for an unknown iso', async ({ request }) => {
    const response = await request.get('/api/data-quality?iso=ZZZ');
    expect(response.status()).toBe(404);
  });

  test('export JSON contains mapped USA values', async ({ request }) => {
    const response = await request.get('/api/export?iso=USA&format=json');
    expect(response.ok()).toBe(true);
    const rows = await response.json();

    expect(rows).toHaveLength(1);
    expect(rows[0].isoCode).toBe('USA');
    expect(rows[0].bpTotal).toBeGreaterThan(0);
    // region is derived, not a stored column
    expect(rows[0].region).toBe('NATO');
  });

  test('export CSV contains mapped headers and real values', async ({ request }) => {
    const response = await request.get('/api/export?iso=USA&format=csv');
    expect(response.ok()).toBe(true);
    const csv = await response.text();

    expect(csv).toContain('isoCode');
    expect(csv).toContain('USA');
    // USA bp_total exact value, proving bp_total is read via the snake_case column
    expect(csv).toContain('97.57330447450244');
  });

  test('what-if resolves USA from snake_case database rows', async ({ request }) => {
    const response = await request.post('/api/what-if', { data: { iso: 'USA' } });
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.base.isoCode).toBe('USA');
    expect(body.base.totalBP).toBeGreaterThan(0);
    expect(typeof body.scenario.totalBP).toBe('number');
  });

  test('what-if returns 404 for an unknown iso', async ({ request }) => {
    const response = await request.post('/api/what-if', { data: { iso: 'ZZZ' } });
    expect(response.status()).toBe(404);
  });
});
