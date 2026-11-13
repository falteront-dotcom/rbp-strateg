// ─────────────────────────────────────────────────────────────────────────────
// Загрузчик датасет-снапшотов: мост «живой pipeline → коммитные данные».
//
// На Render free БД эфемерная: прод-данные восстанавливаются из коммитных
// сидов при каждом старте. Живой pipeline (refreshDatasetFromSources) умеет
// обновлять только БД раннера. Снапшот закрывает разрыв: pipeline обновляет
// БД → export-dataset.ts выгружает её в JSON → этот загрузчик сеет страны
// из JSON тем же путём, что и TS-сиды (полная замена таблицы в транзакции).
//
// Потребление снапшота — СТРОГО opt-in (RBP_SEED_SNAPSHOT=on): канонический
// фикстур e2e (195 стран, конкретные значения USA и т.д.) опирается на TS-сиды,
// и тихое переключение источника сломало бы эти контракты. При включённом
// флаге невалидный/отсутствующий снапшот — явная ошибка, НЕ тихий фолбэк
// на TS-сиды: оператор включил снапшот осознанно, молчаливый откат подал бы
// устаревшие данные под видом свежих.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import type { RawCountryRow } from "../country-mapper";
import { ensureCountriesTable } from "../countries-ddl";
import { validateCountryDataset } from "@/lib/dataset/validation";

/** Версия формата снапшота. Изменение структуры — bump + правка валидации. */
export const SNAPSHOT_FORMAT_VERSION = 1;

/** Допустимое окно числа стран: канонический сид = 195. */
export const SNAPSHOT_MIN_COUNTRIES = 150;
export const SNAPSHOT_MAX_COUNTRIES = 250;

/** Строковые колонки (кроме nullable coalition). */
const STRING_COLUMNS = [
  "iso_code", "name", "name_ru", "side", "climate_zone", "updated_at",
] as const;

/** Обязательные числовые колонки (NOT NULL в schema.ts). */
const NUMBER_COLUMNS = [
  "area_km2", "coastline_km", "gdp_ppp_bn", "military_budget_bn",
  "defense_pct_gdp", "population_m", "active_personnel", "reserve_personnel",
  "fit_for_service_m", "total_tanks", "total_afv", "total_artillery",
  "total_mlrs", "total_aircraft", "total_helicopters", "total_navy",
  "submarines", "aircraft_carriers", "ports", "airfields",
  "oil_production_kbd", "merchant_fleet", "tech_level", "morale_index",
  "combat_experience", "c2_capability", "ew_capability",
] as const;

/** Числовые колонки, допускающие null (DEFAULT 0 / вычисляемые БП). */
const NULLABLE_NUMBER_COLUMNS = [
  "nuclear_warheads", "bp_total", "bp_weapon", "bp_manpower", "bp_logistics",
  "bp_c2", "bp_economy", "bp_doctrine", "bp_readiness", "bp_terrain",
] as const;

const VALID_SIDES = new Set(["NATO", "RUS", "CHINA", "UKR", "NEUTRAL"]);

export interface DatasetSnapshot {
  /** Версия формата (SNAPSHOT_FORMAT_VERSION). */
  version: number;
  /** ISO-время экспорта. */
  exportedAt: string;
  /** Содержимое _seed_meta на момент экспорта (ключ → COUNT строк таблицы). */
  seedMeta: Record<string, number>;
  /** Полные строки таблицы countries, отсортированы по iso_code. */
  countries: RawCountryRow[];
}

/**
 * Ошибка валидации/чтения снапшота. Всегда явная: вызывающий код (bootstrap)
 * при RBP_SEED_SNAPSHOT=on обязан упасть, а не откатиться на TS-сиды.
 */
export class SnapshotValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`[dataset-snapshot] снапшот невалиден: ${issues.join("; ")}`);
    this.name = "SnapshotValidationError";
    this.issues = issues;
  }
}

/** Путь к снапшоту: env-переопределение (тесты/кастом) или канонический в репо. */
export function defaultSnapshotPath(): string {
  return (
    process.env.RBP_SNAPSHOT_PATH ??
    path.resolve(process.cwd(), "src/db/seed/generated/dataset-snapshot.json")
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Строгая валидация структуры: формат, окно числа стран (150–250),
 * обязательные поля каждой строки, enum side, формат ISO-кода,
 * дубликаты и поколоночная проверка через validateCountryDataset.
 * Любая проблема → SnapshotValidationError.
 */
export function parseDatasetSnapshot(raw: unknown): DatasetSnapshot {
  const issues: string[] = [];

  if (!isPlainObject(raw)) {
    throw new SnapshotValidationError(["корень снапшота — не объект"]);
  }
  if (raw.version !== SNAPSHOT_FORMAT_VERSION) {
    issues.push(
      `version: ожидалась ${SNAPSHOT_FORMAT_VERSION}, получена ${JSON.stringify(raw.version)}`,
    );
  }
  if (typeof raw.exportedAt !== "string" || raw.exportedAt.length === 0) {
    issues.push("exportedAt: обязательная непустая строка (ISO-время экспорта)");
  }
  if (!isPlainObject(raw.seedMeta)) {
    issues.push("seedMeta: обязательный объект {таблица: COUNT}");
  } else {
    for (const [key, value] of Object.entries(raw.seedMeta)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push(`seedMeta["${key}"]: ожидается конечное число`);
      }
    }
  }

  if (!Array.isArray(raw.countries)) {
    issues.push("countries: ожидается массив строк таблицы countries");
    throw new SnapshotValidationError(issues);
  }
  if (raw.countries.length < SNAPSHOT_MIN_COUNTRIES || raw.countries.length > SNAPSHOT_MAX_COUNTRIES) {
    issues.push(
      `countries: ${raw.countries.length} стран вне допустимого окна ` +
        `${SNAPSHOT_MIN_COUNTRIES}–${SNAPSHOT_MAX_COUNTRIES} (канонический сид = 195)`,
    );
  }

  const seenIso = new Set<string>();
  const rows: RawCountryRow[] = [];
  raw.countries.forEach((row, index) => {
    const where = `countries[${index}]`;
    if (!isPlainObject(row)) {
      issues.push(`${where}: не объект`);
      return;
    }
    for (const col of STRING_COLUMNS) {
      if (typeof row[col] !== "string" || (row[col] as string).trim().length === 0) {
        issues.push(`${where}.${col}: обязательная непустая строка`);
      }
    }
    if (typeof row.iso_code === "string" && !/^[A-Z]{3}$/.test(row.iso_code)) {
      issues.push(`${where}.iso_code: "${row.iso_code}" не соответствует формату [A-Z]{3}`);
    }
    if (typeof row.iso_code === "string") {
      if (seenIso.has(row.iso_code)) {
        issues.push(`${where}.iso_code: дубликат ${row.iso_code}`);
      }
      seenIso.add(row.iso_code);
    }
    if (typeof row.side === "string" && !VALID_SIDES.has(row.side)) {
      issues.push(`${where}.side: "${row.side}" вне enum NATO|RUS|CHINA|UKR|NEUTRAL`);
    }
    if (row.coalition !== undefined && row.coalition !== null && typeof row.coalition !== "string") {
      issues.push(`${where}.coalition: ожидается строка или null`);
    }
    for (const col of NUMBER_COLUMNS) {
      if (typeof row[col] !== "number" || !Number.isFinite(row[col])) {
        issues.push(`${where}.${col}: обязательное конечное число`);
      }
    }
    for (const col of NULLABLE_NUMBER_COLUMNS) {
      const v = row[col];
      if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) {
        issues.push(`${where}.${col}: конечное число или null`);
      }
    }
    rows.push(row as unknown as RawCountryRow);
  });

  // Поколоночная сверка на уровне датасета (диапазоны БП, NaN и т.п.).
  const validation = validateCountryDataset(rows, { minimumRows: 1 });
  for (const issue of validation.errors) {
    issues.push(`${issue.isoCode ?? "dataset"}.${issue.field ?? ""}: ${issue.message}`);
  }

  if (issues.length > 0) {
    throw new SnapshotValidationError(issues.slice(0, 25));
  }

  return {
    version: raw.version as number,
    exportedAt: raw.exportedAt as string,
    seedMeta: raw.seedMeta as Record<string, number>,
    countries: rows,
  };
}

/** Читает и валидирует снапшот с диска. Отсутствие/битый JSON — явная ошибка. */
export function readDatasetSnapshot(filePath = defaultSnapshotPath()): DatasetSnapshot {
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new SnapshotValidationError([
      `не читается ${filePath}: ${err instanceof Error ? err.message : err}`,
    ]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new SnapshotValidationError([
      `битый JSON в ${filePath}: ${err instanceof Error ? err.message : err}`,
    ]);
  }
  return parseDatasetSnapshot(parsed);
}

/** True, если оператор включил сид из снапшота (env-флаг opt-in). */
export function snapshotSeedingEnabled(): boolean {
  return process.env.RBP_SEED_SNAPSHOT === "on";
}

const INSERT_SNAPSHOT_ROW_SQL = `
INSERT INTO countries (
  iso_code, name, name_ru, side, coalition, area_km2, coastline_km, climate_zone,
  gdp_ppp_bn, military_budget_bn, defense_pct_gdp, population_m, active_personnel,
  reserve_personnel, fit_for_service_m, total_tanks, total_afv, total_artillery,
  total_mlrs, total_aircraft, total_helicopters, total_navy, submarines,
  aircraft_carriers, nuclear_warheads, ports, airfields, oil_production_kbd,
  merchant_fleet, tech_level, morale_index, combat_experience, c2_capability,
  ew_capability, bp_total, bp_weapon, bp_manpower, bp_logistics, bp_c2,
  bp_economy, bp_doctrine, bp_readiness, bp_terrain, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)`;

/**
 * Сеет страны из снапшота тем же путём, что TS-сиды: полная замена таблицы
 * countries одной транзакцией. Строки пишутся как есть (включая bp_*),
 * поэтому числа на проде идентичны вычисленным раннером pipeline.
 * Снапшот обязан быть провалидирован заранее (readDatasetSnapshot/parse).
 */
export function seedCountriesFromSnapshot(
  db: Database.Database,
  snapshot: DatasetSnapshot,
): { countriesSeeded: number; top10: { rank: number; iso: string; name: string; totalBP: number }[] } {
  ensureCountriesTable(db);
  const insert = db.prepare(INSERT_SNAPSHOT_ROW_SQL);
  db.transaction(() => {
    db.prepare("DELETE FROM countries").run();
    for (const row of snapshot.countries) {
      insert.run(
        row.iso_code, row.name, row.name_ru, row.side, row.coalition,
        row.area_km2, row.coastline_km, row.climate_zone, row.gdp_ppp_bn,
        row.military_budget_bn, row.defense_pct_gdp, row.population_m,
        row.active_personnel, row.reserve_personnel, row.fit_for_service_m,
        row.total_tanks, row.total_afv, row.total_artillery, row.total_mlrs,
        row.total_aircraft, row.total_helicopters, row.total_navy,
        row.submarines, row.aircraft_carriers, row.nuclear_warheads,
        row.ports, row.airfields, row.oil_production_kbd, row.merchant_fleet,
        row.tech_level, row.morale_index, row.combat_experience,
        row.c2_capability, row.ew_capability, row.bp_total, row.bp_weapon,
        row.bp_manpower, row.bp_logistics, row.bp_c2, row.bp_economy,
        row.bp_doctrine, row.bp_readiness, row.bp_terrain, row.updated_at,
      );
    }
  })();
  const top10 = [...snapshot.countries]
    .sort((a, b) => (b.bp_total ?? 0) - (a.bp_total ?? 0))
    .slice(0, 10)
    .map((row, i) => ({
      rank: i + 1,
      iso: row.iso_code,
      name: row.name,
      totalBP: Number((row.bp_total ?? 0).toFixed(1)),
    }));
  return { countriesSeeded: snapshot.countries.length, top10 };
}
