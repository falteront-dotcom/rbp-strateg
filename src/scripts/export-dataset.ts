// ─────────────────────────────────────────────────────────────────────────────
// CLI экспорта датасет-снапшота: текущая БД → коммитный JSON.
//
// Запуск: npx tsx src/scripts/export-dataset.ts
// Пишет src/db/seed/generated/dataset-snapshot.json (см. snapshot-loader.ts —
// зачем нужен мост «pipeline → коммитные данные» на Render free).
//
// Требует посеянную/обновлённую БД (npm run db:seed или refresh-dataset):
// без таблицы countries/_seed_meta падает явно, тихо пустой снапшот не пишет.
// Экспорт самопроверяется parseDatasetSnapshot перед записью — файл на диске
// всегда валиден для загрузчика.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { openDatabase } from "../db/runtime";
import type { RawCountryRow } from "../db/country-mapper";
import {
  defaultSnapshotPath,
  parseDatasetSnapshot,
  type DatasetSnapshot,
} from "../db/seed/snapshot-loader";

/**
 * Выгружает countries + _seed_meta из открытого соединения в объект снапшота.
 * Строки сортируются по iso_code — стабильный git-diff между прогонами.
 */
export function buildDatasetSnapshot(db: Database.Database): DatasetSnapshot {
  const rows = db
    .prepare("SELECT * FROM countries ORDER BY iso_code")
    .all() as RawCountryRow[];

  let seedMetaRows: { key: string; value: number }[];
  try {
    seedMetaRows = db.prepare("SELECT key, value FROM _seed_meta").all() as {
      key: string;
      value: number;
    }[];
  } catch (err) {
    throw new Error(
      `таблица _seed_meta недоступна (${err instanceof Error ? err.message : err}); ` +
        "сначала полный сид: npm run db:seed",
    );
  }
  const seedMeta: Record<string, number> = {};
  for (const row of seedMetaRows) seedMeta[row.key] = row.value;

  // Самопроверка: экспорт обязан проходить ту же валидацию, что и загрузка.
  return parseDatasetSnapshot({
    version: 1,
    exportedAt: new Date().toISOString(),
    seedMeta,
    countries: rows,
  });
}

/** Собирает снапшот и записывает его в файл (создаёт каталог при необходимости). */
export function exportDatasetSnapshot(
  db: Database.Database,
  outPath: string = defaultSnapshotPath(),
): DatasetSnapshot {
  const snapshot = buildDatasetSnapshot(db);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  return snapshot;
}

/** Открывает каноническую БД (cwd/sqlite.db) и экспортирует снапшот в файл. */
export function exportDatasetSnapshotToFile(outPath = defaultSnapshotPath()): DatasetSnapshot {
  const db = openDatabase();
  try {
    return exportDatasetSnapshot(db, outPath);
  } finally {
    db.close();
  }
}

function main(): void {
  const outPath = defaultSnapshotPath();
  console.log("📤 Экспорт датасет-снапшота...");
  const snapshot = exportDatasetSnapshotToFile(outPath);
  console.log(`✅ Записано ${snapshot.countries.length} стран → ${outPath}`);
  console.log(`   Формат v${snapshot.version}, экспортировано: ${snapshot.exportedAt}`);
  console.log(`   seedMeta: ${JSON.stringify(snapshot.seedMeta)}`);
}

// Запуск только из CLI (tsx src/scripts/export-dataset.ts), не при import
// из тестов: argv-проверка работает и под tsx, и под Playwright-лоадером.
const invokedAsScript = process.argv[1]?.replace(/\\/g, "/").includes("scripts/export-dataset");
if (invokedAsScript) {
  try {
    main();
  } catch (err) {
    console.error("❌ Экспорт снапшота не удался:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
