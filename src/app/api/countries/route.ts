import { NextResponse } from "next/server";
import type { CountryRawData } from "@/lib/bp/types";
import { calculateAdvancedCombatPotentialBatch } from "@/lib/bp/advanced-combat-potential";

/** Derive a region label from side/coalition */
function deriveRegion(side: string, coalition: string | null): string {
  if (coalition === "NATO") return "NATO";
  if (coalition === "CSTO") return "CSTO";
  if (coalition === "AUKUS") return "AUKUS";
  if (coalition === "BRICS") return "BRICS";
  if (side === "NATO") return "Western";
  if (side === "RUS") return "Eurasian";
  if (side === "CHINA") return "Asia-Pacific";
  return "Non-Aligned";
}


function num(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(row: Record<string, unknown>, key: string, fallback = ""): string {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowToRawData(row: Record<string, unknown>): CountryRawData {
  return {
    isoCode: str(row, "iso_code"),
    name: str(row, "name"),
    nameRu: str(row, "name_ru"),
    side: (str(row, "side", "NEUTRAL") as CountryRawData["side"]),
    coalition: row.coalition === null || typeof row.coalition === "undefined" ? null : (String(row.coalition) as CountryRawData["coalition"]),
    areaKm2: num(row, "area_km2"),
    coastlineKm: num(row, "coastline_km"),
    climateZone: str(row, "climate_zone"),
    gdpPppBn: num(row, "gdp_ppp_bn"),
    militaryBudgetBn: num(row, "military_budget_bn"),
    defensePctGdp: num(row, "defense_pct_gdp"),
    populationM: num(row, "population_m"),
    activePersonnel: num(row, "active_personnel"),
    reservePersonnel: num(row, "reserve_personnel"),
    fitForServiceM: num(row, "fit_for_service_m"),
    totalTanks: num(row, "total_tanks"),
    totalAfv: num(row, "total_afv"),
    totalArtillery: num(row, "total_artillery"),
    totalMlrs: num(row, "total_mlrs"),
    totalAircraft: num(row, "total_aircraft"),
    totalHelicopters: num(row, "total_helicopters"),
    totalNavy: num(row, "total_navy"),
    submarines: num(row, "submarines"),
    aircraftCarriers: num(row, "aircraft_carriers"),
    nuclearWarheads: num(row, "nuclear_warheads"),
    ports: num(row, "ports"),
    airfields: num(row, "airfields"),
    oilProductionKbd: num(row, "oil_production_kbd"),
    merchantFleet: num(row, "merchant_fleet"),
    techLevel: num(row, "tech_level"),
    moraleIndex: num(row, "morale_index"),
    combatExperience: num(row, "combat_experience"),
    c2Capability: num(row, "c2_capability"),
    ewCapability: num(row, "ew_capability"),
    updatedAt: str(row, "updated_at", new Date().toISOString()),
  };
}

/** GET /api/countries — Returns all countries with BP data, ranked */
export async function GET(): Promise<NextResponse> {
  try {
    // Dynamic import to avoid bundling the entire BP calculation tree
    const Database = (await import("better-sqlite3")).default;
    const path = (await import("path")).default;
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");

    const rows = sqlite.prepare(`
      SELECT * FROM countries ORDER BY bp_total DESC
    `).all() as Record<string, unknown>[];

    sqlite.close();

    const rawCountries = rows.map(rowToRawData);
    const advancedProfiles = calculateAdvancedCombatPotentialBatch(rawCountries);
    const advancedByIso = new Map(advancedProfiles.map((profile) => [profile.isoCode, profile]));

    const enriched = rows.map((row, index) => {
      const advanced = advancedByIso.get(String(row.iso_code));
      return ({
      isoCode: row.iso_code,
      name: row.name,
      nameRu: row.name_ru,
      side: row.side,
      coalition: row.coalition,
      region: deriveRegion(row.side as string, row.coalition as string | null),
      areaKm2: row.area_km2,
      coastlineKm: row.coastline_km,
      gdpPppBn: row.gdp_ppp_bn,
      militaryBudgetBn: row.military_budget_bn,
      defensePctGdp: row.defense_pct_gdp,
      populationM: row.population_m,
      activePersonnel: row.active_personnel,
      reservePersonnel: row.reserve_personnel,
      fitForServiceM: row.fit_for_service_m ?? 0,
      totalTanks: row.total_tanks,
      totalAfv: row.total_afv,
      totalArtillery: row.total_artillery,
      totalMlrs: row.total_mlrs ?? 0,
      totalAircraft: row.total_aircraft,
      totalHelicopters: row.total_helicopters ?? 0,
      totalNavy: row.total_navy,
      submarines: row.submarines,
      aircraftCarriers: row.aircraft_carriers ?? 0,
      nuclearWarheads: row.nuclear_warheads ?? 0,
      ports: row.ports,
      airfields: row.airfields,
      oilProductionKbd: row.oil_production_kbd,
      merchantFleet: row.merchant_fleet ?? 0,
      techLevel: row.tech_level,
      moraleIndex: row.morale_index,
      combatExperience: row.combat_experience,
      c2Capability: row.c2_capability,
      ewCapability: row.ew_capability,
      bpTotal: row.bp_total ?? 0,
      bpWeapon: row.bp_weapon ?? 0,
      bpManpower: row.bp_manpower ?? 0,
      bpLogistics: row.bp_logistics ?? 0,
      bpC2: row.bp_c2 ?? 0,
      bpEconomy: row.bp_economy ?? 0,
      bpDoctrine: row.bp_doctrine ?? 0,
      bpReadiness: row.bp_readiness ?? 0,
      bpTerrain: row.bp_terrain ?? 0,
      bpAdvanced: advanced?.advancedBP ?? row.bp_total ?? 0,
      bpAdvancedConfidence: advanced?.confidence ?? 0,
      bpAdvancedSummary: advanced?.summary ?? "",
      bpAdvancedDomains: advanced?.domains.map((domain) => ({
        key: domain.key,
        name: domain.name,
        score: domain.score,
        weight: domain.weight,
        confidence: domain.confidence,
      })) ?? [],
      bpAdvancedModifiers: advanced?.modifiers ?? [],
      bpAdvancedRisks: advanced?.riskFlags ?? [],
      bpAdvancedStrengths: advanced?.strengths ?? [],
      bpAdvancedWeaknesses: advanced?.weaknesses ?? [],
      bpRank: index + 1,
    });
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
