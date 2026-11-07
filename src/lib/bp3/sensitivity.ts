// ─────────────────────────────────────────────────────────────────────────────
// BP Model 3.0 – Sensitivity (анализ чувствительности, торнадо)
// Волна 1 дорожной карты 3.0 (закрывает п. 2 критики 2.0)
//
// Веса БП — экспертные. Честный ответ на вопрос «почему оружие 16%, а не
// 20%?» — не «потому что так решили», а число: насколько итог страны
// сдвинется, если вес изменить, и какой компонент реально двигает балл.
// Этот модуль даёт три взгляда:
//   1. Вклад в дисперсию: доля дисперсии итога от каждого компонента
//      (weight² × sigma²) — что создаёт неопределённость балла.
//   2. OAT-торнадо: сдвиг итога при уходе компонента на свои P10/P90 —
//      классическая торнадо-диаграмма «что двигает балл страны».
//   3. Пертурбация весов: итог при весе компонента ±20% (с перенормировкой
//      остальных) — прямой ответ критику весовой схемы.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  BP3Component,
  ComponentResultBP3,
  CountryBP3Result,
  WeightsBP3,
} from "./types";
import { BP3_COMPONENT_LABELS_RU, BP3_COMPONENTS } from "./types";

// ─── Торнадо ─────────────────────────────────────────────────────────────────

/** Одна строка торнадо-анализа по компоненту */
export interface TornadoEntry {
  component: BP3Component;
  /** Название компонента для отображения */
  labelRu: string;
  /** Вес компонента в расчёте */
  weight: number;
  /** Точечный балл компонента */
  score: number;
  /** Сигма компонента (пункты шкалы) */
  sigma: number;
  /** Доля дисперсии итога, создаваемая компонентом (0–1) */
  varianceShare: number;
  /** Итог БП, если компонент уходит на свой P10 (балл − 1.2816σ) */
  oatLowTotal: number;
  /** Итог БП, если компонент уходит на свой P90 (балл + 1.2816σ) */
  oatHighTotal: number;
  /** Размах торнадо: oatHighTotal − oatLowTotal */
  oatSwing: number;
  /** Итог при весе компонента +20% (остальные перенормированы) */
  weightPlusTotal: number;
  /** Итог при весе компонента −20% (остальные перенормированы) */
  weightMinusTotal: number;
}

/** Полный отчёт чувствительности по стране */
export interface SensitivityReport {
  isoCode: string;
  /** Точечный итог, от которого считаются все сдвиги */
  baseTotal: number;
  /** Строки, отсортированные по убыванию oatSwing (торнадо-порядок) */
  entries: TornadoEntry[];
  /** Компонент с максимальным вкладом в дисперсию итога */
  topVarianceDriver: BP3Component;
  /** Компонент с максимальным OAT-размахом */
  topSwingDriver: BP3Component;
  /** Суммарная дисперсия итога по компонентам (без ковариаций) */
  totalVariance: number;
}

/** Z-квантиль для P10/P90 нормального распределения */
export const Z_P10_P90 = 1.2816;

/** Балл, зажатый в шкалу 0–100 */
function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * Перенормировка весов при изменении одного веса:
 * остальные веса масштабируются пропорционально, сумма остаётся 1.0.
 */
export function renormalizeWeights(
  weights: WeightsBP3,
  component: BP3Component,
  newWeight: number,
): WeightsBP3 {
  const others: BP3Component[] = BP3_COMPONENTS.filter(
    (c) => c !== component,
  );
  const othersSum: number = others.reduce((acc, c) => acc + weights[c], 0);
  const targetOthersSum: number = 1 - newWeight;
  const result: WeightsBP3 = { ...weights };
  result[component] = newWeight;
  if (othersSum <= 0) {
    const each: number = targetOthersSum / others.length;
    for (const c of others) {
      result[c] = each;
    }
    return result;
  }
  const factor: number = targetOthersSum / othersSum;
  for (const c of others) {
    result[c] = weights[c] * factor;
  }
  return result;
}

/** Точечный итог по компонентам и произвольным весам */
export function totalWithWeights(
  components: Record<BP3Component, ComponentResultBP3>,
  weights: WeightsBP3,
): number {
  let total: number = 0;
  for (const comp of BP3_COMPONENTS) {
    total += components[comp].score * weights[comp];
  }
  return total;
}

/**
 * Полный анализ чувствительности результата БП 3.0.
 * Чистая функция от CountryBP3Result: не пересчитывает компоненты,
 * работает с уже посчитанными баллами, сигмами и весами.
 */
export function analyzeSensitivity(
  result: CountryBP3Result,
): SensitivityReport {
  const components: Record<BP3Component, ComponentResultBP3> =
    result.components;
  const weights: WeightsBP3 = result.weightsUsed;
  const baseTotal: number = result.pointEstimate;

  // Суммарная дисперсия итога (компоненты считаем независимыми;
  // корреляция входов — известное ограничение, см. п. 6 критики 2.0,
  // её учёт — задача калибровочного этапа Волны 1).
  let totalVariance: number = 0;
  for (const comp of BP3_COMPONENTS) {
    const c: ComponentResultBP3 = components[comp];
    totalVariance += c.weight * c.weight * c.sigma * c.sigma;
  }

  const entries: TornadoEntry[] = BP3_COMPONENTS.map((comp) => {
    const c: ComponentResultBP3 = components[comp];
    const variance: number = c.weight * c.weight * c.sigma * c.sigma;
    const varianceShare: number =
      totalVariance > 0 ? variance / totalVariance : 0;

    const lowScore: number = clampScore(c.score - Z_P10_P90 * c.sigma);
    const highScore: number = clampScore(c.score + Z_P10_P90 * c.sigma);
    const oatLowTotal: number = baseTotal + (lowScore - c.score) * c.weight;
    const oatHighTotal: number = baseTotal + (highScore - c.score) * c.weight;

    const plusWeights: WeightsBP3 = renormalizeWeights(
      weights,
      comp,
      Math.min(c.weight * 1.2, 0.95),
    );
    const minusWeights: WeightsBP3 = renormalizeWeights(
      weights,
      comp,
      c.weight * 0.8,
    );

    return {
      component: comp,
      labelRu: BP3_COMPONENT_LABELS_RU[comp],
      weight: c.weight,
      score: c.score,
      sigma: c.sigma,
      varianceShare,
      oatLowTotal,
      oatHighTotal,
      oatSwing: oatHighTotal - oatLowTotal,
      weightPlusTotal: totalWithWeights(components, plusWeights),
      weightMinusTotal: totalWithWeights(components, minusWeights),
    };
  });

  const bySwing: TornadoEntry[] = [...entries].sort(
    (a, b) => b.oatSwing - a.oatSwing,
  );
  const byVariance: TornadoEntry[] = [...entries].sort(
    (a, b) => b.varianceShare - a.varianceShare,
  );

  const topSwing: TornadoEntry | undefined = bySwing[0];
  const topVariance: TornadoEntry | undefined = byVariance[0];

  return {
    isoCode: result.isoCode,
    baseTotal,
    entries: bySwing,
    topVarianceDriver: topVariance?.component ?? "weapon",
    topSwingDriver: topSwing?.component ?? "weapon",
    totalVariance,
  };
}

/**
 * Короткий текстовый вывод для сводок: «балл страны двигают прежде
 * всего БПЛА (±3.2) и боеприпасы (±2.7); неопределённость итога на 41%
 * создаёт компонент БПЛА — там самые слабые данные».
 */
export function summarizeSensitivityRu(report: SensitivityReport): string {
  const top: TornadoEntry[] = report.entries.slice(0, 2);
  const parts: string[] = top.map(
    (e) => `${e.labelRu} (±${(e.oatSwing / 2).toFixed(1)})`,
  );
  const varianceLeader: TornadoEntry | undefined = report.entries.find(
    (e) => e.component === report.topVarianceDriver,
  );
  const varianceText: string =
    varianceLeader !== undefined
      ? ` Неопределённость итога на ${(varianceLeader.varianceShare * 100).toFixed(0)}% создаёт компонент «${varianceLeader.labelRu}».`
      : "";
  return `Балл страны двигают прежде всего: ${parts.join(" и ")}.${varianceText}`;
}
