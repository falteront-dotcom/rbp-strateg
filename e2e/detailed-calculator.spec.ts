import { test, expect } from '@playwright/test';
import { calculateDetailedBP } from '../src/lib/bp/detailed-calculator';
import { DEFAULT_WEIGHTS, type WeightsConfig } from '../src/lib/bp/weights';
import type { CountryRawData } from '../src/lib/bp/types';

// ─────────────────────────────────────────────────────────────────────────────
// Detailed BP calculator — weight-key mapping invariant.
//
// `ALL_COMPONENT_SUB_FACTORS` keys carry a `Score` suffix (e.g. "weaponScore")
// while `WeightsConfig` keys are bare component names ("weapon"). The calculator
// must strip that suffix so each component's `weightedScore` uses its real
// calibrated weight instead of silently falling back to a flat 0.1. This module
// has no UI consumer today, but the plan requires a weighted-score test so a
// future caller cannot regress the mapping. Pure functions, no server.
// ─────────────────────────────────────────────────────────────────────────────

/** Build a complete CountryRawData row from a small set of overrides. */
function makeCountry(overrides: Partial<CountryRawData>): CountryRawData {
  return {
    isoCode: 'TST',
    name: 'Test',
    nameRu: 'Тест',
    side: 'NEUTRAL',
    coalition: null,
    areaKm2: 1_000_000,
    coastlineKm: 1_000,
    climateZone: 'Temperate',
    gdpPppBn: 1_000,
    militaryBudgetBn: 50,
    defensePctGdp: 2,
    populationM: 50,
    activePersonnel: 100_000,
    reservePersonnel: 50_000,
    fitForServiceM: 25,
    totalTanks: 1000,
    totalAfv: 1000,
    totalArtillery: 500,
    totalMlrs: 200,
    totalAircraft: 500,
    totalHelicopters: 200,
    totalNavy: 100,
    submarines: 20,
    aircraftCarriers: 5,
    nuclearWarheads: 100,
    ports: 20,
    airfields: 100,
    oilProductionKbd: 1000,
    merchantFleet: 200,
    techLevel: 8,
    moraleIndex: 7,
    combatExperience: 6,
    c2Capability: 8,
    ewCapability: 7,
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

test.describe('detailed calculator weight-key mapping', () => {
  test('every component uses its real calibrated weight (not a flat 0.1 fallback)', () => {
    const alpha = makeCountry({
      isoCode: 'AAA',
      name: 'Alpha',
      nameRu: 'Альфа',
      side: 'NATO',
      coalition: 'NATO',
    });
    const beta = makeCountry({
      isoCode: 'BBB',
      name: 'Beta',
      nameRu: 'Бета',
      side: 'RUS',
      coalition: 'CSTO',
      totalTanks: 5,
      totalAfv: 5,
      totalArtillery: 2,
      totalMlrs: 1,
      totalAircraft: 3,
      totalHelicopters: 1,
      totalNavy: 1,
      submarines: 0,
      aircraftCarriers: 0,
      nuclearWarheads: 0,
      techLevel: 4,
      gdpPppBn: 10,
      militaryBudgetBn: 1,
    });

    const cohort: CountryRawData[] = [alpha, beta];
    const result = calculateDetailedBP(alpha, cohort, DEFAULT_WEIGHTS);

    // All 8 components are present.
    expect(result.componentScores).toHaveLength(8);

    for (const cs of result.componentScores) {
      // componentKey retains the `Score` suffix from the sub-factor registry;
      // strip it to find the canonical WeightsConfig key.
      const canonicalKey = cs.componentKey.replace(/Score$/, '') as keyof WeightsConfig;
      const expectedWeight = DEFAULT_WEIGHTS[canonicalKey];

      // The weighted score must equal normalized * the REAL weight. If the
      // old bug were present every component would use a flat 0.1 regardless
      // of its canonical weight, so weapon (0.20) and economy (0.15) would
      // NOT equal normalized * expectedWeight and this assertion would fail.
      expect(cs.weightedScore).toBeCloseTo(cs.normalizedValue * expectedWeight, 5);
    }

    // The test must "bite": the canonical weights are NOT a flat 0.1 across
    // every component, so a regression to the old uniform-0.1 fallback would
    // be detectable. (0.10 IS a legitimate weight for c2/readiness/terrain,
    // so we only reject the *uniform* 0.1 case, not any single 0.10 value.)
    const allWeights = Object.values(DEFAULT_WEIGHTS);
    expect(allWeights.some((w) => w !== 0.1)).toBe(true);
    expect(new Set(allWeights).size).toBeGreaterThan(1);

    // Hard spot-check the headline fix: weapon must use 0.20 specifically.
    const weapon = result.componentScores.find((c) => c.componentKey === 'weaponScore');
    expect(weapon).toBeDefined();
    expect(weapon!.normalizedValue).toBeGreaterThan(0);
    expect(weapon!.weightedScore).toBeCloseTo(weapon!.normalizedValue * DEFAULT_WEIGHTS.weapon, 5);
    expect(DEFAULT_WEIGHTS.weapon).toBe(0.20);
  });
});