import type Database from 'better-sqlite3';
import type { CountryBP } from '@/lib/bp/types';
import type { RawCountryRow } from '@/db/country-mapper';
import type { MergedCountry } from '@/scripts/data-pipeline/merge-validate';
import { openDatabase } from '@/db/runtime';
import { ensureCountriesTable } from '@/db/countries-ddl';
import { ensureDatasetSchema } from '@/db/dataset-schema';
import { recordPublishedDataset } from '@/db/dataset-repository';
import { validateCountryDataset } from './validation';
import type { DatasetVersion } from './types';

export interface PipelineCandidate {
  countries: MergedCountry[];
  bpByIso: Map<string, CountryBP>;
  sourceSummary: Record<string, unknown>;
}

export interface PublishPipelineResult {
  dataset: DatasetVersion;
  countriesWritten: number;
}

function countryToRawData(country: MergedCountry) {
  return {
    isoCode: country.isoCode, name: country.name, nameRu: country.nameRu,
    side: country.side, coalition: country.coalition, areaKm2: country.areaKm2,
    coastlineKm: country.coastlineKm, climateZone: country.climateZone,
    gdpPppBn: country.gdpPppBn, militaryBudgetBn: country.militaryBudgetBn,
    defensePctGdp: country.defensePctGdp, populationM: country.populationM,
    activePersonnel: country.activePersonnel, reservePersonnel: country.reservePersonnel,
    fitForServiceM: country.fitForServiceM, totalTanks: country.totalTanks,
    totalAfv: country.totalAfv, totalArtillery: country.totalArtillery,
    totalMlrs: country.totalMlrs, totalAircraft: country.totalAircraft,
    totalHelicopters: country.totalHelicopters, totalNavy: country.totalNavy,
    submarines: country.submarines, aircraftCarriers: country.aircraftCarriers,
    nuclearWarheads: country.nuclearWarheads, ports: country.ports,
    airfields: country.airfields, oilProductionKbd: country.oilProductionKbd,
    merchantFleet: country.merchantFleet, techLevel: country.techLevel,
    moraleIndex: country.moraleIndex, combatExperience: country.combatExperience,
    c2Capability: country.c2Capability, ewCapability: country.ewCapability,
    updatedAt: country.updatedAt,
  };
}

export async function refreshDatasetFromSources(): Promise<PublishPipelineResult> {
  const { runPipeline } = await import('@/scripts/data-pipeline/merge-validate');
  const { calculateAllCountriesBP } = await import('@/lib/bp');
  const pipeline = await runPipeline();
  const bpResults = calculateAllCountriesBP(pipeline.countries.map(countryToRawData));
  const bpByIso = new Map(bpResults.map((bp) => [bp.isoCode, bp]));
  const db = openDatabase();
  try {
    return publishPipelineCandidate(db, {
      countries: pipeline.countries,
      bpByIso,
      sourceSummary: { source: 'automatic-pipeline', pipeline: pipeline.stats, conflicts: pipeline.conflicts.length },
    }, `pipeline-${new Date().toISOString()}`);
  } finally {
    db.close();
  }
}

const INSERT_COUNTRY_SQL = `
INSERT INTO countries (
  iso_code, name, name_ru, side, coalition, area_km2, coastline_km, climate_zone,
  gdp_ppp_bn, military_budget_bn, defense_pct_gdp, population_m, active_personnel,
  reserve_personnel, fit_for_service_m, total_tanks, total_afv, total_artillery,
  total_mlrs, total_aircraft, total_helicopters, total_navy, submarines,
  aircraft_carriers, nuclear_warheads, ports, airfields, oil_production_kbd,
  merchant_fleet, tech_level, morale_index, combat_experience, c2_capability,
  ew_capability, bp_total, bp_weapon, bp_manpower, bp_logistics, bp_c2,
  bp_economy, bp_doctrine, bp_readiness, bp_terrain, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)`;

export function publishPipelineCandidate(
  db: Database.Database,
  candidate: PipelineCandidate,
  version: string,
): PublishPipelineResult {
  ensureCountriesTable(db);
  ensureDatasetSchema(db);
  const insert = db.prepare(INSERT_COUNTRY_SQL);

  return db.transaction(() => {
    db.prepare('DELETE FROM countries').run();
    for (const country of candidate.countries) {
      const bp = candidate.bpByIso.get(country.isoCode);
      if (!bp) throw new Error(`Missing BP result for ${country.isoCode}`);
      insert.run(
        country.isoCode, country.name, country.nameRu, country.side, country.coalition,
        country.areaKm2, country.coastlineKm, country.climateZone, country.gdpPppBn,
        country.militaryBudgetBn, country.defensePctGdp, country.populationM,
        country.activePersonnel, country.reservePersonnel, country.fitForServiceM,
        country.totalTanks, country.totalAfv, country.totalArtillery, country.totalMlrs,
        country.totalAircraft, country.totalHelicopters, country.totalNavy,
        country.submarines, country.aircraftCarriers, country.nuclearWarheads,
        country.ports, country.airfields, country.oilProductionKbd, country.merchantFleet,
        country.techLevel, country.moraleIndex, country.combatExperience,
        country.c2Capability, country.ewCapability, bp.totalBP,
        bp.components.weapon.normalizedValue, bp.components.manpower.normalizedValue,
        bp.components.logistics.normalizedValue, bp.components.c2.normalizedValue,
        bp.components.economy.normalizedValue, bp.components.doctrine.normalizedValue,
        bp.components.readiness.normalizedValue, bp.components.terrain.normalizedValue,
        country.updatedAt,
      );
    }

    const rows = db.prepare('SELECT * FROM countries').all() as RawCountryRow[];
    const validation = validateCountryDataset(rows);
    if (!validation.ok) {
      throw new Error(`Dataset validation failed: ${validation.errors.map((issue) => issue.message).join('; ')}`);
    }
    const dataset = recordPublishedDataset(db, version, validation, candidate.sourceSummary);
    return { dataset, countriesWritten: rows.length };
  })();
}

let inFlightRefresh: Promise<unknown> | null = null;

export function getRefreshIntervalMs(): number {
  const configured = Number(process.env.RBP_DATA_REFRESH_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 60_000
    ? configured
    : 6 * 60 * 60 * 1000;
}

export function isDatasetRefreshDue(lastCheck: string | null, now = Date.now()): boolean {
  if (!lastCheck) return true;
  const checkedAt = new Date(lastCheck).getTime();
  return !Number.isFinite(checkedAt) || now - checkedAt >= getRefreshIntervalMs();
}

export function runRefreshSingleFlight<T>(operation: () => Promise<T>): Promise<T> {
  if (inFlightRefresh) return inFlightRefresh as Promise<T>;
  inFlightRefresh = operation().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh as Promise<T>;
}

export interface RefreshOutcome<T> {
  attempted: boolean;
  ok: boolean;
  value?: T;
  error?: string;
}

export interface RefreshOptions<T> {
  lastCheck: string | null;
  operation: () => Promise<T>;
  now?: number;
}

export async function refreshDatasetIfDue<T>(options: RefreshOptions<T>): Promise<RefreshOutcome<T>> {
  if (!isDatasetRefreshDue(options.lastCheck, options.now)) return { attempted: false, ok: true };
  try {
    const value = await runRefreshSingleFlight(options.operation);
    return { attempted: true, ok: true, value };
  } catch (error: unknown) {
    return { attempted: true, ok: false, error: error instanceof Error ? error.message : 'Dataset refresh failed' };
  }
}
