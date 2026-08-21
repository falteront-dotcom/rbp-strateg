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
import { ensureCountriesTable } from "../db/countries-ddl";
import { ensureDatasetSchema } from "../db/dataset-schema";
import { ensureWorkspaceSchema } from "../db/workspace-schema";
import { recordPublishedDataset } from "../db/dataset-repository";
import { validateCountryDataset } from "../lib/dataset/validation";
import type { RawCountryRow } from "../db/country-mapper";

function main(): void {
  console.log("🔧 Initializing RBP-Strateg database...");
  console.log(`   DB path: ${DB_PATH}`);

  const sqlite = openDatabase();
  const db = drizzle(sqlite, { schema: { countries } });
  try {

  // 1. Create canonical tables
  console.log("📐 Creating countries table...");
  ensureCountriesTable(sqlite);
  ensureDatasetSchema(sqlite);
  ensureWorkspaceSchema(sqlite);

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

  console.log("\n✅ Database initialization complete!");
  } finally {
    sqlite.close();
  }
}

main();
