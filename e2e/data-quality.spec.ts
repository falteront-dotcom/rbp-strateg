import { test, expect } from '@playwright/test';
import { computeMissingFields } from '../src/lib/data-quality';
import type { RawCountryRow } from '../src/db/country-mapper';

// ─────────────────────────────────────────────────────────────────────────────
// Data-quality missing-field detection — legitimate zero values are present.
//
// A country with 0 nuclear warheads / 0 aircraft carriers / 0 submarines has
// COMPLETE data, not gaps. `computeMissingFields` must report a numeric field
// as missing ONLY when it is genuinely absent (`null` / `undefined`); a real
// `0` is never missing. Required strings are missing only when empty; the
// optional `coalition` membership (`null` = non-aligned) is never missing.
// Pure functions, no server.
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal builder — fills every NOT-NULL numeric column with a real 0. */
function makeRow(overrides: Partial<RawCountryRow>): RawCountryRow {
  return {
    iso_code: 'ZRO',
    name: 'Zerland',
    name_ru: 'Зерландия',
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
    updated_at: '2025-01-01',
    ...overrides,
  };
}

test.describe('computeMissingFields — zero is a valid value', () => {
  test('a fully-zero country is reported as COMPLETE (no missing fields)', () => {
    const missing = computeMissingFields(makeRow({}));
    expect(missing).toEqual([]);
  });

  test('0 warheads, 0 carriers, 0 submarines are present — never missing', () => {
    const row = makeRow({
      submarines: 0,
      aircraft_carriers: 0,
      nuclear_warheads: 0,
      bp_total: 0,
    });
    const missing = computeMissingFields(row);
    expect(missing).not.toContain('nuclearWarheads');
    expect(missing).not.toContain('aircraftCarriers');
    expect(missing).not.toContain('submarines');
    expect(missing).not.toContain('bpTotal');
  });

  test('a genuinely absent (null) numeric field IS missing, not a valid zero', () => {
    const row = makeRow({
      nuclear_warheads: null as unknown as number,
      bp_total: null as unknown as number,
      bp_weapon: null as unknown as number,
    });
    const missing = computeMissingFields(row);
    expect(missing).toContain('nuclearWarheads');
    expect(missing).toContain('bpTotal');
    expect(missing).toContain('bpWeapon');
    // but a real adjacent zero is still complete:
    expect(missing).not.toContain('submarines');
  });

  test('null coalition (non-aligned) is NOT missing', () => {
    const missing = computeMissingFields(makeRow({ coalition: null }));
    expect(missing).not.toContain('coalition');
  });

  test('a non-empty coalition membership is not missing either', () => {
    const missing = computeMissingFields(makeRow({ coalition: 'NATO' }));
    expect(missing).not.toContain('coalition');
  });

  test('empty required strings ARE missing', () => {
    const row = makeRow({ name: '', name_ru: '   ', side: '', climate_zone: '' });
    const missing = computeMissingFields(row);
    expect(missing).toContain('name');
    expect(missing).toContain('nameRu');
    expect(missing).toContain('side');
    expect(missing).toContain('climateZone');
  });

  test('returns the public camelCase field names (preserves API contract)', () => {
    const row = makeRow({ nuclear_warheads: null as unknown as number });
    const missing = computeMissingFields(row);
    // The route maps these straight into the public report; they must be the
    // camelCase API field names, never the raw snake_case column names.
    expect(missing).toEqual(expect.arrayContaining(['nuclearWarheads']));
    expect(missing.every((f) => /[a-z][A-Z]/.test(f) || !f.includes('_'))).toBe(true);
  });
});