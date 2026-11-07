// ─────────────────────────────────────────────────────────────────────────────
// verify_bp3.ts — самопроверка модели БП 3.0 (Волна 1 дорожной карты 3.0)
//
// Запуск: npx tsx verify_bp3.ts   (или любой TS-раннер проекта)
//
// Проверяет:
//   1. Расчёт БП 3.0 для USA / RUS / CHN / UKR из набора топ-30.
//   2. Инвариант неопределённости: P10 ≤ медиана ≤ P90 у каждой страны.
//   3. Инвариант весов: DEFAULT_WEIGHTS_BP3 валидны и суммируются в 1.0.
//   4. Монотонность: удвоение производства FPV у Украины не снижает
//      ни балл компонента U, ни медиану итога БП 3.0.
//   5. Воспроизводимость: повторный расчёт с тем же сидом даёт
//      побитово тот же результат.
//   6. Торнадо: анализ чувствительности строится, доли дисперсии
//      в сумме дают 1.0 (±ε).
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_WEIGHTS_BP3,
  TOP30_BP3_INPUTS,
  analyzeSensitivity,
  calculateAllBP3,
  calculateCountryBP3,
  findTop30Input,
  formatUncertainty,
  summarizeSensitivityRu,
  validateWeightsBP3,
} from "./src/lib/bp3/index";
import type {
  CountryBP3Input,
  CountryBP3Result,
  SensitivityReport,
} from "./src/lib/bp3/index";

// ─── Мини-assert без зависимости от node:assert ──────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
}

function assertClose(
  actual: number,
  expected: number,
  epsilon: number,
  message: string,
): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(
      `ASSERT FAILED: ${message} (actual=${actual}, expected=${expected}, eps=${epsilon})`,
    );
  }
}

// ─── Тест 1: веса ────────────────────────────────────────────────────────────

function testWeights(): void {
  const validation: { valid: true } | { valid: false; errors: string[] } =
    validateWeightsBP3(DEFAULT_WEIGHTS_BP3);
  assert(validation.valid, "DEFAULT_WEIGHTS_BP3 must be valid");
  const sum: number = Object.values(DEFAULT_WEIGHTS_BP3).reduce(
    (acc, w) => acc + w,
    0,
  );
  assertClose(sum, 1.0, 1e-9, "BP3 weights must sum to 1.0");
  console.log("✅ Weights: сумма = 1.0, валидация пройдена");
}

// ─── Тест 2: расчёт четырёх стран и инвариант интервала ─────────────────────

const FOCUS_ISO: string[] = ["USA", "RUS", "CHN", "UKR"];

function testFocusCountries(): CountryBP3Result[] {
  const inputs: CountryBP3Input[] = [];
  for (const iso of FOCUS_ISO) {
    const input: CountryBP3Input | undefined = findTop30Input(iso);
    assert(input !== undefined, `Input for ${iso} must exist in TOP30`);
    if (input !== undefined) {
      inputs.push(input);
    }
  }
  const results: CountryBP3Result[] = calculateAllBP3(inputs, {
    iterations: 4000,
  });
  assert(results.length === 4, "Must produce exactly 4 results");

  console.log("\n📊 БП 3.0 — фокусные страны (медиана, P10–P90):");
  for (const result of results) {
    const total = result.total;
    assert(
      total.p10 <= total.median && total.median <= total.p90,
      `${result.isoCode}: P10 ≤ median ≤ P90 violated ` +
        `(${total.p10} / ${total.median} / ${total.p90})`,
    );
    assert(
      total.median > 0 && total.median <= 100,
      `${result.isoCode}: median out of scale`,
    );
    const uavScore: number = result.components.uav.score;
    const munScore: number = result.components.munitions.score;
    console.log(
      `  #${result.rank} ${result.isoCode} ${result.nameRu}: ` +
        `БП3 = ${formatUncertainty(total)}; ` +
        `точка = ${result.pointEstimate.toFixed(1)}; ` +
        `U (БПЛА) = ${uavScore.toFixed(1)}; ` +
        `P (боеприпасы) = ${munScore.toFixed(1)}`,
    );
  }
  console.log("✅ Focus countries: P10 ≤ медиана ≤ P90 у всех");
  return results;
}

// ─── Тест 3: монотонность по производству БПЛА ──────────────────────────────

function testMonotonicity(): void {
  const ukr: CountryBP3Input | undefined = findTop30Input("UKR");
  assert(ukr !== undefined, "UKR input must exist");
  if (ukr === undefined) return;

  const base: CountryBP3Result = calculateCountryBP3(ukr, {
    iterations: 2000,
  });

  const boosted: CountryBP3Input = {
    ...ukr,
    uav: {
      ...ukr.uav,
      fpvProductionPerMonth: {
        ...ukr.uav.fpvProductionPerMonth,
        value: ukr.uav.fpvProductionPerMonth.value * 2,
      },
    },
  };
  const boostedResult: CountryBP3Result = calculateCountryBP3(boosted, {
    iterations: 2000,
  });

  assert(
    boostedResult.components.uav.score > base.components.uav.score,
    "Doubling FPV production must increase U score " +
      `(${base.components.uav.score} → ${boostedResult.components.uav.score})`,
  );
  assert(
    boostedResult.total.median >= base.total.median,
    "Doubling FPV production must not decrease BP3 median " +
      `(${base.total.median} → ${boostedResult.total.median})`,
  );
  console.log(
    "✅ Monotonicity: FPV ×2 у UKR: " +
      `U ${base.components.uav.score.toFixed(1)} → ` +
      `${boostedResult.components.uav.score.toFixed(1)}; ` +
      `медиана БП3 ${base.total.median.toFixed(1)} → ` +
      `${boostedResult.total.median.toFixed(1)}`,
  );
}

// ─── Тест 4: воспроизводимость по сиду ───────────────────────────────────────

function testReproducibility(): void {
  const usa: CountryBP3Input | undefined = findTop30Input("USA");
  assert(usa !== undefined, "USA input must exist");
  if (usa === undefined) return;
  const first: CountryBP3Result = calculateCountryBP3(usa, {
    iterations: 1500,
  });
  const second: CountryBP3Result = calculateCountryBP3(usa, {
    iterations: 1500,
  });
  assert(
    first.total.median === second.total.median &&
      first.total.p10 === second.total.p10 &&
      first.total.p90 === second.total.p90,
    "Same seed must reproduce identical Monte Carlo summary",
  );
  console.log("✅ Reproducibility: повторный расчёт побитово совпал");
}

// ─── Тест 5: торнадо ─────────────────────────────────────────────────────────

function testSensitivity(results: CountryBP3Result[]): void {
  for (const result of results) {
    const report: SensitivityReport = analyzeSensitivity(result);
    assert(
      report.entries.length === 10,
      `${result.isoCode}: tornado must have 10 entries`,
    );
    const shareSum: number = report.entries.reduce(
      (acc, e) => acc + e.varianceShare,
      0,
    );
    assertClose(
      shareSum,
      1.0,
      1e-6,
      `${result.isoCode}: variance shares must sum to 1`,
    );
    for (let i = 1; i < report.entries.length; i++) {
      const prev = report.entries[i - 1];
      const curr = report.entries[i];
      assert(
        prev !== undefined && curr !== undefined && prev.oatSwing >= curr.oatSwing,
        `${result.isoCode}: tornado entries must be sorted by swing desc`,
      );
    }
  }
  const first: CountryBP3Result | undefined = results[0];
  if (first !== undefined) {
    const report: SensitivityReport = analyzeSensitivity(first);
    console.log(`✅ Sensitivity: ${summarizeSensitivityRu(report)}`);
  }
}

// ─── Тест 6: полнота набора топ-30 ───────────────────────────────────────────

function testDatasetCompleteness(): void {
  assert(
    TOP30_BP3_INPUTS.length === 30,
    `TOP30 must contain 30 countries, got ${TOP30_BP3_INPUTS.length}`,
  );
  const seen: Set<string> = new Set<string>();
  for (const input of TOP30_BP3_INPUTS) {
    assert(!seen.has(input.isoCode), `Duplicate isoCode ${input.isoCode}`);
    seen.add(input.isoCode);
    assert(
      input.uav.fpvProductionPerMonth.year >= 2024,
      `${input.isoCode}: UAV data vintage too old`,
    );
    assert(
      input.munitions.artilleryShellStockThousands.source.length > 0,
      `${input.isoCode}: shell stock must carry a source`,
    );
  }
  console.log("✅ Dataset: 30 стран, без дублей ISO, провенанс на месте");
}

// ─── Прогон ──────────────────────────────────────────────────────────────────

function main(): void {
  console.log("🚀 BP 3.0 self-check (Волна 1, bp-v3)\n");
  testWeights();
  const results: CountryBP3Result[] = testFocusCountries();
  testMonotonicity();
  testReproducibility();
  testSensitivity(results);
  testDatasetCompleteness();
  console.log("\n✨ ВСЕ ПРОВЕРКИ БП 3.0 ПРОЙДЕНЫ ✨");
}

main();
