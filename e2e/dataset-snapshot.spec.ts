// ─────────────────────────────────────────────────────────────────────────────
// Датасет-снапшоты: мост «живой pipeline → коммитные данные» (Render free).
//
// Контракты:
// 1. Round-trip: канонический сид → БД → экспорт → загрузчик → вторая БД;
//    строки идентичны (включая bp_*).
// 2. Невалидный снапшот отвергается явно (SnapshotValidationError), без
//    тихого фолбэка.
// 3. Дефолтный bootstrap не меняется: без RBP_SEED_SNAPSHOT сервер сеет
//    канонические 195 стран; коммитный снапшот в репо валиден.
// 4. RBP_SEED_SNAPSHOT=on: init-db сеет из снапшота; битый снапшот валит
//    сид явной ошибкой.
//
// Временные БД — в os.tmpdir(), не в репо. Спека не запускает браузер:
// только чистые функции, better-sqlite3 и HTTP к локальному серверу.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { countries } from '../src/db/schema';
import type { NewCountry } from '../src/db/schema';
import { top20Countries } from '../src/db/seed/top20-countries';
import { extendedCountries } from '../src/db/seed/extended-countries';
import { additionalCountries } from '../src/db/seed/additional-countries';
import { worldCountries } from '../src/db/seed/world-countries';
import { calculateAllCountriesBP } from '../src/lib/bp';
import type { CountryRawData } from '../src/lib/bp/types';
import {
  parseDatasetSnapshot,
  readDatasetSnapshot,
  seedCountriesFromSnapshot,
  SnapshotValidationError,
  SNAPSHOT_MIN_COUNTRIES,
  type DatasetSnapshot,
} from '../src/db/seed/snapshot-loader';
import type { RawCountryRow } from '../src/db/country-mapper';
import { exportDatasetSnapshot } from '../src/scripts/export-dataset';

const CANONICAL_COUNT = 195;

function tmpDbPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rbp-snapshot-'));
  return path.join(dir, name);
}

/** Канонические строки стран (TS-сиды + БП тем же движком, что bootstrap). */
function buildCanonicalDb(dbPath: string): void {
  const sqlite = new Database(dbPath);
  try {
    sqlite.exec(`
      CREATE TABLE countries (
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
    sqlite.exec('CREATE TABLE _seed_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
    sqlite.prepare('INSERT INTO _seed_meta (key, value) VALUES (?, ?)').run('countries', CANONICAL_COUNT);

    const allData: NewCountry[] = [
      ...top20Countries,
      ...extendedCountries,
      ...additionalCountries,
      ...worldCountries,
    ];
    const drizzleDb = drizzle(sqlite, { schema: { countries } });
    sqlite.transaction(() => {
      drizzleDb.insert(countries).values(allData).run();
      const bpResults = calculateAllCountriesBP(
        allData.map((c: NewCountry): CountryRawData => ({
          isoCode: c.isoCode, name: c.name, nameRu: c.nameRu,
          side: c.side as CountryRawData['side'], coalition: c.coalition ?? null,
          areaKm2: c.areaKm2, coastlineKm: c.coastlineKm, climateZone: c.climateZone,
          gdpPppBn: c.gdpPppBn, militaryBudgetBn: c.militaryBudgetBn,
          defensePctGdp: c.defensePctGdp, populationM: c.populationM,
          activePersonnel: c.activePersonnel, reservePersonnel: c.reservePersonnel,
          fitForServiceM: c.fitForServiceM, totalTanks: c.totalTanks,
          totalAfv: c.totalAfv, totalArtillery: c.totalArtillery,
          totalMlrs: c.totalMlrs, totalAircraft: c.totalAircraft,
          totalHelicopters: c.totalHelicopters, totalNavy: c.totalNavy,
          submarines: c.submarines, aircraftCarriers: c.aircraftCarriers,
          nuclearWarheads: c.nuclearWarheads ?? 0, ports: c.ports,
          airfields: c.airfields, oilProductionKbd: c.oilProductionKbd,
          merchantFleet: c.merchantFleet, techLevel: c.techLevel,
          moraleIndex: c.moraleIndex, combatExperience: c.combatExperience,
          c2Capability: c.c2Capability, ewCapability: c.ewCapability,
          updatedAt: c.updatedAt,
        })),
      );
      for (const bp of bpResults) {
        drizzleDb.update(countries)
          .set({
            bpTotal: bp.totalBP,
            bpWeapon: bp.components.weapon.normalizedValue,
            bpManpower: bp.components.manpower.normalizedValue,
            bpLogistics: bp.components.logistics.normalizedValue,
            bpC2: bp.components.c2.normalizedValue,
            bpEconomy: bp.components.economy.normalizedValue,
            bpDoctrine: bp.components.doctrine.normalizedValue,
            bpReadiness: bp.components.readiness.normalizedValue,
            bpTerrain: bp.components.terrain.normalizedValue,
          })
          .where(eq(countries.isoCode, bp.isoCode))
          .run();
      }
    })();
  } finally {
    sqlite.close();
  }
}

/** Полные строки БД для побайтового сравнения round-trip. */
function readAllRows(dbPath: string): RawCountryRow[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare('SELECT * FROM countries ORDER BY iso_code').all() as RawCountryRow[];
  } finally {
    db.close();
  }
}

test.describe('dataset snapshot round-trip', () => {
  test('экспорт канонической БД → загрузка во временную БД → строки совпадают', () => {
    const sourcePath = tmpDbPath('source.db');
    const targetPath = tmpDbPath('target.db');
    const snapshotPath = tmpDbPath('dataset-snapshot.json');

    buildCanonicalDb(sourcePath);

    // Экспорт из живого соединения (тот же путь, что export-dataset CLI).
    const sourceDb = new Database(sourcePath);
    let snapshot: DatasetSnapshot;
    try {
      snapshot = exportDatasetSnapshot(sourceDb, snapshotPath);
    } finally {
      sourceDb.close();
    }

    expect(snapshot.countries).toHaveLength(CANONICAL_COUNT);
    expect(snapshot.seedMeta['countries']).toBe(CANONICAL_COUNT);
    // Файл на диске валиден для загрузчика (self-check экспорта).
    const fromDisk = readDatasetSnapshot(snapshotPath);
    expect(fromDisk.countries).toHaveLength(CANONICAL_COUNT);

    // Загрузка в чистую БД тем же примитивом, что bootstrap.
    const targetDb = new Database(targetPath);
    try {
      const seeded = seedCountriesFromSnapshot(targetDb, fromDisk);
      expect(seeded.countriesSeeded).toBe(CANONICAL_COUNT);
      expect(seeded.top10[0].iso).toBe('USA');
    } finally {
      targetDb.close();
    }

    const sourceRows = readAllRows(sourcePath);
    const targetRows = readAllRows(targetPath);
    expect(targetRows).toEqual(sourceRows);
    // Выборочная сверка значений БП (не только структура).
    const usa = targetRows.find((r) => r.iso_code === 'USA');
    expect(usa?.bp_total).toBeGreaterThan(90);
  });
});

test.describe('invalid snapshot rejected (fail loud)', () => {
  const validRow = {
    iso_code: 'ABW', name: 'Aruba', name_ru: 'Аруба', side: 'NEUTRAL', coalition: null,
    area_km2: 180, coastline_km: 69, climate_zone: 'Tropical', gdp_ppp_bn: 4,
    military_budget_bn: 0.1, defense_pct_gdp: 0.5, population_m: 0.1,
    active_personnel: 0, reserve_personnel: 0, fit_for_service_m: 0.05,
    total_tanks: 0, total_afv: 0, total_artillery: 0, total_mlrs: 0,
    total_aircraft: 0, total_helicopters: 0, total_navy: 0, submarines: 0,
    aircraft_carriers: 0, nuclear_warheads: null, ports: 1, airfields: 1,
    oil_production_kbd: 0, merchant_fleet: 0, tech_level: 5, morale_index: 5,
    combat_experience: 0, c2_capability: 3, ew_capability: 3,
    bp_total: 1, bp_weapon: 1, bp_manpower: 1, bp_logistics: 1, bp_c2: 1,
    bp_economy: 1, bp_doctrine: 1, bp_readiness: 1, bp_terrain: 1,
    updated_at: '2026-01-01',
  };

  function rows(n: number, mutate?: (row: Record<string, unknown>) => void): unknown[] {
    // Уникальные валидные iso-коды вида AAA..ZZZ (26*26*26 > 250).
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const out: unknown[] = [];
    for (let i = 0; i < n; i++) {
      const code = letters[Math.floor(i / 676) % 26] + letters[Math.floor(i / 26) % 26] + letters[i % 26];
      const row = { ...validRow, iso_code: code };
      mutate?.(row);
      out.push(row);
    }
    return out;
  }

  test('битый JSON отвергается', () => {
    const p = tmpDbPath('broken.json');
    fs.writeFileSync(p, '{not json', 'utf8');
    expect(() => readDatasetSnapshot(p)).toThrow(SnapshotValidationError);
    expect(() => readDatasetSnapshot(p)).toThrow(/битый JSON/);
  });

  test('отсутствующий файл отвергается', () => {
    expect(() => readDatasetSnapshot(path.join(os.tmpdir(), 'no-such-snapshot.json')))
      .toThrow(SnapshotValidationError);
  });

  test('структурные дефекты отвергаются', () => {
    expect(() => parseDatasetSnapshot(null)).toThrow(SnapshotValidationError);
    expect(() => parseDatasetSnapshot({ version: 99, exportedAt: 'x', seedMeta: {}, countries: [] }))
      .toThrow(/version/);
    expect(() => parseDatasetSnapshot({ version: 1, exportedAt: 'x', seedMeta: { a: 'b' }, countries: rows(180) }))
      .toThrow(/seedMeta/);
    expect(() => parseDatasetSnapshot({ version: 1, exportedAt: 'x', seedMeta: {}, countries: 'no-array' }))
      .toThrow(/countries/);
  });

  test(`число стран вне окна (<${SNAPSHOT_MIN_COUNTRIES}) отвергается`, () => {
    expect(() => parseDatasetSnapshot({ version: 1, exportedAt: 'x', seedMeta: {}, countries: rows(100) }))
      .toThrow(/150–250/);
    expect(() => parseDatasetSnapshot({ version: 1, exportedAt: 'x', seedMeta: {}, countries: rows(251) }))
      .toThrow(/150–250/);
  });

  test('строка с дефектными полями отвергается', () => {
    expect(() => parseDatasetSnapshot({
      version: 1, exportedAt: 'x', seedMeta: {},
      countries: rows(180, (row) => { row.side = 'ALIEN'; }),
    })).toThrow(/side/);
    expect(() => parseDatasetSnapshot({
      version: 1, exportedAt: 'x', seedMeta: {},
      countries: rows(180, (row) => { row.total_tanks = 'many'; }),
    })).toThrow(/total_tanks/);
    expect(() => parseDatasetSnapshot({
      version: 1, exportedAt: 'x', seedMeta: {},
      countries: rows(180, (row) => { delete row.updated_at; }),
    })).toThrow(/updated_at/);
    // Дубликат ISO — тоже ошибка валидации.
    const dup = rows(180);
    (dup[1] as Record<string, unknown>).iso_code = (dup[0] as Record<string, unknown>).iso_code;
    expect(() => parseDatasetSnapshot({ version: 1, exportedAt: 'x', seedMeta: {}, countries: dup }))
      .toThrow(SnapshotValidationError);
  });

  test('валидный снапшот достаточного размера принимается', () => {
    const snap = parseDatasetSnapshot({ version: 1, exportedAt: '2026-01-01T00:00:00Z', seedMeta: { countries: 180 }, countries: rows(180) });
    expect(snap.countries).toHaveLength(180);
  });
});

test.describe('default bootstrap unchanged (canonical fixture contract)', () => {
  test('коммитный снапшот в репо валиден и содержит 195 стран', () => {
    const snapshot = readDatasetSnapshot();
    expect(snapshot.countries).toHaveLength(CANONICAL_COUNT);
    const iso = new Set(snapshot.countries.map((c) => c.iso_code));
    expect(iso.has('USA')).toBe(true);
    expect(iso.has('RUS')).toBe(true);
  });

  test('без RBP_SEED_SNAPSHOT сервер сеет канонические 195 стран', async ({ request }) => {
    // Сервер e2e стартует без RBP_SEED_SNAPSHOT (webServer-env его не задаёт):
    // дефолт обязан оставаться на TS-сидах — это контракт остальных спек.
    expect(process.env.RBP_SEED_SNAPSHOT ?? 'off').not.toBe('on');
    const r = await request.get('/api/countries');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.length).toBe(CANONICAL_COUNT);
    const usa = body.find((c: { isoCode: string }) => c.isoCode === 'USA');
    expect(usa).toBeTruthy();
  });
});

test.describe('RBP_SEED_SNAPSHOT=on (opt-in ветка bootstrap)', () => {
  // init-db — тонкая обёртка над initializeDatabase: прогон через subprocess
  // проверяет env-ветку целиком, включая явный отказ на битом снапшоте.
  // shell: true — на Windows npx живёт в npx.cmd и без shell не резолвится.
  function runInitDb(extraEnv: Record<string, string>) {
    return spawnSync('npx tsx src/scripts/init-db.ts', {
      shell: true,
      encoding: 'utf8',
      env: { ...process.env, ...extraEnv },
      timeout: 120_000,
    });
  }

  test('валидный снапшот → сид из снапшота, 195 стран', () => {
    test.setTimeout(150_000);
    const res = runInitDb({ RBP_SEED_SNAPSHOT: 'on' });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Inserted 195 countries');
  });

  test('битый снапшот → явная ошибка сида, без тихого фолбэка', () => {
    test.setTimeout(150_000);
    const badPath = tmpDbPath('invalid-snapshot.json');
    fs.writeFileSync(badPath, JSON.stringify({ version: 1, exportedAt: 'x', seedMeta: {}, countries: [] }), 'utf8');
    const res = runInitDb({ RBP_SEED_SNAPSHOT: 'on', RBP_SNAPSHOT_PATH: badPath });
    expect(res.status).not.toBe(0);
    const output = `${res.stdout}${res.stderr}`;
    expect(output).toContain('dataset-snapshot');
    expect(output).not.toContain('Inserted');
  });
});
