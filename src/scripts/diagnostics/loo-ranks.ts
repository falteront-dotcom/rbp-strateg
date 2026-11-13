// ─────────────────────────────────────────────────────────────────────────────
// Leave-one-component-out: насколько рейтинг зависит от каждого компонента.
//
// Для каждого из 10 компонентов БП3: обнулить его вес, перенормировать
// остальные, пересчитать рейтинг когорты и замерить сдвиг относительно
// полного рейтинга (Spearman, пересечение топ-20, максимальный сдвиг).
//
// Весовая неопределённость здесь ВЫКЛЮЧЕНА (weightConcentration: 0):
// изолируем вклад компонента, а не шум весов. Итерации 1500 — достаточно
// для устойчивых медиан при фиксированных весах.
//
// Запуск: npx tsx src/scripts/diagnostics/loo-ranks.ts
// Требует посеянную БД. Отчёт: docs/diagnostics/loo-ranks-<date>.md.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { getBP3Inputs } from "../../lib/v3-facade";
import {
  calculateCountryBP3,
  DEFAULT_WEIGHTS_BP3,
} from "../../lib/bp3/index";
import { BP3_COMPONENTS, type BP3Component, type WeightsBP3 } from "../../lib/bp3/types";

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

function rankByMedian(
  inputs: readonly { input: Parameters<typeof calculateCountryBP3>[0] }[],
  weights?: WeightsBP3,
): Map<string, number> {
  const results = inputs.map(({ input }) =>
    calculateCountryBP3(input, { iterations: 1500, weightConcentration: 0, weights }),
  );
  results.sort((a, b) => b.total.median - a.total.median);
  return new Map(results.map((r, idx) => [r.isoCode, idx + 1]));
}

function looWeights(component: BP3Component): WeightsBP3 {
  const rest = BP3_COMPONENTS.filter((c) => c !== component);
  const sum = rest.reduce((acc, c) => acc + DEFAULT_WEIGHTS_BP3[c], 0);
  const out = { ...DEFAULT_WEIGHTS_BP3 };
  out[component] = 0;
  for (const c of rest) out[c] = DEFAULT_WEIGHTS_BP3[c] / sum;
  return out;
}

function main(): void {
  const t0 = Date.now();
  const inputs = getBP3Inputs();
  const full = rankByMedian(inputs);
  const fullOrder = [...full.entries()].sort((a, b) => a[1] - b[1]).map(([iso]) => iso);
  const top20Full = new Set(fullOrder.slice(0, 20));

  const rows: { component: BP3Component; weight: number; rho: number; top20: number; maxShift: number; mover: string }[] = [];
  for (const component of BP3_COMPONENTS) {
    const loo = rankByMedian(inputs, looWeights(component));
    const isos = [...full.keys()];
    const rho = pearson(isos.map((i) => full.get(i) ?? 0), isos.map((i) => loo.get(i) ?? 0));
    const looOrder = [...loo.entries()].sort((a, b) => a[1] - b[1]).map(([iso]) => iso);
    const top20 = new Set(looOrder.slice(0, 20));
    const overlap = [...top20Full].filter((iso) => top20.has(iso)).length;
    let maxShift = 0;
    let mover = "—";
    for (const iso of isos) {
      const shift = Math.abs((full.get(iso) ?? 0) - (loo.get(iso) ?? 0));
      if (shift > maxShift) {
        maxShift = shift;
        mover = iso;
      }
    }
    rows.push({ component, weight: DEFAULT_WEIGHTS_BP3[component], rho, top20: overlap, maxShift, mover });
    console.log(`${component}: ρ=${rho.toFixed(3)}, топ-20 ${overlap}/20, макс. сдвиг ${maxShift} (${mover})`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Leave-one-component-out: зависимость рейтинга БП3 от компонентов (${date})`,
    "",
    `Когорта: ${inputs.length} стран. Метод: вес компонента = 0, остальные перенормированы;`,
    `рейтинг по медиане MC (1500 итераций, весовая неопределённость выключена —`,
    `изолируем вклад компонента). Полный рейтинг: весовая неопределённость включена`,
    `в публичном API, здесь выключена для чистоты сравнения.`,
    "",
    "| Компонент | Вес | Spearman ρ | Топ-20 пересечение | Макс. сдвиг (страна) |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) => `| ${r.component} | ${r.weight.toFixed(2)} | ${r.rho.toFixed(3)} | ${r.top20}/20 | ${r.maxShift} (${r.mover}) |`,
    ),
    "",
    "Чтение: низкий ρ / большое число сдвигов = рейтинг сильно зависит от компонента;",
    "высокий ρ = компонент почти не меняет порядок (кандидат на пересмотр веса).",
    "Это диагностика структуры модели, не оценка правильности весов.",
    "",
    `Время расчёта: ${((Date.now() - t0) / 1000).toFixed(0)} с.`,
  ];
  const outDir = path.resolve(process.cwd(), "docs/diagnostics");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `loo-ranks-${date}.md`);
  fs.writeFileSync(outFile, lines.join("\n") + "\n", "utf8");
  console.log(`Отчёт: ${outFile}`);
}

main();
