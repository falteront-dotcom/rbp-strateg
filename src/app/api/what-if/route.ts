// ─────────────────────────────────────────────────────────────────────────────
// API /api/what-if — What-If Scenario Analysis
// POST: { iso, params } → { base, scenario }
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { calculateWhatIf, type ScenarioParams, DEFAULT_SCENARIO_PARAMS } from "@/lib/what-if-engine";
import type { CountryRawData } from "@/lib/bp/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const iso: string = body.iso;
    const params: ScenarioParams = { ...DEFAULT_SCENARIO_PARAMS, ...body.params };

    if (!iso) {
      return NextResponse.json({ error: "Missing iso parameter" }, { status: 400 });
    }

    // Dynamic import for better-sqlite3 (Turbopack compatibility)
    const Database = (await import("better-sqlite3")).default;
    const db = new Database("sqlite.db", { readonly: true });

    const row = db.prepare("SELECT * FROM countries WHERE iso_code = ?").get(iso) as Record<string, unknown> | undefined;
    if (!row) {
      db.close();
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const allRows = db.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    db.close();

    const country = rowToRawData(row);
    const allCountries = allRows.map(rowToRawData);

    const result = calculateWhatIf(country, allCountries, params);

    return NextResponse.json({
      base: { isoCode: result.baseBP.isoCode, totalBP: result.baseBP.totalBP, rank: result.baseRank },
      scenario: {
        totalBP: result.scenarioBP.totalBP,
        rank: result.scenarioRank,
        rankChange: result.rankChange,
        componentDeltas: result.componentDeltas,
        totalDelta: result.totalDelta,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function rowToRawData(row: Record<string, unknown>): CountryRawData {
  return {
    isoCode: (row.iso_code as string) ?? "",
    name: (row.name as string) ?? "",
    nameRu: (row.name_ru as string) ?? "",
    side: (row.side as "NATO" | "RUS" | "CHINA" | "UKR" | "NEUTRAL") ?? "NEUTRAL",
    coalition: (row.coalition as "NATO" | "CSTO" | "AUKUS" | "BRICS" | null) ?? null,
    areaKm2: (row.area_km2 as number) ?? 0,
    coastlineKm: (row.coastline_km as number) ?? 0,
    gdpPppBn: (row.gdp_ppp_bn as number) ?? 0,
    militaryBudgetBn: (row.military_budget_bn as number) ?? 0,
    defensePctGdp: (row.defense_pct_gdp as number) ?? 0,
    populationM: (row.population_m as number) ?? 0,
    activePersonnel: (row.active_personnel as number) ?? 0,
    reservePersonnel: (row.reserve_personnel as number) ?? 0,
    fitForServiceM: (row.fit_for_service_m as number) ?? 0,
    totalTanks: (row.total_tanks as number) ?? 0,
    totalAfv: (row.total_afv as number) ?? 0,
    totalArtillery: (row.total_artillery as number) ?? 0,
    totalMlrs: (row.total_mlrs as number) ?? 0,
    totalAircraft: (row.total_aircraft as number) ?? 0,
    totalHelicopters: (row.total_helicopters as number) ?? 0,
    totalNavy: (row.total_navy as number) ?? 0,
    aircraftCarriers: (row.aircraft_carriers as number) ?? 0,
    submarines: (row.submarines as number) ?? 0,
    nuclearWarheads: (row.nuclear_warheads as number) ?? 0,
    ports: (row.ports as number) ?? 0,
    airfields: (row.airfields as number) ?? 0,
    oilProductionKbd: (row.oil_production_kbd as number) ?? 0,
    merchantFleet: (row.merchant_fleet as number) ?? 0,
    techLevel: (row.tech_level as number) ?? 3,
    moraleIndex: (row.morale_index as number) ?? 5,
    combatExperience: (row.combat_experience as number) ?? 3,
    c2Capability: (row.c2_capability as number) ?? 5,
    ewCapability: (row.ew_capability as number) ?? 4,
    climateZone: (row.climate_zone as string) ?? "temperate",
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}
