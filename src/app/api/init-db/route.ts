import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { countries } from "@/db/schema";
import { top20Countries } from "@/db/seed/top20-countries";
import { extendedCountries } from "@/db/seed/extended-countries";
import { additionalCountries } from "@/db/seed/additional-countries";
import { calculateAllCountriesBP } from "@/lib/bp";
import { assertMaintenanceAccess } from "@/lib/api/route-guards";
import { toCountryRawData } from "@/lib/db/country-row-mapper";
import path from "path";

/** GET /api/init-db — Initialize database (create table, seed, calculate BP) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = assertMaintenanceAccess(request, "/api/init-db");
  if (blocked) return blocked;

  try {
    const DB_PATH = path.resolve(process.cwd(), "sqlite.db");
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    const db = drizzle(sqlite, { schema: { countries } });

    // 1. Create table
    sqlite.exec(`
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
    `);

    // 2. Seed
    const allData = [...top20Countries, ...extendedCountries, ...additionalCountries];
    db.delete(countries).run();
    db.insert(countries).values(allData).run();

    // 3. Calculate BP
    const allRows = db.select().from(countries).all();
    const rawData = allRows.map((row) => toCountryRawData(row as Record<string, unknown>));

    const bpResults = calculateAllCountriesBP(rawData);

    // 4. Write BP scores
    const updateStmt = sqlite.prepare(`
      UPDATE countries SET
        bp_total = ?, bp_weapon = ?, bp_manpower = ?, bp_logistics = ?,
        bp_c2 = ?, bp_economy = ?, bp_doctrine = ?, bp_readiness = ?, bp_terrain = ?
      WHERE iso_code = ?
    `);

    const updateMany = sqlite.transaction(() => {
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
    });
    updateMany();

    sqlite.close();

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
  }
}
