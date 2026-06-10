import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { assertMaintenanceAccess } from "@/lib/api/route-guards";
import { toCountryRawData } from "@/lib/db/country-row-mapper";

/**
 * GET /api/run-pipeline
 * 
 * Runs the full multi-source data pipeline:
 * 1. Fetch World Bank API (GDP, population, military budget)
 * 2. Load GFP data (military hardware, personnel)
 * 3. Load FAS nuclear data
 * 4. Merge with cross-validation
 * 5. Calculate BP for all countries
 * 6. Write to SQLite
 * 
 * This endpoint is idempotent — it drops and re-creates all data.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = assertMaintenanceAccess(request, "/api/run-pipeline");
  if (blocked) return blocked;

  const events: string[] = [];

  try {
    events.push("Pipeline started");

    // Dynamic imports for tree-shaking
    const { runPipeline } = await import("@/scripts/data-pipeline/merge-validate");
    const { calculateAllCountriesBP } = await import("@/lib/bp");
    // 1. Run pipeline — merge all sources
    const { countries, conflicts, stats } = await runPipeline();
    events.push(`Merged ${countries.length} countries, ${conflicts.length} conflicts`);

    // 2. Calculate BP for all countries
    const rawData = countries.map((country) => toCountryRawData(country as unknown as Record<string, unknown>));

    const bpResults = calculateAllCountriesBP(rawData);

    // 3. Write to SQLite
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");

    // Ensure table exists
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS countries (
        iso_code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ru TEXT NOT NULL,
        side TEXT NOT NULL,
        coalition TEXT,
        area_km2 INTEGER NOT NULL DEFAULT 0,
        coastline_km INTEGER NOT NULL DEFAULT 0,
        climate_zone TEXT NOT NULL DEFAULT '',
        gdp_ppp_bn REAL NOT NULL DEFAULT 0,
        military_budget_bn REAL NOT NULL DEFAULT 0,
        defense_pct_gdp REAL NOT NULL DEFAULT 0,
        population_m REAL NOT NULL DEFAULT 0,
        active_personnel INTEGER NOT NULL DEFAULT 0,
        reserve_personnel INTEGER NOT NULL DEFAULT 0,
        fit_for_service_m REAL NOT NULL DEFAULT 0,
        total_tanks INTEGER NOT NULL DEFAULT 0,
        total_afv INTEGER NOT NULL DEFAULT 0,
        total_artillery INTEGER NOT NULL DEFAULT 0,
        total_mlrs INTEGER NOT NULL DEFAULT 0,
        total_aircraft INTEGER NOT NULL DEFAULT 0,
        total_helicopters INTEGER NOT NULL DEFAULT 0,
        total_navy INTEGER NOT NULL DEFAULT 0,
        submarines INTEGER NOT NULL DEFAULT 0,
        aircraft_carriers INTEGER NOT NULL DEFAULT 0,
        nuclear_warheads INTEGER DEFAULT 0,
        ports INTEGER NOT NULL DEFAULT 0,
        airfields INTEGER NOT NULL DEFAULT 0,
        oil_production_kbd INTEGER NOT NULL DEFAULT 0,
        merchant_fleet INTEGER NOT NULL DEFAULT 0,
        tech_level INTEGER NOT NULL DEFAULT 5,
        morale_index INTEGER NOT NULL DEFAULT 5,
        combat_experience INTEGER NOT NULL DEFAULT 3,
        c2_capability INTEGER NOT NULL DEFAULT 5,
        ew_capability INTEGER NOT NULL DEFAULT 5,
        bp_total REAL DEFAULT 0,
        bp_weapon REAL DEFAULT 0,
        bp_manpower REAL DEFAULT 0,
        bp_logistics REAL DEFAULT 0,
        bp_c2 REAL DEFAULT 0,
        bp_economy REAL DEFAULT 0,
        bp_doctrine REAL DEFAULT 0,
        bp_readiness REAL DEFAULT 0,
        bp_terrain REAL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
    `);

    // Insert/replace all countries
    const insertStmt = sqlite.prepare(`
      INSERT OR REPLACE INTO countries (
        iso_code, name, name_ru, side, coalition,
        area_km2, coastline_km, climate_zone,
        gdp_ppp_bn, military_budget_bn, defense_pct_gdp,
        population_m, active_personnel, reserve_personnel, fit_for_service_m,
        total_tanks, total_afv, total_artillery, total_mlrs,
        total_aircraft, total_helicopters,
        total_navy, submarines, aircraft_carriers, nuclear_warheads,
        ports, airfields, oil_production_kbd, merchant_fleet,
        tech_level, morale_index, combat_experience, c2_capability, ew_capability,
        bp_total, bp_weapon, bp_manpower, bp_logistics, bp_c2, bp_economy, bp_doctrine, bp_readiness, bp_terrain,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?
      )
    `);

    const insertMany = sqlite.transaction(() => {
      for (let i = 0; i < countries.length; i++) {
        const c = countries[i];
        const bp = bpResults[i];
        insertStmt.run(
          c.isoCode, c.name, c.nameRu, c.side, c.coalition,
          c.areaKm2, c.coastlineKm, c.climateZone,
          c.gdpPppBn, c.militaryBudgetBn, c.defensePctGdp,
          c.populationM, c.activePersonnel, c.reservePersonnel, c.fitForServiceM,
          c.totalTanks, c.totalAfv, c.totalArtillery, c.totalMlrs,
          c.totalAircraft, c.totalHelicopters,
          c.totalNavy, c.submarines, c.aircraftCarriers, c.nuclearWarheads,
          c.ports, c.airfields, c.oilProductionKbd, c.merchantFleet,
          c.techLevel, c.moraleIndex, c.combatExperience, c.c2Capability, c.ewCapability,
          bp.totalBP,
          bp.components.weapon.normalizedValue,
          bp.components.manpower.normalizedValue,
          bp.components.logistics.normalizedValue,
          bp.components.c2.normalizedValue,
          bp.components.economy.normalizedValue,
          bp.components.doctrine.normalizedValue,
          bp.components.readiness.normalizedValue,
          bp.components.terrain.normalizedValue,
          c.updatedAt,
        );
      }
    });

    insertMany();
    sqlite.close();
    events.push(`Wrote ${countries.length} countries to SQLite`);

    const top10 = bpResults.slice(0, 10).map(bp => ({
      rank: bp.rank,
      iso: bp.isoCode,
      name: bp.name,
      totalBP: Number(bp.totalBP.toFixed(1)),
    }));

    return NextResponse.json({
      ok: true,
      pipeline: stats,
      countriesWritten: countries.length,
      bpCalculated: bpResults.length,
      conflicts: conflicts.length,
      conflictDetails: conflicts.slice(0, 10),
      events,
      top10,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message, events }, { status: 500 });
  }
}
