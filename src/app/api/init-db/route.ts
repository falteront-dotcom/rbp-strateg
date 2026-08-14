import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { countries } from "@/db/schema";
import { top20Countries } from "@/db/seed/top20-countries";
import { extendedCountries } from "@/db/seed/extended-countries";
import { additionalCountries } from "@/db/seed/additional-countries";
import { calculateAllCountriesBP } from "@/lib/bp";
import type { CountryRawData } from "@/lib/bp/types";
import type { NewCountry } from "@/db/schema";
import { openDatabase, isAuthorizedAdminRequest } from "@/db/runtime";

/** Idempotent CREATE TABLE — mirrors the hand-written schema (source of truth). */
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS countries (
    iso_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    side TEXT NOT NULL,
    coalition TEXT,
    area_km2 INTEGER NOT NULL,
    coastline_km INTEGER NOT NULL,
    climate_zone TEXT NOT NULL,
    gdp_ppp_bn REAL NOT NULL,
    military_budget_bn REAL NOT NULL,
    defense_pct_gdp REAL NOT NULL,
    population_m REAL NOT NULL,
    active_personnel INTEGER NOT NULL,
    reserve_personnel INTEGER NOT NULL,
    fit_for_service_m REAL NOT NULL,
    total_tanks INTEGER NOT NULL,
    total_afv INTEGER NOT NULL,
    total_artillery INTEGER NOT NULL,
    total_mlrs INTEGER NOT NULL,
    total_aircraft INTEGER NOT NULL,
    total_helicopters INTEGER NOT NULL,
    total_navy INTEGER NOT NULL,
    submarines INTEGER NOT NULL,
    aircraft_carriers INTEGER NOT NULL,
    nuclear_warheads INTEGER DEFAULT 0,
    ports INTEGER NOT NULL,
    airfields INTEGER NOT NULL,
    oil_production_kbd INTEGER NOT NULL,
    merchant_fleet INTEGER NOT NULL,
    tech_level INTEGER NOT NULL,
    morale_index INTEGER NOT NULL,
    combat_experience INTEGER NOT NULL,
    c2_capability INTEGER NOT NULL,
    ew_capability INTEGER NOT NULL,
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
`;

const UPDATE_BP_SQL = `
  UPDATE countries SET
    bp_total = ?, bp_weapon = ?, bp_manpower = ?, bp_logistics = ?,
    bp_c2 = ?, bp_economy = ?, bp_doctrine = ?, bp_readiness = ?, bp_terrain = ?
  WHERE iso_code = ?
`;

/** Map a seed row to the BP engine input shape, preserving legitimate zeros. */
function seedRowToRawData(c: NewCountry): CountryRawData {
  return {
    isoCode: c.isoCode,
    name: c.name,
    nameRu: c.nameRu,
    side: c.side as CountryRawData["side"],
    coalition: (c.coalition ?? null) as CountryRawData["coalition"],
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
    nuclearWarheads: c.nuclearWarheads ?? 0,
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
  };
}

/**
 * POST /api/init-db — Initialize database (create table, seed, calculate BP).
 *
 * Authenticated: requires `x-admin-token` equal to the server-side
 * `RBP_ADMIN_TOKEN`. The token is read only on the server; a missing or
 * mismatched token returns 401 BEFORE any database handle is opened, so
 * unauthorized requests can never mutate the DB.
 *
 * Atomic: the delete + seed insert + BP update run in a single write
 * transaction; on any failure the DB rolls back to its prior state.
 * Finally-safe: the connection is closed even on failure paths. GET is not
 * exported, so non-POST requests get 405 Method Not Allowed.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let sqlite: ReturnType<typeof openDatabase> | undefined;
  try {
    const allData: NewCountry[] = [
      ...top20Countries,
      ...extendedCountries,
      ...additionalCountries,
    ];

    // Compute BP up front (pure, no DB access) so the write transaction only
    // touches the rows and is a single atomic unit.
    const rawData: CountryRawData[] = allData.map(seedRowToRawData);
    const bpResults = calculateAllCountriesBP(rawData);

    sqlite = openDatabase();
    const db = drizzle(sqlite, { schema: { countries } });
    sqlite.exec(CREATE_TABLE_SQL);

    const updateStmt = sqlite.prepare(UPDATE_BP_SQL);

    // One write transaction: clear, re-seed, and write BP scores atomically.
    sqlite.transaction(() => {
      db.delete(countries).run();
      db.insert(countries).values(allData).run();
      for (const bp of bpResults) {
        updateStmt.run(
          bp.totalBP,
          bp.components.weapon.normalizedValue,
          bp.components.manpower.normalizedValue,
          bp.components.logistics.normalizedValue,
          bp.components.c2.normalizedValue,
          bp.components.economy.normalizedValue,
          bp.components.doctrine.normalizedValue,
          bp.components.readiness.normalizedValue,
          bp.components.terrain.normalizedValue,
          bp.isoCode,
        );
      }
    })();

    const top10 = bpResults.slice(0, 10).map((bp) => ({
      rank: bp.rank,
      iso: bp.isoCode,
      name: bp.name,
      totalBP: Number(bp.totalBP.toFixed(1)),
    }));

    return NextResponse.json({
      ok: true,
      countriesSeeded: allData.length,
      bpCalculated: bpResults.length,
      top10,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    sqlite?.close();
  }
}