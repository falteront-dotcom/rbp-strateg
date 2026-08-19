import { NextResponse } from "next/server";
import { openDatabase, isAuthorizedAdminRequest } from "@/db/runtime";
import type { CountryRawData } from "@/lib/bp/types";
import type { CountryBP } from "@/lib/bp/types";
import type { RawCountryRow } from "@/db/country-mapper";
import { ensureDatasetSchema } from "@/db/dataset-schema";
import { recordPublishedDataset } from "@/db/dataset-repository";
import { validateCountryDataset } from "@/lib/dataset/validation";

/**
 * POST /api/run-pipeline
 *
 * Runs the full multi-source data pipeline:
 * 1. Fetch World Bank API (GDP, population, military budget)
 * 2. Load GFP data (military hardware, personnel)
 * 3. Load FAS nuclear data
 * 4. Merge with cross-validation
 * 5. Calculate BP for all countries
 * 6. Write to SQLite
 *
 * Authenticated: requires `x-admin-token` equal to the server-side
 * `RBP_ADMIN_TOKEN`. Unauthorized requests return 401 before any work or
 * database access occurs. GET is not exported (405 Method Not Allowed).
 *
 * Atomic replacement of the country set: the merged countries and their BP
 * scores are computed fully in memory first, then a single write transaction
 * DELETEs the entire table and INSERTs only the new set — so source countries
 * that have dropped out of the pipeline do not persist. On failure the
 * transaction rolls back and the prior data is preserved. The connection is
 * closed in `finally` even on failure paths.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let sqlite: ReturnType<typeof openDatabase> | undefined;
  try {
    console.log("[run-pipeline] Starting...");

    // Heavy pipeline modules are imported only after the auth gate passes.
    const { runPipeline } = await import("@/scripts/data-pipeline/merge-validate");
    const { calculateAllCountriesBP } = await import("@/lib/bp");

    // 1. Run the merge pipeline (network) — produces the complete new set.
    const { countries, conflicts, stats } = await runPipeline();
    console.log(
      `[run-pipeline] Merged ${countries.length} countries, ${conflicts.length} conflicts`,
    );

    // 2. Calculate BP for every country (pure, in memory).
    const rawData: CountryRawData[] = countries.map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      nameRu: c.nameRu,
      side: c.side,
      coalition: c.coalition,
      areaKm2: c.areaKm2,
      coastlineKm: c.coastlineKm,
      climateZone: c.climateZone,
      gdpPppBn: c.gdpPppBn,
      militaryBudgetBn: c.militaryBudgetBn,
      defensePctGdp: c.defensePctGdp,
      populationM: c.populationM,
      activePersonnel: c.activePersonnel,
      reservePersonnel: c.reservePersonnel,
      fitForServiceM: c.fitForServiceM,
      totalTanks: c.totalTanks,
      totalAfv: c.totalAfv,
      totalArtillery: c.totalArtillery,
      totalMlrs: c.totalMlrs,
      totalAircraft: c.totalAircraft,
      totalHelicopters: c.totalHelicopters,
      totalNavy: c.totalNavy,
      submarines: c.submarines,
      aircraftCarriers: c.aircraftCarriers,
      nuclearWarheads: c.nuclearWarheads,
      ports: c.ports,
      airfields: c.airfields,
      oilProductionKbd: c.oilProductionKbd,
      merchantFleet: c.merchantFleet,
      techLevel: c.techLevel,
      moraleIndex: c.moraleIndex,
      combatExperience: c.combatExperience,
      c2Capability: c.c2Capability,
      ewCapability: c.ewCapability,
      updatedAt: c.updatedAt,
    }));

    const bpResults = calculateAllCountriesBP(rawData);
    // `calculateAllCountriesBP` sorts results by rank, so pair BP to countries
    // by isoCode (not by index) to avoid assigning components to the wrong row.
    const bpByIso = new Map<string, CountryBP>(bpResults.map((bp) => [bp.isoCode, bp]));

    // 3. Open the DB and replace the country set atomically.
    sqlite = openDatabase();
    const database = sqlite;
    database.exec(`
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

    ensureDatasetSchema(database);
    const deleteAll = database.prepare("DELETE FROM countries");
    const insertStmt = database.prepare(`
      INSERT INTO countries (
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

    const published = database.transaction(() => {
      deleteAll.run();
      for (const c of countries) {
        const bp = bpByIso.get(c.isoCode);
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
          bp?.totalBP ?? 0,
          bp?.components.weapon.normalizedValue ?? 0,
          bp?.components.manpower.normalizedValue ?? 0,
          bp?.components.logistics.normalizedValue ?? 0,
          bp?.components.c2.normalizedValue ?? 0,
          bp?.components.economy.normalizedValue ?? 0,
          bp?.components.doctrine.normalizedValue ?? 0,
          bp?.components.readiness.normalizedValue ?? 0,
          bp?.components.terrain.normalizedValue ?? 0,
          c.updatedAt,
        );
      }

      const writtenRows = database.prepare("SELECT * FROM countries").all() as RawCountryRow[];
      const validation = validateCountryDataset(writtenRows);
      if (!validation.ok) {
        throw new Error(`Pipeline validation failed: ${validation.errors.map((issue) => issue.message).join('; ')}`);
      }
      return recordPublishedDataset(
        database,
        `pipeline-${new Date().toISOString()}`,
        validation,
        { pipeline: stats, conflicts: conflicts.length },
      );
    })();

    const top10 = bpResults.slice(0, 10).map((bp) => ({
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
      datasetVersion: published.version,
      top10,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[run-pipeline] Failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    sqlite?.close();
  }
}