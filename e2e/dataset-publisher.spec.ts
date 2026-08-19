import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import type { CountryBP } from '@/lib/bp/types';
import type { MergedCountry } from '@/scripts/data-pipeline/merge-validate';
import { getPublishedDataset } from '@/db/dataset-repository';
import { isDatasetRefreshDue, publishPipelineCandidate, runRefreshSingleFlight } from '@/lib/dataset/updater';

function country(isoCode: string): MergedCountry {
  return {
    isoCode, name: isoCode, nameRu: isoCode, side: 'NEUTRAL', coalition: null,
    areaKm2: 1, coastlineKm: 0, climateZone: 'Temperate', gdpPppBn: 1,
    militaryBudgetBn: 1, defensePctGdp: 1, populationM: 1, activePersonnel: 1,
    reservePersonnel: 0, fitForServiceM: 1, totalTanks: 0, totalAfv: 0,
    totalArtillery: 0, totalMlrs: 0, totalAircraft: 0, totalHelicopters: 0,
    totalNavy: 0, submarines: 0, aircraftCarriers: 0, nuclearWarheads: 0,
    ports: 0, airfields: 0, oilProductionKbd: 0, merchantFleet: 0, techLevel: 5,
    moraleIndex: 5, combatExperience: 3, c2Capability: 5, ewCapability: 5,
    bpTotal: 0, bpWeapon: 0, bpManpower: 0, bpLogistics: 0, bpC2: 0,
    bpEconomy: 0, bpDoctrine: 0, bpReadiness: 0, bpTerrain: 0,
    updatedAt: '2026-08-19',
  };
}

function bp(isoCode: string): CountryBP {
  const component = {
    component: 'weapon' as const,
    rawValue: 1,
    normalizedValue: 50,
    weight: 0.1,
    weightedScore: 5,
    breakdown: {},
  };
  return {
    isoCode, name: isoCode, rank: 1, totalBP: 50,
    components: {
      weapon: component, manpower: component, logistics: component, c2: component,
      economy: component, doctrine: component, readiness: component, terrain: component,
    },
  };
}

test.describe('refresh coordinator', () => {
  test('marks missing/stale checks due and deduplicates concurrent refreshes', async () => {
    expect(isDatasetRefreshDue(null, 1_000)).toBe(true);
    expect(isDatasetRefreshDue(new Date().toISOString(), Date.now())).toBe(false);

    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const operation = async (): Promise<string> => {
      calls += 1;
      await gate;
      return 'ok';
    };
    const first = runRefreshSingleFlight(operation);
    const second = runRefreshSingleFlight(operation);
    expect(calls).toBe(1);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual(['ok', 'ok']);
  });
});

test.describe('atomic dataset publisher', () => {
  test('publishes a candidate and updates the active dataset pointer', () => {
    const db = new Database(':memory:');
    try {
      const result = publishPipelineCandidate(db, {
        countries: [country('AAA')],
        bpByIso: new Map([['AAA', bp('AAA')]]),
        sourceSummary: { source: 'test' },
      }, 'test-v1');

      expect(result.countriesWritten).toBe(1);
      expect(getPublishedDataset(db)?.version).toBe('test-v1');
      expect((db.prepare('SELECT COUNT(*) AS count FROM countries').get() as { count: number }).count).toBe(1);
    } finally {
      db.close();
    }
  });

  test('rolls back country replacement and active metadata when publication fails', () => {
    const db = new Database(':memory:');
    try {
      publishPipelineCandidate(db, {
        countries: [country('OLD')],
        bpByIso: new Map([['OLD', bp('OLD')]]),
        sourceSummary: { source: 'test' },
      }, 'test-v1');

      expect(() => publishPipelineCandidate(db, {
        countries: [country('NEW')],
        bpByIso: new Map(),
        sourceSummary: { source: 'broken' },
      }, 'test-v2')).toThrow('Missing BP result for NEW');

      expect(getPublishedDataset(db)?.version).toBe('test-v1');
      expect(db.prepare('SELECT iso_code FROM countries').pluck().all()).toEqual(['OLD']);
      expect(db.prepare("SELECT COUNT(*) FROM dataset_versions WHERE version = 'test-v2'").pluck().get()).toBe(0);
    } finally {
      db.close();
    }
  });
});
