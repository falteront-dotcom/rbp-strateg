// ─────────────────────────────────────────────────────────────────────────────
// verify-v3-api.mjs — smoke-проверка фасада API v3 (src/lib/v3-facade.ts)
//
// Запуск: node verify-v3-api.mjs
//
// Что делает:
//   1. Компилирует граф фасада (bp3/intel/warfare3/data3/data4/data5/
//      monitor/brief + db) в CJS через tsc (module nodenext), outDir —
//      временный каталог в os.tmpdir().
//   2. Подменяет require("@/db/*") на относительные пути в выдаче tsc
//      (tsc не переписывает алиасы путей).
//   3. Ставит smoke-шим better-sqlite3 поверх node:sqlite: у настоящего
//      модуля в песочнице нет нативного биндинга; шим повторяет ровно тот
//      API, что использует src/db/runtime (prepare/all/get/close).
//   4. Создаёт тестовую sqlite.db: страны топ-30 с bp_* из входов bp3
//      (TOP30_BP3_INPUTS.v2Scores) + Исландия вне топ-30 (нулевая линия U/P).
//   5. Вызывает getBP3Ranking / getBP3Detail(USA, ISL) / getAlertsFeed /
//      getSystemsList / getIWBoard и печатает счётчики и примеры.
//
// В проде (Next.js) фасад работает с настоящим better-sqlite3 и боевой БД;
// шим и тестовая база существуют только внутри этой проверки.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const workRoot = path.join(tmpdir(), "v3smoke-verify");
const outDir = path.join(workRoot, "out");
const dbDir = path.join(workRoot, "work");

rmSync(workRoot, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(dbDir, { recursive: true });

// ─── 1. Компиляция фасада в CJS ───────────────────────────────────────────────

const buildConfig = {
  compilerOptions: {
    target: "ES2022",
    lib: ["esnext"],
    strict: true,
    noEmit: false,
    declaration: false,
    sourceMap: false,
    esModuleInterop: true,
    skipLibCheck: true,
    module: "nodenext",
    moduleResolution: "nodenext",
    forceConsistentCasingInFileNames: true,
    outDir,
    rootDir: path.join(repoRoot, "src"),
    baseUrl: repoRoot,
    paths: { "@/*": ["src/*"] },
    types: [],
  },
  files: [path.join(repoRoot, "src/lib/v3-facade.ts")],
};
const buildConfigPath = path.join(workRoot, "tsconfig.build.json");
writeFileSync(buildConfigPath, JSON.stringify(buildConfig, null, 2));
execFileSync(
  process.execPath,
  [path.join(repoRoot, "node_modules/typescript/bin/tsc"), "-p", buildConfigPath],
  { stdio: "inherit" },
);
console.log("[verify-v3] tsc compile: OK");

// ─── 2. Переписывание алиасов @/ в выдаче ─────────────────────────────────────

const facadeJsPath = path.join(outDir, "lib/v3-facade.js");
const facadeJs = readFileSync(facadeJsPath, "utf8")
  .replaceAll('require("@/db/runtime")', 'require("../db/runtime")')
  .replaceAll('require("@/db/country-mapper")', 'require("../db/country-mapper")');
writeFileSync(facadeJsPath, facadeJs);

// ─── 3. Шим better-sqlite3 поверх node:sqlite ────────────────────────────────

const shimDir = path.join(outDir, "node_modules/better-sqlite3");
mkdirSync(shimDir, { recursive: true });
writeFileSync(
  path.join(shimDir, "package.json"),
  JSON.stringify({ name: "better-sqlite3", version: "0.0.0-smoke", main: "index.js" }),
);
writeFileSync(
  path.join(shimDir, "index.js"),
  `
const { DatabaseSync } = require("node:sqlite");
class Statement {
  constructor(stmt) { this.stmt = stmt; }
  all(...p) { return this.stmt.all(...p); }
  get(...p) { return this.stmt.get(...p); }
  run(...p) { return this.stmt.run(...p); }
}
class Database {
  constructor(filePath, options = {}) {
    this.inner = new DatabaseSync(filePath, { open: true, readOnly: Boolean(options && options.readonly) });
  }
  prepare(sql) { return new Statement(this.inner.prepare(sql)); }
  exec(sql) { return this.inner.exec(sql); }
  pragma(sql) { return this.inner.exec("PRAGMA " + sql); }
  close() { this.inner.close(); }
}
module.exports = Database;
module.exports.default = Database;
`,
);

// ─── 4. Тестовая БД: топ-30 из входов bp3 + Исландия вне топ-30 ──────────────

const { TOP30_BP3_INPUTS } = await import(
  path.join(outDir, "lib/bp3/data/top30-uav-munitions.js")
);

const CREATE_COUNTRIES_SQL = `
  CREATE TABLE countries (
    iso_code TEXT PRIMARY KEY, name TEXT NOT NULL, name_ru TEXT NOT NULL,
    side TEXT NOT NULL, coalition TEXT,
    area_km2 INTEGER NOT NULL, coastline_km INTEGER NOT NULL,
    climate_zone TEXT NOT NULL, gdp_ppp_bn REAL NOT NULL,
    military_budget_bn REAL NOT NULL, defense_pct_gdp REAL NOT NULL,
    population_m REAL NOT NULL, active_personnel INTEGER NOT NULL,
    reserve_personnel INTEGER NOT NULL, fit_for_service_m REAL NOT NULL,
    total_tanks INTEGER NOT NULL, total_afv INTEGER NOT NULL,
    total_artillery INTEGER NOT NULL, total_mlrs INTEGER NOT NULL,
    total_aircraft INTEGER NOT NULL, total_helicopters INTEGER NOT NULL,
    total_navy INTEGER NOT NULL, submarines INTEGER NOT NULL,
    aircraft_carriers INTEGER NOT NULL, nuclear_warheads INTEGER DEFAULT 0,
    ports INTEGER NOT NULL, airfields INTEGER NOT NULL,
    oil_production_kbd INTEGER NOT NULL, merchant_fleet INTEGER NOT NULL,
    tech_level INTEGER NOT NULL, morale_index INTEGER NOT NULL,
    combat_experience INTEGER NOT NULL, c2_capability INTEGER NOT NULL,
    ew_capability INTEGER NOT NULL,
    bp_total REAL DEFAULT 0, bp_weapon REAL DEFAULT 0,
    bp_manpower REAL DEFAULT 0, bp_logistics REAL DEFAULT 0,
    bp_c2 REAL DEFAULT 0, bp_economy REAL DEFAULT 0,
    bp_doctrine REAL DEFAULT 0, bp_readiness REAL DEFAULT 0,
    bp_terrain REAL DEFAULT 0, updated_at TEXT NOT NULL
  );
`;

const dbPath = path.join(dbDir, "sqlite.db");
const seedDb = new DatabaseSync(dbPath);
seedDb.exec(CREATE_COUNTRIES_SQL);
const insert = seedDb.prepare(`
  INSERT INTO countries (
    iso_code, name, name_ru, side, coalition, area_km2, coastline_km,
    climate_zone, gdp_ppp_bn, military_budget_bn, defense_pct_gdp,
    population_m, active_personnel, reserve_personnel, fit_for_service_m,
    total_tanks, total_afv, total_artillery, total_mlrs, total_aircraft,
    total_helicopters, total_navy, submarines, aircraft_carriers,
    nuclear_warheads, ports, airfields, oil_production_kbd, merchant_fleet,
    tech_level, morale_index, combat_experience, c2_capability,
    ew_capability, bp_total, bp_weapon, bp_manpower, bp_logistics, bp_c2,
    bp_economy, bp_doctrine, bp_readiness, bp_terrain, updated_at
  ) VALUES (?, ?, ?, 'NEUTRAL', NULL, 100000, 1000, 'temperate', 1000, 10, 1.5,
    50, 200000, 100000, 10, 500, 1000, 300, 50, 200, 150, 20, 0, 0, 0, 5, 10,
    100, 50, 7, 60, 50, 60, 55, ?, ?, ?, ?, ?, ?, ?, ?, ?, '2026-11-07')
`);

function insertCountry(iso, name, nameRu, scores) {
  const total =
    (scores.weapon + scores.manpower + scores.logistics + scores.c2 +
      scores.economy + scores.doctrine + scores.readiness + scores.terrain) / 8;
  insert.run(
    iso, name, nameRu, total,
    scores.weapon, scores.manpower, scores.logistics, scores.c2,
    scores.economy, scores.doctrine, scores.readiness, scores.terrain,
  );
}

for (const input of TOP30_BP3_INPUTS) {
  const scores = {};
  for (const [key, comp] of Object.entries(input.v2Scores)) {
    scores[key] = comp.score;
  }
  insertCountry(input.isoCode, input.name, input.nameRu, scores);
}
// Страна вне топ-30: проверяет нулевую базовую линию U/P (hasUP=false).
insertCountry("ISL", "Iceland", "Исландия", {
  weapon: 5, manpower: 10, logistics: 30, c2: 45,
  economy: 55, doctrine: 20, readiness: 25, terrain: 40,
});
seedDb.close();
console.log(`[verify-v3] test DB seeded: ${TOP30_BP3_INPUTS.length + 1} countries`);

// ─── 5. Вызовы фасада ─────────────────────────────────────────────────────────
// DB_PATH в src/db/runtime считается от process.cwd() при загрузке модуля,
// поэтому сначала переходим в каталог с тестовой БД.

process.chdir(dbDir);
const facade = await import(path.join(outDir, "lib/v3-facade.js"));

const ranking = facade.getBP3Ranking();
console.log(`[verify-v3] ranking length: ${ranking.length}`);
console.log(
  "[verify-v3] top-3:",
  ranking.slice(0, 3).map((r) => `${r.iso} ${r.total} (P10 ${r.p10} / P90 ${r.p90}, Δv2 ${r.deltaV2}, hasUP ${r.hasUP})`).join(" | "),
);
const sortedDesc = ranking.every((r, i) => i === 0 || ranking[i - 1].total >= r.total);
console.log(`[verify-v3] ranking sorted desc: ${sortedDesc}`);

const alerts = facade.getAlertsFeed();
console.log(`[verify-v3] alerts count: ${alerts.length}`);
if (alerts.length > 0) {
  console.log(`[verify-v3] first alert: ${alerts[0].iso3} [${alerts[0].level}] ${alerts[0].titleRu}`);
}

const systems = facade.getSystemsList();
console.log(`[verify-v3] systems count: ${systems.length}`);
const airdef = facade.getSystemsList("patriot", "airdef");
console.log(`[verify-v3] systems q='patriot' class='airdef': ${airdef.length} → ${airdef.map((s) => s.id).join(", ")}`);

const board = facade.getIWBoard();
console.log(`[verify-v3] IW board: ${board.totalIndicators} indicators in ${board.categories.length} categories`);

const usa = facade.getBP3Detail("USA");
console.log("[verify-v3] detail USA:");
console.log(`  row: ${usa.row.iso} ${usa.row.name} total=${usa.row.total} p10=${usa.row.p10} p90=${usa.row.p90} deltaV2=${usa.row.deltaV2} hasUP=${usa.row.hasUP}`);
console.log(`  components: ${usa.row.components.map((c) => `${c.key}=${c.score}`).join(" ")}`);
console.log(`  tornado (${usa.tornado.length}): ${usa.tornado.slice(0, 3).map((t) => `${t.label} [${t.low}..${t.high}] swing ${t.swing}`).join(" | ")}`);
console.log(`  sustainability: ${usa.sustainability ? `present (iso3=${usa.sustainability.iso3})` : "null"}`);
console.log(`  series: ${Array.isArray(usa.series) ? `${usa.series.length} snapshots (${usa.series.map((s) => s.year).join(",")})` : "null"}`);
console.log(`  briefText: ${usa.briefText ? `${usa.briefText.length} chars, starts: ${JSON.stringify(usa.briefText.slice(0, 110))}` : "null"}`);
console.log(`  profile: ${usa.profile ? "present" : "null"}`);
console.log(`  detail JSON-serializable: ${typeof JSON.stringify(usa) === "string"}`);

const isl = facade.getBP3Detail("ISL");
console.log(`[verify-v3] detail ISL (no U/P data): hasUP=${isl.row.hasUP} total=${isl.row.total} profile=${isl.profile ? "present (data5)" : "null"} series=${isl.series ? "present" : "null"}`);
console.log(`[verify-v3] detail XXX (unknown): ${facade.getBP3Detail("XXX")}`);

const failures = [];
if (ranking.length !== TOP30_BP3_INPUTS.length + 1) failures.push("ranking length mismatch");
if (!sortedDesc) failures.push("ranking not sorted");
if (systems.length !== 220) failures.push("systems != 220");
if (board.totalIndicators !== 340) failures.push("IW indicators != 340");
if (!usa || usa.row.total <= 0) failures.push("USA detail broken");
if (!isl || isl.row.hasUP !== false) failures.push("ISL zero-baseline broken");

if (failures.length > 0) {
  console.error(`[verify-v3] FAILURES: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("[verify-v3] ALL CHECKS PASS");
