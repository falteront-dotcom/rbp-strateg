import { test, expect } from '@playwright/test';
import { validateCountryDataset } from '@/lib/dataset/validation';
import type { RawCountryRow } from '@/db/country-mapper';

function makeRow(overrides: Partial<RawCountryRow> = {}): RawCountryRow {
  return {
    iso_code: 'TST',
    name: 'Testland',
    name_ru: 'Тестландия',
    side: 'NEUTRAL',
    coalition: null,
    area_km2: 0,
    coastline_km: 0,
    climate_zone: 'Temperate',
    gdp_ppp_bn: 0,
    military_budget_bn: 0,
    defense_pct_gdp: 0,
    population_m: 0,
    active_personnel: 0,
    reserve_personnel: 0,
    fit_for_service_m: 0,
    total_tanks: 0,
    total_afv: 0,
    total_artillery: 0,
    total_mlrs: 0,
    total_aircraft: 0,
    total_helicopters: 0,
    total_navy: 0,
    submarines: 0,
    aircraft_carriers: 0,
    nuclear_warheads: 0,
    ports: 0,
    airfields: 0,
    oil_production_kbd: 0,
    merchant_fleet: 0,
    tech_level: 0,
    morale_index: 0,
    combat_experience: 0,
    c2_capability: 0,
    ew_capability: 0,
    bp_total: 0,
    bp_weapon: 0,
    bp_manpower: 0,
    bp_logistics: 0,
    bp_c2: 0,
    bp_economy: 0,
    bp_doctrine: 0,
    bp_readiness: 0,
    bp_terrain: 0,
    updated_at: '2026-08-19',
    ...overrides,
  };
}

test.describe('dataset validation', () => {
  test('accepts legitimate numeric zero values', () => {
    const summary = validateCountryDataset([makeRow()], { minimumRows: 1 });
    expect(summary.ok).toBe(true);
    expect(summary.errors).toEqual([]);
  });

  test('rejects duplicate ISO codes, non-finite values, and out-of-range BP', () => {
    const summary = validateCountryDataset([
      makeRow(),
      makeRow({ military_budget_bn: Number.POSITIVE_INFINITY, bp_weapon: 101 }),
    ], { minimumRows: 1 });

    expect(summary.ok).toBe(false);
    expect(summary.errors.some((error) => error.code === 'DUPLICATE_ISO')).toBe(true);
    expect(summary.errors.some((error) => error.code === 'NON_FINITE_NUMBER')).toBe(true);
    expect(summary.errors.some((error) => error.code === 'BP_OUT_OF_RANGE')).toBe(true);
  });
});

test.describe('dataset lifecycle API', () => {
  test('health reports the active local published dataset', async ({ request }) => {
    const response = await request.get('/api/dataset/health');
    expect(response.ok()).toBe(true);
    const health = await response.json();

    expect(['OPERATIONAL', 'DEGRADED', 'STALE']).toContain(health.status);
    expect(health.datasetVersion).toBeTruthy();
    expect(health.countryCount).toBe(59);
    expect(typeof health.warningCount).toBe('number');
  });

  test('versions expose parsed status and validation counters', async ({ request }) => {
    const response = await request.get('/api/dataset/versions');
    expect(response.ok()).toBe(true);
    const body = await response.json();

    expect(body.versions.length).toBeGreaterThan(0);
    expect(body.versions[0].status).toBe('published');
    expect(typeof body.versions[0].warningCount).toBe('number');
    expect(typeof body.versions[0].validationSummary).toBe('object');
  });
});
