import { test, expect } from '@playwright/test';
import { GFP_RANKINGS_2025 } from '../src/scripts/data-pipeline/scrape-gfp';

// ─────────────────────────────────────────────────────────────────────────────
// Покрытие валидации за пределами 10 качественных бенчмарков (шаг 3).
// Количественный референс — снапшот GFP_RANKINGS_2025 (~132 страны).
// Страна без референса обязана получать честный no-reference, а не
// фиктивный «пройдено» (находка эксперта-1 пузыря 2026-11-13).
// ─────────────────────────────────────────────────────────────────────────────

const QUALITATIVE_TEN = new Set([
  'USA', 'RUS', 'CHN', 'IND', 'GBR', 'FRA', 'JPN', 'KOR', 'TUR', 'UKR',
]);

test.describe('benchmark coverage beyond the qualitative ten', () => {
  test('list reports the full GFP reference coverage', async ({ request }) => {
    const response = await request.get('/api/benchmarks');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.count).toBe(10);
    expect(body.gfpReferenceCount).toBeGreaterThan(100);
  });

  test('country outside the ten gets a real GFP reference', async ({ request }) => {
    const beyond = GFP_RANKINGS_2025.find((g) => !QUALITATIVE_TEN.has(g.iso3));
    expect(beyond).toBeDefined();
    if (!beyond) return;
    const response = await request.get(
      `/api/benchmarks?iso=${beyond.iso3}&rank=${beyond.rank}`,
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.gfpCrossCheck.coverage).toBe('gfp-2025');
    expect(body.gfpCrossCheck.gfpRank).toBe(beyond.rank);
    expect(body.gfpCrossCheck.delta).toBe(0);
    expect(body.gfpCrossCheck.consistent).toBe(true);
  });

  test('country without a reference is honest, not a fake pass', async ({ request }) => {
    const gfpIsos = new Set(GFP_RANKINGS_2025.map((g) => g.iso3));
    const countriesResponse = await request.get('/api/countries');
    const countries = await countriesResponse.json();
    const missing = countries.find(
      (c: { isoCode: string }) => !gfpIsos.has(c.isoCode) && !QUALITATIVE_TEN.has(c.isoCode),
    );
    expect(missing).toBeDefined();
    if (!missing) return;
    const response = await request.get(`/api/benchmarks?iso=${missing.isoCode}&rank=100`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.gfpCrossCheck.coverage).toBe('no-reference');
    expect(body.gfpCrossCheck.consistent).toBeNull();
    expect(body.gfpCrossCheck.gfpRank).toBeNull();
  });
});
