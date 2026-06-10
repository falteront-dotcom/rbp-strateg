// ─────────────────────────────────────────────────────────────────────────────
// Country DB Row Mapper
// Single snake_case/camelCase boundary for SQLite, API responses and BP engines.
// This prevents recurring runtime bugs where SQL rows used DB column names while
// the frontend/model expected domain camelCase fields.
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData } from "@/lib/bp/types";
import type { CountryCompareData } from "@/lib/comparison";

export type CountryDbRow = Record<string, unknown>;

export interface CountryApiData extends CountryCompareData {
  climateZone: string;
  updatedAt: string;
}

const SCORE_DEFAULTS = {
  techLevel: 5,
  moraleIndex: 5,
  combatExperience: 3,
  c2Capability: 5,
  ewCapability: 5,
} as const;

function firstDefined(row: CountryDbRow, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

export function numberField(row: CountryDbRow, snakeKey: string, camelKey: string, fallback = 0): number {
  const value = firstDefined(row, snakeKey, camelKey);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function stringField(row: CountryDbRow, snakeKey: string, camelKey: string, fallback = ""): string {
  const value = firstDefined(row, snakeKey, camelKey);
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export function nullableStringField(row: CountryDbRow, snakeKey: string, camelKey: string): string | null {
  const value = firstDefined(row, snakeKey, camelKey);
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

export function normalizeIsoCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function toCountryRawData(row: CountryDbRow): CountryRawData {
  const isoCode = normalizeIsoCode(firstDefined(row, "iso_code", "isoCode"));

  return {
    isoCode,
    name: stringField(row, "name", "name"),
    nameRu: stringField(row, "name_ru", "nameRu"),
    side: stringField(row, "side", "side", "NEUTRAL") as CountryRawData["side"],
    coalition: nullableStringField(row, "coalition", "coalition") as CountryRawData["coalition"],

    areaKm2: numberField(row, "area_km2", "areaKm2"),
    coastlineKm: numberField(row, "coastline_km", "coastlineKm"),
    climateZone: stringField(row, "climate_zone", "climateZone", "temperate"),

    gdpPppBn: numberField(row, "gdp_ppp_bn", "gdpPppBn"),
    militaryBudgetBn: numberField(row, "military_budget_bn", "militaryBudgetBn"),
    defensePctGdp: numberField(row, "defense_pct_gdp", "defensePctGdp"),

    populationM: numberField(row, "population_m", "populationM"),
    activePersonnel: numberField(row, "active_personnel", "activePersonnel"),
    reservePersonnel: numberField(row, "reserve_personnel", "reservePersonnel"),
    fitForServiceM: numberField(row, "fit_for_service_m", "fitForServiceM"),

    totalTanks: numberField(row, "total_tanks", "totalTanks"),
    totalAfv: numberField(row, "total_afv", "totalAfv"),
    totalArtillery: numberField(row, "total_artillery", "totalArtillery"),
    totalMlrs: numberField(row, "total_mlrs", "totalMlrs"),
    totalAircraft: numberField(row, "total_aircraft", "totalAircraft"),
    totalHelicopters: numberField(row, "total_helicopters", "totalHelicopters"),
    totalNavy: numberField(row, "total_navy", "totalNavy"),
    submarines: numberField(row, "submarines", "submarines"),
    aircraftCarriers: numberField(row, "aircraft_carriers", "aircraftCarriers"),
    nuclearWarheads: numberField(row, "nuclear_warheads", "nuclearWarheads"),

    ports: numberField(row, "ports", "ports"),
    airfields: numberField(row, "airfields", "airfields"),
    oilProductionKbd: numberField(row, "oil_production_kbd", "oilProductionKbd"),
    merchantFleet: numberField(row, "merchant_fleet", "merchantFleet"),

    techLevel: numberField(row, "tech_level", "techLevel", SCORE_DEFAULTS.techLevel),
    moraleIndex: numberField(row, "morale_index", "moraleIndex", SCORE_DEFAULTS.moraleIndex),
    combatExperience: numberField(row, "combat_experience", "combatExperience", SCORE_DEFAULTS.combatExperience),
    c2Capability: numberField(row, "c2_capability", "c2Capability", SCORE_DEFAULTS.c2Capability),
    ewCapability: numberField(row, "ew_capability", "ewCapability", SCORE_DEFAULTS.ewCapability),

    updatedAt: stringField(row, "updated_at", "updatedAt", new Date().toISOString()),
  };
}

export function toCountryApiData(row: CountryDbRow): CountryApiData {
  const raw = toCountryRawData(row);

  return {
    ...raw,
    side: raw.side,
    coalition: raw.coalition,
    bpTotal: numberField(row, "bp_total", "bpTotal"),
    bpWeapon: numberField(row, "bp_weapon", "bpWeapon"),
    bpManpower: numberField(row, "bp_manpower", "bpManpower"),
    bpLogistics: numberField(row, "bp_logistics", "bpLogistics"),
    bpC2: numberField(row, "bp_c2", "bpC2"),
    bpEconomy: numberField(row, "bp_economy", "bpEconomy"),
    bpDoctrine: numberField(row, "bp_doctrine", "bpDoctrine"),
    bpReadiness: numberField(row, "bp_readiness", "bpReadiness"),
    bpTerrain: numberField(row, "bp_terrain", "bpTerrain"),
  };
}

export function toCountryCompareData(row: CountryDbRow): CountryCompareData {
  const api = toCountryApiData(row);
  return {
    isoCode: api.isoCode,
    name: api.name,
    nameRu: api.nameRu,
    side: api.side,
    coalition: api.coalition,
    areaKm2: api.areaKm2,
    coastlineKm: api.coastlineKm,
    gdpPppBn: api.gdpPppBn,
    militaryBudgetBn: api.militaryBudgetBn,
    defensePctGdp: api.defensePctGdp,
    populationM: api.populationM,
    activePersonnel: api.activePersonnel,
    reservePersonnel: api.reservePersonnel,
    totalTanks: api.totalTanks,
    totalAfv: api.totalAfv,
    totalArtillery: api.totalArtillery,
    totalMlrs: api.totalMlrs,
    totalAircraft: api.totalAircraft,
    totalHelicopters: api.totalHelicopters,
    totalNavy: api.totalNavy,
    aircraftCarriers: api.aircraftCarriers,
    submarines: api.submarines,
    nuclearWarheads: api.nuclearWarheads,
    ports: api.ports,
    airfields: api.airfields,
    oilProductionKbd: api.oilProductionKbd,
    merchantFleet: api.merchantFleet,
    fitForServiceM: api.fitForServiceM,
    techLevel: api.techLevel,
    moraleIndex: api.moraleIndex,
    combatExperience: api.combatExperience,
    c2Capability: api.c2Capability,
    ewCapability: api.ewCapability,
    bpTotal: api.bpTotal,
    bpWeapon: api.bpWeapon,
    bpManpower: api.bpManpower,
    bpLogistics: api.bpLogistics,
    bpC2: api.bpC2,
    bpEconomy: api.bpEconomy,
    bpDoctrine: api.bpDoctrine,
    bpReadiness: api.bpReadiness,
    bpTerrain: api.bpTerrain,
  };
}

export function toExportRow(row: CountryDbRow): CountryApiData {
  return toCountryApiData(row);
}

export function getMissingCriticalFields(row: CountryDbRow): string[] {
  const raw = toCountryRawData(row);
  const checks: Array<[keyof CountryRawData, number | string]> = [
    ["isoCode", raw.isoCode],
    ["name", raw.name],
    ["nameRu", raw.nameRu],
    ["populationM", raw.populationM],
    ["gdpPppBn", raw.gdpPppBn],
    ["militaryBudgetBn", raw.militaryBudgetBn],
    ["activePersonnel", raw.activePersonnel],
    ["totalTanks", raw.totalTanks],
    ["totalAircraft", raw.totalAircraft],
    ["ports", raw.ports],
    ["airfields", raw.airfields],
  ];

  return checks
    .filter(([, value]) => value === "" || value === 0 || value === null || value === undefined)
    .map(([key]) => key);
}
