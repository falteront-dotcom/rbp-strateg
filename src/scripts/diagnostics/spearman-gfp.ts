// ─────────────────────────────────────────────────────────────────────────────
// Spearman-диагностика: рейтинг БП 3.0 vs GFP 2025.
//
// Назначение — ДИАГНОСТИКА, не калибровка (docs/weights-elicitation.md):
// ищем аномальные расхождения рангов — вопрос либо к данным страны, либо
// к весах. GFP — чужой композит с закрытыми весами, подгонять наши веса
// к его рангам циркулярно (эксперт-1 пузыря 2026-11-13).
//
// Запуск: npx tsx src/scripts/diagnostics/spearman-gfp.ts
// Требует посеянную БД (npm run db:seed). Отчёт: docs/diagnostics/.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { getBP3Ranking } from "../../lib/v3-facade";
import { GFP_RANKINGS_2025 } from "../data-pipeline/scrape-gfp";

/** Корреляция Пирсона на рангах = Спирмен (устойчива к связкам). */
function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const mx = xs.reduce((a, v) => a + v, 0) / n;
  const my = ys.reduce((a, v) => a + v, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  return vx > 0 && vy > 0 ? cov / Math.sqrt(vx * vy) : NaN;
}

function main(): void {
  const ranking = getBP3Ranking();
  const bpRank = new Map<string, number>();
  ranking.forEach((row, idx) => bpRank.set(row.iso, idx + 1));

  const pairs: { iso: string; name: string; bp: number; gfp: number; d: number }[] = [];
  for (const g of GFP_RANKINGS_2025) {
    const bp = bpRank.get(g.iso3);
    if (bp === undefined) continue;
    pairs.push({ iso: g.iso3, name: g.name, bp, gfp: g.rank, d: bp - g.rank });
  }

  const rho = pearson(pairs.map((p) => p.bp), pairs.map((p) => p.gfp));
  const top20Bp = new Set(ranking.slice(0, 20).map((r) => r.iso));
  const top20Gfp = new Set(
    [...GFP_RANKINGS_2025].sort((a, b) => a.rank - b.rank).slice(0, 20).map((g) => g.iso3),
  );
  const overlap = [...top20Bp].filter((iso) => top20Gfp.has(iso)).length;
  const anomalies = [...pairs].sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 15);

  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Spearman-диагностика: БП 3.0 vs GFP 2025 (${date})`,
    "",
    `Покрытие: ${pairs.length} стран из ${ranking.length} в рейтинге БП и ${GFP_RANKINGS_2025.length} в снапшоте GFP.`,
    `Источник GFP: коммитный снапшот GFP_RANKINGS_2025 (globalfirepower.com/countries-listing.php, 2025).`,
    "",
    `**Spearman ρ = ${rho.toFixed(3)}** (корреляция рангов; 1 — полное совпадение порядка).`,
    `Пересечение топ-20: ${overlap}/20.`,
    "",
    "Это диагностика, не калибровка: расхождения — повод проверить данные страны",
    "или обсудить веса, а не подгонять веса к GFP (циркулярность, см.",
    "docs/weights-elicitation.md). GFP исключает ядерное оружие и ранжирует",
    "не все страны модели — часть расхождений предметная, не ошибка.",
    "",
    "## Крупнейшие расхождения рангов (БП − GFP)",
    "",
    "| ISO | Страна | Ранг БП | Ранг GFP | Δ |",
    "|---|---|---|---|---|",
    ...anomalies.map(
      (a) => `| ${a.iso} | ${a.name} | ${a.bp} | ${a.gfp} | ${a.d > 0 ? "+" : ""}${a.d} |`,
    ),
    "",
    `Метод: Пирсон на рангах (эквивалент Спирмена), ранг БП — позиция по медиане`,
    `Монте-Карло с весовой неопределённостью (Dirichlet κ=100).`,
  ];

  const outDir = path.resolve(process.cwd(), "docs/diagnostics");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `spearman-gfp-${date}.md`);
  fs.writeFileSync(outFile, lines.join("\n") + "\n", "utf8");
  console.log(`Spearman ρ = ${rho.toFixed(3)}, n = ${pairs.length}, топ-20 пересечение ${overlap}/20`);
  console.log(`Отчёт: ${outFile}`);
}

main();
