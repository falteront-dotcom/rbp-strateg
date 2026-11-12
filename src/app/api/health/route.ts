// ─────────────────────────────────────────────────────────────────────────────
// API /api/health — readiness: фактическое состояние данных против эталона.
//
// Эталон (_seed_meta) записывает сам сид в конце успешного сева (bootstrap.ts):
// числа не хранятся в коде, дрейф «ожидали одно — засеяли другое» невозможен.
// Роут пересчитывает строки по всем таблицам и сверяет с эталоном:
//   - расхождение по seed-only таблице → 503 (сломан или недосеян сид);
//   - countries проверяется мягко (150–250): POST /api/run-pipeline легитимно
//     заменяет состав стран в рантайме;
//   - пустой _seed_meta → 503 «сид не завершён» (самый реалистичный частичный отказ).
//
// Это НЕ healthCheckPath: внешний монитор (GitHub Actions keepalive) проверяет
// этот роут и поднимает алерт, а лайвнесс Render — /api/live.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";

export const dynamic = "force-dynamic";

type Row = { name: string; n: number };
type MetaRow = { key: string; value: number };

const COUNTRIES_MIN = 150;
const COUNTRIES_MAX = 250;

export function GET() {
  try {
    const db = openReadonlyDatabase();
    try {
      const meta = db
        .prepare("SELECT key, value FROM _seed_meta")
        .all() as MetaRow[];
      if (meta.length === 0) {
        return NextResponse.json(
          { ok: false, error: "сид не завершён: _seed_meta пуст" },
          { status: 503, headers: { "cache-control": "no-store" } },
        );
      }
      const expected = new Map(meta.map((r) => [r.key, r.value]));

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_seed_meta'",
        )
        .all() as { name: string }[];
      const actual = new Map<string, number>();
      let totalRows = 0;
      for (const t of tables) {
        const row = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get() as Row;
        actual.set(t.name, row.n);
        totalRows += row.n;
      }

      const mismatches: { table: string; expected: number; actual: number }[] = [];
      for (const [table, exp] of expected) {
        const act = actual.get(table);
        if (act === undefined) {
          mismatches.push({ table, expected: exp, actual: -1 });
          continue;
        }
        if (table === "countries") {
          if (act < COUNTRIES_MIN || act > COUNTRIES_MAX) {
            mismatches.push({ table, expected: exp, actual: act });
          }
          continue;
        }
        if (act !== exp) mismatches.push({ table, expected: exp, actual: act });
      }
      // таблица исчезла после сида — тоже расхождение
      for (const table of actual.keys()) {
        if (!expected.has(table)) {
          mismatches.push({ table, expected: -1, actual: actual.get(table) ?? 0 });
        }
      }

      if (mismatches.length > 0) {
        return NextResponse.json(
          { ok: false, error: "данные расходятся с эталоном сида", mismatches },
          { status: 503, headers: { "cache-control": "no-store" } },
        );
      }

      return NextResponse.json(
        {
          ok: true,
          tables: expected.size,
          rows: totalRows,
          countries: actual.get("countries") ?? 0,
        },
        { headers: { "cache-control": "no-store" } },
      );
    } finally {
      db.close();
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `база недоступна: ${String(err)}` },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
