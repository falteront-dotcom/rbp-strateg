// ─────────────────────────────────────────────────────────────────────────────
// BP Model 3.0 – Orchestrator (calculate-bp3)
// Волна 1 дорожной карты 3.0
//
// Собирает БП 3.0 страны из трёх слоёв:
//   1. Восемь компонентов bp-v2 — принимаются как входы с провенансом
//      (пересчёт ядра v2 не входит в Волну 1 и не дублируется здесь).
//   2. Компонент U (БПЛА) — считается из сырых данных: uav-potential.ts.
//   3. Компонент P (боеприпасы/производство) — munitions-potential.ts.
// Итог — не точка, а распределение: Монте-Карло по сигмам компонентов
// (uncertainty.ts) даёт медиану и P10/P90. Точечный итог сохраняется
// в результате для сверки и для торнадо-анализа (sensitivity.ts).
//
// Модель версионируется: результат несёт modelVersion = "bp-v3",
// bp-v2 заморожена и продолжает считаться своим ядром — A/B-сравнение
// версий делается сопоставлением CountryBP и CountryBP3Result.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CalculateBP3Options,
  ComponentInput,
  ComponentResultBP3,
  CountryBP3Input,
  CountryBP3Result,
  V2Component,
  WeightsBP3,
} from "./types";
import {
  BP3_COMPONENTS,
  DEFAULT_WEIGHTS_BP3,
  MODEL_VERSION_BP3,
  V2_COMPONENTS,
  validateWeightsBP3,
} from "./types";
import { scoreMunitions } from "./munitions-potential";
import { scoreUav } from "./uav-potential";
import type { ComponentDistributionInput, MonteCarloResult } from "./uncertainty";
import {
  componentSigma,
  countrySeed,
  runMonteCarlo,
} from "./uncertainty";

// ─── Константы расчёта ───────────────────────────────────────────────────────

/** Итерации Монте-Карло по умолчанию: баланс точности P10/P90 и скорости */
export const DEFAULT_MONTE_CARLO_ITERATIONS = 4000;

/** Базовый сид по умолчанию: фиксирован, расчёты воспроизводимы из коробки */
export const DEFAULT_BASE_SEED = 20261107;

// ─── Компоненты v2 как входы ─────────────────────────────────────────────────

/** Строит ComponentResultBP3 для унаследованного компонента v2 */
export function v2ComponentResult(
  component: V2Component,
  input: ComponentInput,
  weight: number,
): ComponentResultBP3 {
  const breakdown: Record<string, number> = {
    v2Score: input.score,
    sourceYear: input.year,
  };
  return {
    component,
    score: input.score,
    sigma: componentSigma(input.score, input.grade),
    weight,
    weightedScore: input.score * weight,
    breakdown,
    confidenceGrade: input.grade,
  };
}

// ─── Главный расчёт ──────────────────────────────────────────────────────────

/**
 * Рассчитывает БП 3.0 одной страны.
 *
 * @param input   - полные входы страны (v2-баллы + сырьё U и P)
 * @param options - веса, итерации Монте-Карло, базовый сид
 * @throws Error, если переопределённые веса не проходят валидацию
 */
export function calculateCountryBP3(
  input: CountryBP3Input,
  options: CalculateBP3Options = {},
): CountryBP3Result {
  const weights: WeightsBP3 = options.weights ?? DEFAULT_WEIGHTS_BP3;
  const validation: { valid: true } | { valid: false; errors: string[] } =
    validateWeightsBP3(weights);
  if (!validation.valid) {
    throw new Error(
      `Invalid BP3 weights: ${validation.errors.join("; ")}`,
    );
  }
  const iterations: number =
    options.iterations ?? DEFAULT_MONTE_CARLO_ITERATIONS;
  const baseSeed: number = options.baseSeed ?? DEFAULT_BASE_SEED;

  // Слой 1: компоненты v2 из входов.
  const v2Results: ComponentResultBP3[] = V2_COMPONENTS.map((comp) =>
    v2ComponentResult(comp, input.v2Scores[comp], weights[comp]),
  );

  // Слой 2 и 3: новые компоненты из сырого сырья.
  const uavResult: ComponentResultBP3 = scoreUav(input.uav, weights.uav);
  const munitionsResult: ComponentResultBP3 = scoreMunitions(
    input.munitions,
    weights.munitions,
  );

  const allResults: ComponentResultBP3[] = [
    ...v2Results,
    uavResult,
    munitionsResult,
  ];

  const components: Record<string, ComponentResultBP3> = {};
  for (const r of allResults) {
    components[r.component] = r;
  }
  const componentsTyped = components as Record<
    (typeof BP3_COMPONENTS)[number],
    ComponentResultBP3
  >;

  // Точечный итог — сумма взвешенных баллов.
  const pointEstimate: number = allResults.reduce(
    (acc, r) => acc + r.weightedScore,
    0,
  );

  // Неопределённость: Монте-Карло по сигмам компонентов.
  const distributionInputs: ComponentDistributionInput[] = allResults.map(
    (r) => ({
      component: r.component,
      median: r.score,
      sigma: r.sigma,
      weight: r.weight,
    }),
  );
  const seed: number = countrySeed(baseSeed, input.isoCode);
  const monteCarlo: MonteCarloResult = runMonteCarlo(
    distributionInputs,
    iterations,
    seed,
  );

  return {
    isoCode: input.isoCode,
    name: input.name,
    nameRu: input.nameRu,
    modelVersion: MODEL_VERSION_BP3,
    total: monteCarlo.summary,
    pointEstimate,
    components: componentsTyped,
    weightsUsed: weights,
    rank: null,
  };
}

/**
 * Рассчитывает БП 3.0 для когорты стран и присваивает ранги по медиане.
 * Порядок входа не важен; результат отсортирован по убыванию медианы.
 */
export function calculateAllBP3(
  inputs: readonly CountryBP3Input[],
  options: CalculateBP3Options = {},
): CountryBP3Result[] {
  const results: CountryBP3Result[] = inputs.map((input) =>
    calculateCountryBP3(input, options),
  );
  const sorted: CountryBP3Result[] = [...results].sort(
    (a, b) => b.total.median - a.total.median,
  );
  return sorted.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
}

/**
 * Быстрое A/B-сравнение версий: разница медианы БП 3.0 и точечного
 * балла, который страна получила бы только по v2-компонентам с их
 * исходными весами v2. Положительная разница — беспилотно-снарядный
 * слой усиливает страну относительно платформенной картины v2.
 */
export function deltaVsV2Only(result: CountryBP3Result): number {
  const v2Part: number = V2_COMPONENTS.reduce(
    (acc, comp) => acc + result.components[comp].weightedScore,
    0,
  );
  const v2WeightSum: number = V2_COMPONENTS.reduce(
    (acc, comp) => acc + result.weightsUsed[comp],
    0,
  );
  const v2OnlyScore: number = v2WeightSum > 0 ? v2Part / v2WeightSum : 0;
  return result.total.median - v2OnlyScore;
}
