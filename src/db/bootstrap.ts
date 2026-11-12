import { drizzle } from "drizzle-orm/better-sqlite3";
import { countries } from "./schema";
import { top20Countries } from "./seed/top20-countries";
import { extendedCountries } from "./seed/extended-countries";
import { additionalCountries } from "./seed/additional-countries";
import { worldCountries } from "./seed/world-countries";
import { calculateAllCountriesBP } from "@/lib/bp";
import type { CountryRawData } from "@/lib/bp/types";
import type { NewCountry } from "./schema";
import { openDatabase } from "./runtime";
import { seedKnowledge, seedKnowledgeExtra, type KnowledgeSeedResult } from "./seed/knowledge";

/**
 * Инициализация производной БД из сидов и сгенерированных данных.
 *
 * База — производная (восстанавливаемая) сущность: всё содержимое выводится
 * из TS-сидов стран и сгенерированных модулей знаний. На хостингах
 * с эфемерным диском (Render free) БД пересоздаётся при каждом старте
 * процесса.
 *
 * ВАЖНО: рантаймные записи POST /api/run-pipeline (замена таблицы countries)
 * на эфемерном диске теряются при каждом рестарте и деплое — данные
 * откатываются к статическим сидам. Это осознанный компромисс free-тарифа;
 * постоянные результаты нужны — храни их вне БД.
 *
 * Идемпотентен: повторный запуск полностью пересобирает таблицы.
 */

/** Idempotent CREATE TABLE для стран — зеркало schema.ts. */
const CREATE_COUNTRIES_SQL = `
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

export interface BootstrapResult {
  countriesSeeded: number;
  bpCalculated: number;
  knowledge: KnowledgeSeedResult;
  knowledgeExtra: Record<string, number>;
  top10: { rank: number | null; iso: string; name: string; totalBP: number }[];
}

const SEED_META_SQL = `
  CREATE TABLE IF NOT EXISTS _seed_meta (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );
`;

/**
 * Эталон для /api/health: в конце успешного сева сам сид записывает
 * фактические COUNT(*) по всем таблицам в _seed_meta. Числа не хранятся
 * в коде, поэтому дрейф «ожидали одно — засеяли другое» невозможен
 * по построению. /api/health пересчитывает строки и сверяет с эталоном;
 * countries проверяется мягко (run-pipeline легитимно меняет состав).
 */
function writeSeedMeta(sqlite: import("better-sqlite3").Database) {
  sqlite.exec(SEED_META_SQL);
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_seed_meta'",
    )
    .all() as { name: string }[];
  const insert = sqlite.prepare("INSERT INTO _seed_meta (key, value) VALUES (?, ?)");
  sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM _seed_meta").run();
    for (const t of tables) {
      const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get() as { n: number };
      insert.run(t.name, row.n);
    }
  })();
}

export function initializeDatabase(): BootstrapResult {
  const allData: NewCountry[] = [
    ...top20Countries,
    ...extendedCountries,
    ...additionalCountries,
    ...worldCountries,
  ];

  // BP считается до записи — транзакция остаётся одной атомарной единицей.
  const rawData: CountryRawData[] = allData.map(seedRowToRawData);
  const bpResults = calculateAllCountriesBP(rawData);

  const sqlite = openDatabase();
  try {
    const db = drizzle(sqlite, { schema: { countries } });
    sqlite.exec(CREATE_COUNTRIES_SQL);
    const updateStmt = sqlite.prepare(UPDATE_BP_SQL);

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

    // Пакеты знаний (техника, досье, сражения…) — идемпотентны.
    const knowledge = seedKnowledge();
    const knowledgeExtra = seedKnowledgeExtra();

    writeSeedMeta(sqlite);

    return {
      countriesSeeded: allData.length,
      bpCalculated: bpResults.length,
      knowledge,
      knowledgeExtra,
      top10: bpResults.slice(0, 10).map((bp) => ({
        rank: bp.rank,
        iso: bp.isoCode,
        name: bp.name,
        totalBP: Number(bp.totalBP.toFixed(1)),
      })),
    };
  } finally {
    sqlite.close();
  }
}
