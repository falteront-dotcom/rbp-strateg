import { test, expect } from '@playwright/test';
import { deriveRegion, mapCountryRow, mapCountryRows, type RawCountryRow } from '../src/db/country-mapper';

// ─────────────────────────────────────────────────────────────────────────────
// Shared snake_case → camelCase country mapper contract (pure functions, no server)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('shared country mapper', () => {
  test('maps snake_case rows and preserves legitimate zero values', () => {
    const row: RawCountryRow = {
      iso_code: 'TST',
      name: 'Testland',
      name_ru: 'Тестландия',
      side: 'NEUTRAL',
      coalition: null,
      area_km2: 100,
      coastline_km: 0,
      climate_zone: 'Temperate',
      gdp_ppp_bn: 0,
      military_budget_bn: 12.5,
      defense_pct_gdp: 0,
      population_m: 1,
      active_personnel: 0,
      reserve_personnel: 2,
      fit_for_service_m: 0,
      total_tanks: 0,
      total_afv: 3,
      total_artillery: 0,
      total_mlrs: 0,
      total_aircraft: 4,
      total_helicopters: 0,
      total_navy: 0,
      submarines: 0,
      aircraft_carriers: 0,
      nuclear_warheads: 0,
      ports: 0,
      airfields: 1,
      oil_production_kbd: 0,
      merchant_fleet: 0,
      tech_level: 5,
      morale_index: 0,
      combat_experience: 4,
      c2_capability: 0,
      ew_capability: 3,
      bp_total: 0,
      bp_weapon: 0,
      bp_manpower: 1.5,
      bp_logistics: 0,
      bp_c2: 2,
      bp_economy: 0,
      bp_doctrine: 3,
      bp_readiness: 0,
      bp_terrain: 4,
      updated_at: '2025-01-01',
    };

    const mapped = mapCountryRow(row);

    expect(mapped).toMatchObject({
      isoCode: 'TST',
      name: 'Testland',
      nameRu: 'Тестландия',
      side: 'NEUTRAL',
      coalition: null,
      region: 'Non-Aligned',
      climateZone: 'Temperate',
      areaKm2: 100,
      coastlineKm: 0,
      gdpPppBn: 0,
      militaryBudgetBn: 12.5,
      defensePctGdp: 0,
      populationM: 1,
      activePersonnel: 0,
      reservePersonnel: 2,
      fitForServiceM: 0,
      totalTanks: 0,
      totalAfv: 3,
      totalArtillery: 0,
      totalMlrs: 0,
      totalAircraft: 4,
      totalHelicopters: 0,
      totalNavy: 0,
      submarines: 0,
      aircraftCarriers: 0,
      // Legitimate zero values must survive the mapping (nullish ?? 0, not || 0)
      nuclearWarheads: 0,
      ports: 0,
      airfields: 1,
      oilProductionKbd: 0,
      merchantFleet: 0,
      techLevel: 5,
      moraleIndex: 0,
      combatExperience: 4,
      c2Capability: 0,
      ewCapability: 3,
      bpTotal: 0,
      bpWeapon: 0,
      bpManpower: 1.5,
      bpLogistics: 0,
      bpC2: 2,
      bpEconomy: 0,
      bpDoctrine: 3,
      bpReadiness: 0,
      bpTerrain: 4,
      updatedAt: '2025-01-01',
    });
  });

  test('maps null bp columns and null nuclear_warheads to zero', () => {
    const row = {
      iso_code: 'NIL',
      name: 'Nulland',
      name_ru: 'Налляндия',
      side: 'NEUTRAL',
      coalition: null,
      area_km2: 1,
      coastline_km: 0,
      climate_zone: 'Arctic',
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
      nuclear_warheads: null,
      ports: 0,
      airfields: 0,
      oil_production_kbd: 0,
      merchant_fleet: 0,
      tech_level: 0,
      morale_index: 0,
      combat_experience: 0,
      c2_capability: 0,
      ew_capability: 0,
      bp_total: null,
      bp_weapon: null,
      bp_manpower: null,
      bp_logistics: null,
      bp_c2: null,
      bp_economy: null,
      bp_doctrine: null,
      bp_readiness: null,
      bp_terrain: null,
      updated_at: '2025-01-01',
    } as RawCountryRow;

    const mapped = mapCountryRow(row);

    expect(mapped.nuclearWarheads).toBe(0);
    expect(mapped.bpTotal).toBe(0);
    expect(mapped.bpWeapon).toBe(0);
    expect(mapped.bpTerrain).toBe(0);
  });

  test('derives coalition regions before side regions', () => {
    expect(deriveRegion('NATO', 'BRICS')).toBe('BRICS');
    expect(deriveRegion('NATO', 'CSTO')).toBe('CSTO');
    expect(deriveRegion('AUS', 'AUKUS')).toBe('AUKUS');
    expect(deriveRegion('NATO', null)).toBe('Western');
    expect(deriveRegion('RUS', null)).toBe('Eurasian');
    expect(deriveRegion('CHINA', null)).toBe('Asia-Pacific');
    expect(deriveRegion('UKR', null)).toBe('Ukraine');
    expect(deriveRegion('NEUTRAL', null)).toBe('Non-Aligned');
  });

  test('mapCountryRows maps every row in order', () => {
    const base = {
      name_ru: 'Тест', area_km2: 1, coastline_km: 0, climate_zone: 'c', gdp_ppp_bn: 1,
      military_budget_bn: 1, defense_pct_gdp: 1, population_m: 1, active_personnel: 1,
      reserve_personnel: 1, fit_for_service_m: 1, total_tanks: 1, total_afv: 1,
      total_artillery: 1, total_mlrs: 1, total_aircraft: 1, total_helicopters: 1,
      total_navy: 1, submarines: 1, aircraft_carriers: 1, nuclear_warheads: 0,
      ports: 1, airfields: 1, oil_production_kbd: 1, merchant_fleet: 1, tech_level: 1,
      morale_index: 1, combat_experience: 1, c2_capability: 1, ew_capability: 1,
      bp_weapon: 1, bp_manpower: 1, bp_logistics: 1, bp_c2: 1, bp_economy: 1,
      bp_doctrine: 1, bp_readiness: 1, bp_terrain: 1, updated_at: '2025-01-01',
    } as Omit<RawCountryRow, 'iso_code' | 'name' | 'side' | 'coalition' | 'bp_total'>;

    const rows: RawCountryRow[] = [
      { ...base, iso_code: 'AAA', name: 'A', name_ru: 'А', side: 'NATO', coalition: 'NATO', bp_total: 50 },
      { ...base, iso_code: 'BBB', name: 'B', name_ru: 'Б', side: 'RUS', coalition: 'CSTO', bp_total: 40, nuclear_warheads: 1 },
    ];

    const mapped = mapCountryRows(rows);

    expect(mapped).toHaveLength(2);
    expect(mapped[0].isoCode).toBe('AAA');
    expect(mapped[0].region).toBe('NATO');
    expect(mapped[1].isoCode).toBe('BBB');
    expect(mapped[1].region).toBe('CSTO');
  });
});
