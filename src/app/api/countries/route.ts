import { NextResponse } from "next/server";

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

    const enriched = rows.map((row, index) => ({
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
      bpRank: index + 1,
    }));

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
