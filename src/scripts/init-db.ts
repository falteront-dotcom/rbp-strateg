/**
 * Init script: creates countries table, seeds data, and calculates BP scores.
 * Run with: npx tsx src/scripts/init-db.ts
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import { countries } from "../db/schema";
import { top20Countries } from "../db/seed/top20-countries";
import { extendedCountries } from "../db/seed/extended-countries";
import { additionalCountries } from "../db/seed/additional-countries";
import { calculateAllCountriesBP } from "../lib/bp";
import type { CountryRawData } from "../lib/bp/types";
import { openDatabase, DB_PATH } from "../db/runtime";
import { ensureDatasetSchema } from "../db/dataset-schema";
import { recordPublishedDataset } from "../db/dataset-repository";
import { validateCountryDataset } from "../lib/dataset/validation";
import type { RawCountryRow } from "../db/country-mapper";

function main(): void {
  console.log("🔧 Initializing RBP-Strateg database...");
  console.log(`   DB path: ${DB_PATH}`);

  const sqlite = openDatabase();
  const db = drizzle(sqlite, { schema: { countries } });

  // 1. Create table
  console.log("📐 Creating countries table...");
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
  ensureDatasetSchema(sqlite);

  // 2. Clear and seed
  console.log("🌱 Seeding country data...");
  const allData = [...top20Countries, ...extendedCountries, ...additionalCountries];

  db.delete(countries).run();
  db.insert(countries).values(allData).run();

  const count = db
    .select({ count: sql<number>`count(*)` })
    .from(countries)
    .get();
  console.log(`   Inserted ${count?.count ?? 0} countries`);

  // 3. Calculate BP for all countries
  console.log("📊 Calculating Combat Potential (БП) for all countries...");

  const allRows = db.select().from(countries).all();

  // Map DB rows to CountryRawData for BP calculation
  const rawData: CountryRawData[] = allRows.map((row) => ({
    isoCode: row.isoCode,
    name: row.name,
    nameRu: row.nameRu,
    side: row.side as "NATO" | "RUS" | "CHINA" | "NEUTRAL",
    coalition: (row.coalition ?? null) as "NATO" | "CSTO" | "AUKUS" | "BRICS" | null,
    areaKm2: row.areaKm2,
    coastlineKm: row.coastlineKm,
    climateZone: row.climateZone,
    gdpPppBn: row.gdpPppBn,
    militaryBudgetBn: row.militaryBudgetBn,
    defensePctGdp: row.defensePctGdp,
    populationM: row.populationM,
    activePersonnel: row.activePersonnel,
    reservePersonnel: row.reservePersonnel,
    fitForServiceM: row.fitForServiceM,
    totalTanks: row.totalTanks,
    totalAfv: row.totalAfv,
    totalArtillery: row.totalArtillery,
    totalMlrs: row.totalMlrs,
    totalAircraft: row.totalAircraft,
    totalHelicopters: row.totalHelicopters,
    totalNavy: row.totalNavy,
    submarines: row.submarines,
    aircraftCarriers: row.aircraftCarriers,
    nuclearWarheads: row.nuclearWarheads ?? 0,
    ports: row.ports,
    airfields: row.airfields,
    oilProductionKbd: row.oilProductionKbd,
    merchantFleet: row.merchantFleet,
    techLevel: row.techLevel,
    moraleIndex: row.moraleIndex,
    combatExperience: row.combatExperience,
    c2Capability: row.c2Capability,
    ewCapability: row.ewCapability,
    updatedAt: row.updatedAt,
  }));

  const bpResults = calculateAllCountriesBP(rawData);

  // 4. Write BP scores back to DB
  console.log("💾 Writing BP scores to database...");
  const updateStmt = sqlite.prepare(`
    UPDATE countries SET
      bp_total = ?, bp_weapon = ?, bp_manpower = ?, bp_logistics = ?,
      bp_c2 = ?, bp_economy = ?, bp_doctrine = ?, bp_readiness = ?, bp_terrain = ?
    WHERE iso_code = ?
  `);

  const updateMany = sqlite.transaction((results: typeof bpResults) => {
    for (const bp of results) {
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

  updateMany(bpResults);

  const seededRows = sqlite.prepare("SELECT * FROM countries").all() as RawCountryRow[];
  const validation = validateCountryDataset(seededRows);
  if (!validation.ok) {
    throw new Error(`Seed validation failed: ${validation.errors.map((issue) => issue.message).join('; ')}`);
  }
  const version = `seed-${allData.map((country) => country.updatedAt).sort().at(-1) ?? 'unknown'}`;
  recordPublishedDataset(sqlite, version, validation, { source: 'local-seed', countryCount: allData.length });

  // 5. Print top 10
  console.log("\n🏆 Top 10 Countries by Combat Potential:");
  console.log("─".repeat(60));
  for (const bp of bpResults.slice(0, 10)) {
    console.log(
      `  #${String(bp.rank).padStart(2)} ${bp.isoCode} ${bp.name.padEnd(20)} BP: ${bp.totalBP.toFixed(1).padStart(6)}`
    );
  }
  console.log("─".repeat(60));

  sqlite.close();
  console.log("\n✅ Database initialization complete!");
}

main();
