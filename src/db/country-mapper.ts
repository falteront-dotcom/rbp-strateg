import type { CountryRawData } from "@/lib/bp/types";

/** Raw SQLite row shape for the countries table. */
export interface RawCountryRow {
  iso_code: string;
  name: string;
  name_ru: string;
  side: string;
  coalition: string | null;
  area_km2: number;
  coastline_km: number;
  climate_zone: string;
  gdp_ppp_bn: number;
  military_budget_bn: number;
  defense_pct_gdp: number;
  population_m: number;
  active_personnel: number;
  reserve_personnel: number;
  fit_for_service_m: number;
  total_tanks: number;
  total_afv: number;
  total_artillery: number;
  total_mlrs: number;
  total_aircraft: number;
  total_helicopters: number;
  total_navy: number;
  submarines: number;
  aircraft_carriers: number;
  nuclear_warheads: number | null;
  ports: number;
  airfields: number;
  oil_production_kbd: number;
  merchant_fleet: number;
  tech_level: number;
  morale_index: number;
  combat_experience: number;
  c2_capability: number;
  ew_capability: number;
  bp_total: number | null;
  bp_weapon: number | null;
  bp_manpower: number | null;
  bp_logistics: number | null;
  bp_c2: number | null;
  bp_economy: number | null;
  bp_doctrine: number | null;
  bp_readiness: number | null;
  bp_terrain: number | null;
  updated_at: string;
}

/** Country shape returned by the country-oriented API routes. */
export interface CountryApiData extends CountryRawData {
  region: string;
  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
}

/** Derive a stable region label from coalition and side metadata. */
export function deriveRegion(side: string, coalition: string | null): string {
  if (coalition === "NATO") return "NATO";
  if (coalition === "CSTO") return "CSTO";
  if (coalition === "AUKUS") return "AUKUS";
  if (coalition === "BRICS") return "BRICS";
  if (side === "NATO") return "Western";
  if (side === "RUS") return "Eurasian";
  if (side === "CHINA") return "Asia-Pacific";
  if (side === "UKR") return "Ukraine";
  return "Non-Aligned";
}

function numberOrZero(value: number | null): number {
  return value ?? 0;
}

/** Convert one snake_case SQLite country row to the public camelCase shape. */
export function mapCountryRow(row: RawCountryRow): CountryApiData {
  return {
    isoCode: row.iso_code,
    name: row.name,
    nameRu: row.name_ru,
    side: row.side as CountryRawData["side"],
    coalition: row.coalition as CountryRawData["coalition"],
    region: deriveRegion(row.side, row.coalition),
    areaKm2: row.area_km2,
    coastlineKm: row.coastline_km,
    climateZone: row.climate_zone,
    gdpPppBn: row.gdp_ppp_bn,
    militaryBudgetBn: row.military_budget_bn,
    defensePctGdp: row.defense_pct_gdp,
    populationM: row.population_m,
    activePersonnel: row.active_personnel,
    reservePersonnel: row.reserve_personnel,
    fitForServiceM: row.fit_for_service_m,
    totalTanks: row.total_tanks,
    totalAfv: row.total_afv,
    totalArtillery: row.total_artillery,
    totalMlrs: row.total_mlrs,
    totalAircraft: row.total_aircraft,
    totalHelicopters: row.total_helicopters,
    totalNavy: row.total_navy,
    submarines: row.submarines,
    aircraftCarriers: row.aircraft_carriers,
    nuclearWarheads: numberOrZero(row.nuclear_warheads),
    ports: row.ports,
    airfields: row.airfields,
    oilProductionKbd: row.oil_production_kbd,
    merchantFleet: row.merchant_fleet,
    techLevel: row.tech_level,
    moraleIndex: row.morale_index,
    combatExperience: row.combat_experience,
    c2Capability: row.c2_capability,
    ewCapability: row.ew_capability,
    bpTotal: numberOrZero(row.bp_total),
    bpWeapon: numberOrZero(row.bp_weapon),
    bpManpower: numberOrZero(row.bp_manpower),
    bpLogistics: numberOrZero(row.bp_logistics),
    bpC2: numberOrZero(row.bp_c2),
    bpEconomy: numberOrZero(row.bp_economy),
    bpDoctrine: numberOrZero(row.bp_doctrine),
    bpReadiness: numberOrZero(row.bp_readiness),
    bpTerrain: numberOrZero(row.bp_terrain),
    updatedAt: row.updated_at,
  };
}

/** Convert multiple raw SQLite rows using the shared country mapper. */
export function mapCountryRows(rows: RawCountryRow[]): CountryApiData[] {
  return rows.map(mapCountryRow);
}
