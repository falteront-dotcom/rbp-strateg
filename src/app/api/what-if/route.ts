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

    const row = db.prepare("SELECT * FROM countries WHERE isoCode = ?").get(iso) as Record<string, unknown> | undefined;
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
    isoCode: (row.isoCode as string) ?? "",
    name: (row.name as string) ?? "",
    nameRu: (row.nameRu as string) ?? "",
    side: (row.side as "NATO" | "RUS" | "CHINA" | "UKR" | "NEUTRAL") ?? "NEUTRAL",
    coalition: (row.coalition as "NATO" | "CSTO" | "AUKUS" | "BRICS" | null) ?? null,
    areaKm2: (row.areaKm2 as number) ?? 0,
    coastlineKm: (row.coastlineKm as number) ?? 0,
    gdpPppBn: (row.gdpPppBn as number) ?? 0,
    militaryBudgetBn: (row.militaryBudgetBn as number) ?? 0,
    defensePctGdp: (row.defensePctGdp as number) ?? 0,
    populationM: (row.populationM as number) ?? 0,
    activePersonnel: (row.activePersonnel as number) ?? 0,
    reservePersonnel: (row.reservePersonnel as number) ?? 0,
    fitForServiceM: (row.fitForServiceM as number) ?? 0,
    totalTanks: (row.totalTanks as number) ?? 0,
    totalAfv: (row.totalAfv as number) ?? 0,
    totalArtillery: (row.totalArtillery as number) ?? 0,
    totalMlrs: (row.totalMlrs as number) ?? 0,
    totalAircraft: (row.totalAircraft as number) ?? 0,
    totalHelicopters: (row.totalHelicopters as number) ?? 0,
    totalNavy: (row.totalNavy as number) ?? 0,
    aircraftCarriers: (row.aircraftCarriers as number) ?? 0,
    submarines: (row.submarines as number) ?? 0,
    nuclearWarheads: (row.nuclearWarheads as number) ?? 0,
    ports: (row.ports as number) ?? 0,
    airfields: (row.airfields as number) ?? 0,
    oilProductionKbd: (row.oilProductionKbd as number) ?? 0,
    merchantFleet: (row.merchantFleet as number) ?? 0,
    techLevel: (row.techLevel as number) ?? 3,
    moraleIndex: (row.moraleIndex as number) ?? 5,
    combatExperience: (row.combatExperience as number) ?? 3,
    c2Capability: (row.c2Capability as number) ?? 5,
    ewCapability: (row.ewCapability as number) ?? 4,
    climateZone: (row.climateZone as string) ?? "temperate",
    updatedAt: (row.updatedAt as string) ?? new Date().toISOString(),
  };
}
