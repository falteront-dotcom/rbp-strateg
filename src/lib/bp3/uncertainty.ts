// ─────────────────────────────────────────────────────────────────────────────
// BP Model 3.0 – Uncertainty (Монте-Карло)
// Волна 1 дорожной карты 3.0
//
// Зачем: bp-v2 отдавал точечное число 0–100, хотя значительная часть
// входов — оценки с разбросом в разы (производство FPV, запасы снарядов).
// Точечный балл в таких условиях — иллюзия точности (п. 4 критики 2.0).
//
// Метод: каждый компонент трактуется как случайная величина
//   score_i ~ TruncNormal(μ = точечный балл, σ = балл × σ_грейда, [0, 100]),
// где σ_грейда берётся из провенанса входов компонента (types.ts).
// Итог = Σ weight_i × score_i по итерациям; публикуем медиану и P10/P90.
//
// Воспроизводимость: RNG — mulberry32 на явном сиде. Никакого Math.random:
// один и тот же набор (входы, веса, сид) обязан давать один и тот же итог
// на любой машине — это требование верифицируемости разведпродукта.
// ─────────────────────────────────────────────────────────────────────────────

import type { BP3Component, UncertaintySummary } from "./types";
import { GRADE_RELATIVE_SIGMA, type ProvenanceGrade } from "./types";

// ─── Сидированный RNG ────────────────────────────────────────────────────────

/**
 * mulberry32 — быстрый детерминированный генератор псевдослучайных чисел
 * с периодом 2^32. Не криптографический; для Монте-Карло достаточен
 * и, главное, одинаково работает везде (нет зависимости от платформы).
 */
export function mulberry32(seed: number): () => number {
  let state: number = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t: number = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a хэш строки → uint32.
 * Используется, чтобы сид страны зависел от её isoCode: распределение
 * страны не «плывёт» при добавлении/удалении других стран из когорты.
 */
export function hashSeed(text: string): number {
  let hash: number = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Итоговый сид расчёта страны из базового сида и isoCode */
export function countrySeed(baseSeed: number, isoCode: string): number {
  return (baseSeed ^ hashSeed(isoCode)) >>> 0;
}

// ─── Нормальная выборка ──────────────────────────────────────────────────────

/**
 * Генератор нормально распределённых величин (Бокс–Мюллер)
 * поверх переданного равномерного RNG. Кэширует вторую величину пары.
 */
export function createNormalSampler(rng: () => number): () => number {
  let spare: number | null = null;
  return function nextNormal(): number {
    if (spare !== null) {
      const value: number = spare;
      spare = null;
      return value;
    }
    let u: number = 0;
    let v: number = 0;
    do {
      u = rng();
    } while (u <= Number.EPSILON);
    v = rng();
    const magnitude: number = Math.sqrt(-2.0 * Math.log(u));
    const angle: number = 2.0 * Math.PI * v;
    spare = magnitude * Math.sin(angle);
    return magnitude * Math.cos(angle);
  };
}

/** Усечённая нормальная выборка в границах шкалы балла [0, 100] */
export function sampleTruncatedScore(
  nextNormal: () => number,
  median: number,
  sigma: number,
): number {
  if (sigma <= 0) return median;
  const raw: number = median + nextNormal() * sigma;
  if (raw < 0) return 0;
  if (raw > 100) return 100;
  return raw;
}

// ─── Весовая неопределённость (Dirichlet) ─────────────────────────────────
//
// Веса БП — экспертные, не калиброванные по исходам (docs/weights-elicitation.md).
// Фиксировать их в Монте-Карло как константу — значит систематически занижать
// P10/P90: главный эпистемический риск (почему оружие 0.16, а не 0.20?)
// не попадает в интервал. Поэтому веса тянутся из Dirichlet(α_i = w_i × κ)
// на каждой итерации: сумма всегда 1, среднее равно экспертным весам,
// разброс задаётся концентрацией κ (дисперсия w_i(1−w_i)/(κ+1)).

/**
 * Гамма-выборка (Marsaglia–Tsang) поверх сидированного RNG.
 * Для α < 1 — буст: gamma(α) = gamma(α+1) × U^(1/α).
 */
export function createGammaSampler(
  rng: () => number,
  nextNormal: () => number,
): (alpha: number) => number {
  return function nextGamma(alpha: number): number {
    if (alpha <= 0) return 0;
    if (alpha < 1) {
      const u: number = Math.max(rng(), Number.EPSILON);
      return nextGamma(alpha + 1) * Math.pow(u, 1 / alpha);
    }
    const d: number = alpha - 1 / 3;
    const c: number = 1 / Math.sqrt(9 * d);
    for (;;) {
      const x: number = nextNormal();
      const v: number = Math.pow(1 + c * x, 3);
      if (v <= 0) continue;
      const u: number = Math.max(rng(), Number.EPSILON);
      if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) {
        return d * v;
      }
    }
  };
}

/**
 * Одна выборка весов из Dirichlet(α): нормированные гамма-величины.
 * Нулевые α дают нулевой вес (компонент выключен из итога).
 */
export function sampleDirichletWeights(
  nextGamma: (alpha: number) => number,
  alphas: readonly number[],
): number[] {
  const draws: number[] = alphas.map((a) => nextGamma(a));
  const sum: number = draws.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) return alphas.map(() => 0);
  return draws.map((v) => v / sum);
}

// ─── Статистика распределения ────────────────────────────────────────────────

/** Перцентиль по отсортированному массиву (линейная интерполяция) */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;
  const rank: number = (p / 100) * (sorted.length - 1);
  const low: number = Math.floor(rank);
  const high: number = Math.ceil(rank);
  const lowValue: number = sorted[low] ?? 0;
  if (low === high) return lowValue;
  const highValue: number = sorted[high] ?? lowValue;
  const fraction: number = rank - low;
  return lowValue + fraction * (highValue - lowValue);
}

/** Сводная статистика набора итераций Монте-Карло */
export interface SampleStatistics {
  median: number;
  mean: number;
  p10: number;
  p90: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

/** Считает статистику по сырым итерациям (не мутирует входной массив) */
export function summarizeSamples(samples: readonly number[]): SampleStatistics {
  const sorted: number[] = [...samples].sort((a, b) => a - b);
  const count: number = sorted.length;
  if (count === 0) {
    return {
      median: 0,
      mean: 0,
      p10: 0,
      p90: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      count: 0,
    };
  }
  const sum: number = sorted.reduce((acc, v) => acc + v, 0);
  const mean: number = sum / count;
  const variance: number =
    sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / count;
  return {
    median: percentile(sorted, 50),
    mean,
    p10: percentile(sorted, 10),
    p90: percentile(sorted, 90),
    stdDev: Math.sqrt(variance),
    min: sorted[0] ?? 0,
    max: sorted[count - 1] ?? 0,
    count,
  };
}

// ─── Монте-Карло итога ───────────────────────────────────────────────────────

/** Вход одного компонента для Монте-Карло */
export interface ComponentDistributionInput {
  component: BP3Component;
  /** Точечный балл компонента 0–100 */
  median: number;
  /** Абсолютная сигма балла (пункты шкалы) */
  sigma: number;
  /** Вес компонента */
  weight: number;
}

/** Сигма балла из точечной оценки и грейда провенанса */
export function sigmaFromGrade(score: number, grade: ProvenanceGrade): number {
  return Math.abs(score) * GRADE_RELATIVE_SIGMA[grade];
}

/**
 * Минимальная сигма балла: даже «твёрдый» вход не является истиной,
 * поэтому сигма не опускается ниже 1 пункта шкалы при ненулевом балле.
 */
export const MIN_COMPONENT_SIGMA = 1.0;

/** Сигма с применением пола MIN_COMPONENT_SIGMA */
export function componentSigma(score: number, grade: ProvenanceGrade): number {
  if (score <= 0) return 0;
  return Math.max(sigmaFromGrade(score, grade), MIN_COMPONENT_SIGMA);
}

/** Результат Монте-Карло: сводка + сырые итерации для диагностики */
export interface MonteCarloResult {
  summary: UncertaintySummary;
  samples: number[];
}

/** Опции Монте-Карло */
export interface MonteCarloOptions {
  /**
   * Концентрация Dirichlet для весов (κ). 0/undefined — веса-константы
   * (старое поведение). κ > 0 — веса тянутся на каждой итерации;
   * дисперсия веса w(1−w)/(κ+1). Рекомендация по умолчанию — 100.
   */
  weightConcentration?: number;
}

/**
 * Прогон Монте-Карло по компонентам страны.
 *
 * @param inputs     - компоненты с медианой, сигмой и весом
 * @param iterations - число итераций (рекомендуется 2000–10000)
 * @param seed       - сид RNG (см. countrySeed)
 * @param options    - весовая неопределённость (Dirichlet), см. MonteCarloOptions
 */
export function runMonteCarlo(
  inputs: readonly ComponentDistributionInput[],
  iterations: number,
  seed: number,
  options: MonteCarloOptions = {},
): MonteCarloResult {
  const safeIterations: number = Math.max(1, Math.floor(iterations));
  const rng: () => number = mulberry32(seed);
  const nextNormal: () => number = createNormalSampler(rng);
  const samples: number[] = new Array<number>(safeIterations);

  const concentration: number = options.weightConcentration ?? 0;
  const drawWeights: boolean = concentration > 0;
  const alphas: number[] = drawWeights
    ? inputs.map((input) => input.weight * concentration)
    : [];
  const nextGamma: (alpha: number) => number = createGammaSampler(rng, nextNormal);

  for (let i = 0; i < safeIterations; i++) {
    const weights: number[] | null = drawWeights
      ? sampleDirichletWeights(nextGamma, alphas)
      : null;
    let total: number = 0;
    for (let j = 0; j < inputs.length; j++) {
      const input: ComponentDistributionInput = inputs[j]!;
      const drawn: number = sampleTruncatedScore(
        nextNormal,
        input.median,
        input.sigma,
      );
      total += drawn * (weights ? weights[j]! : input.weight);
    }
    samples[i] = total;
  }

  const stats: SampleStatistics = summarizeSamples(samples);
  const summary: UncertaintySummary = {
    median: stats.median,
    mean: stats.mean,
    p10: stats.p10,
    p90: stats.p90,
    stdDev: stats.stdDev,
    iterations: safeIterations,
    seed,
  };
  return { summary, samples };
}

/**
 * Человекочитаемая запись неопределённости для сводок:
 * «62 (P10–P90: 54–70)». Округление — только в представлении,
 * внутри модели значения не округляются.
 */
export function formatUncertainty(summary: UncertaintySummary): string {
  const median: string = summary.median.toFixed(0);
  const p10: string = summary.p10.toFixed(0);
  const p90: string = summary.p90.toFixed(0);
  return `${median} (P10–P90: ${p10}–${p90})`;
}

/** Ширина интервала P90−P10 — простая мера «насколько мы не знаем» */
export function intervalWidth(summary: UncertaintySummary): number {
  return summary.p90 - summary.p10;
}
