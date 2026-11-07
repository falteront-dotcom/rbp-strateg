// ─────────────────────────────────────────────────────────────────────────────
// BP Model 3.0 – Component U: БПЛА и роботизированные системы
// Волна 1 дорожной карты 3.0 (закрывает п. 1 критики 2.0)
//
// Война 2022–2026 гг. изменила экономику поля боя: FPV-дрон за сотни
// долларов уничтожает технику за миллионы, барражирующие боеприпасы
// стали средством стратегического давления, а ISR-контур «спутник →
// БПЛА → огневое средство» определяет темп поражения. Модель bp-v2
// этого слоя не видела вообще: в W считались только классические
// платформы. Компонент U вводит беспилотный слой как отдельный фактор.
//
// Формула U (подбаллы 0–100, веса внутри компонента):
//   U = ISR×0.20 + Strike×0.20 + Loitering×0.15 + FPV×0.25 + Support×0.20
// где Support — среднее спутникового и РЭБ-сопровождения (рубрики 1–10).
// Самый большой внутрикомпонентный вес у FPV-производства: парк можно
// потерять за месяцы, производственный темп определяет устойчивость.
//
// Нормализация — лог-шкала в стиле bp/normalize (logNormalize):
// разброс между странами — порядки величин, линейная шкала бессмысленна.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ComponentResultBP3,
  ProvenanceGrade,
  SourcedValue,
  UavRawData,
} from "./types";
import { GRADE_RANK, gradeFromRank } from "./types";

// ─── Нормализация (стиль src/lib/bp/normalize.ts, локальная копия) ──────────
// bp3 самодостаточен: импорты только внутри пакета, поэтому нормализаторы
// продублированы здесь, а не импортированы из bp-v2.

/** Логарифмическая нормализация к потолку cap → [0, 100] */
export function logNormalizeBp3(v: number, cap: number): number {
  if (v <= 0) return 0;
  if (cap <= 0) return 0;
  if (v >= cap) return 100;
  const logV: number = Math.log10(v + 1);
  const logCap: number = Math.log10(cap + 1);
  if (logCap === 0) return 0;
  return Math.min((logV / logCap) * 100, 100);
}

/** Пропорциональная нормализация с потолком → [0, 100] */
export function cappedNormalizeBp3(v: number, cap: number): number {
  if (cap <= 0) return 0;
  if (v <= 0) return 0;
  return Math.min((v / cap) * 100, 100);
}

// ─── Потолки нормализации ────────────────────────────────────────────────────
// Потолок = уровень, выше которого дополнительный прирост почти не даёт
// военного эффекта в масштабе государства (насыщение). Значения —
// методические константы bp-v3 по открытым данным 2024–2025 гг.

/** Потолок парка ISR-БПЛА, шт. */
export const ISR_FLEET_CAP = 2500;
/** Потолок парка ударных БПЛА, шт. */
export const STRIKE_FLEET_CAP = 1500;
/** Потолок запаса барражирующих боеприпасов, шт. */
export const LOITERING_STOCK_CAP = 50000;
/** Потолок производства FPV, шт./мес */
export const FPV_PRODUCTION_CAP_PER_MONTH = 400000;
/** Потолок рубрик сопровождения (шкала 1–10) */
export const SUPPORT_RUBRIC_MAX = 10;

// ─── Внутрикомпонентные веса ─────────────────────────────────────────────────

export const UAV_SUBWEIGHTS = {
  isr: 0.2,
  strike: 0.2,
  loitering: 0.15,
  fpvProduction: 0.25,
  support: 0.2,
} as const;

// ─── Подбаллы ────────────────────────────────────────────────────────────────

/** Разбивка компонента U по подметрикам */
export interface UavBreakdown {
  /** Сырые значения входов */
  isrFleetRaw: number;
  strikeFleetRaw: number;
  loiteringStockRaw: number;
  fpvProductionPerMonthRaw: number;
  satelliteSupportRaw: number;
  ewEscortRaw: number;
  /** Подбаллы 0–100 */
  isrScore: number;
  strikeScore: number;
  loiteringScore: number;
  fpvProductionScore: number;
  supportScore: number;
}

/** Считает подбаллы компонента U из сырых данных */
export function calcUavBreakdown(data: UavRawData): UavBreakdown {
  const isrScore: number = logNormalizeBp3(data.isrFleet.value, ISR_FLEET_CAP);
  const strikeScore: number = logNormalizeBp3(
    data.strikeFleet.value,
    STRIKE_FLEET_CAP,
  );
  const loiteringScore: number = logNormalizeBp3(
    data.loiteringStock.value,
    LOITERING_STOCK_CAP,
  );
  const fpvProductionScore: number = logNormalizeBp3(
    data.fpvProductionPerMonth.value,
    FPV_PRODUCTION_CAP_PER_MONTH,
  );
  const supportMean: number =
    (data.satelliteSupport.value + data.ewEscort.value) / 2;
  const supportScore: number = cappedNormalizeBp3(
    supportMean,
    SUPPORT_RUBRIC_MAX,
  );

  return {
    isrFleetRaw: data.isrFleet.value,
    strikeFleetRaw: data.strikeFleet.value,
    loiteringStockRaw: data.loiteringStock.value,
    fpvProductionPerMonthRaw: data.fpvProductionPerMonth.value,
    satelliteSupportRaw: data.satelliteSupport.value,
    ewEscortRaw: data.ewEscort.value,
    isrScore,
    strikeScore,
    loiteringScore,
    fpvProductionScore,
    supportScore,
  };
}

/** Точечный балл компонента U (0–100) по разбивке */
export function uavScoreFromBreakdown(breakdown: UavBreakdown): number {
  return (
    breakdown.isrScore * UAV_SUBWEIGHTS.isr +
    breakdown.strikeScore * UAV_SUBWEIGHTS.strike +
    breakdown.loiteringScore * UAV_SUBWEIGHTS.loitering +
    breakdown.fpvProductionScore * UAV_SUBWEIGHTS.fpvProduction +
    breakdown.supportScore * UAV_SUBWEIGHTS.support
  );
}

// ─── Агрегация провенанса ────────────────────────────────────────────────────

/** Средний ранг грейдов входов → агрегированный грейд компонента */
export function aggregateGrade(values: readonly SourcedValue[]): ProvenanceGrade {
  if (values.length === 0) return "E";
  const rankSum: number = values.reduce(
    (acc, v) => acc + GRADE_RANK[v.grade],
    0,
  );
  return gradeFromRank(rankSum / values.length);
}

/**
 * Относительная сигма компонента из грейдов входов:
 * взвешенное (по внутрикомпонентным весам) среднее относительных сигм.
 */
export function uavRelativeSigma(data: UavRawData): number {
  const inputs: Array<{ grade: ProvenanceGrade; weight: number }> = [
    { grade: data.isrFleet.grade, weight: UAV_SUBWEIGHTS.isr },
    { grade: data.strikeFleet.grade, weight: UAV_SUBWEIGHTS.strike },
    { grade: data.loiteringStock.grade, weight: UAV_SUBWEIGHTS.loitering },
    {
      grade: data.fpvProductionPerMonth.grade,
      weight: UAV_SUBWEIGHTS.fpvProduction,
    },
    { grade: data.satelliteSupport.grade, weight: UAV_SUBWEIGHTS.support / 2 },
    { grade: data.ewEscort.grade, weight: UAV_SUBWEIGHTS.support / 2 },
  ];
  let sigma: number = 0;
  for (const input of inputs) {
    const relative: number =
      input.grade === "A"
        ? 0.05
        : input.grade === "B"
          ? 0.1
          : input.grade === "C"
            ? 0.18
            : input.grade === "D"
              ? 0.3
              : 0.45;
    sigma += relative * input.weight;
  }
  return sigma;
}

// ─── Публичный скоринг ───────────────────────────────────────────────────────

/**
 * Полный скоринг компонента U для страны.
 *
 * @param data   - сырые данные БПЛА с провенансом
 * @param weight - вес компонента U в конфигурации БП 3.0
 */
export function scoreUav(
  data: UavRawData,
  weight: number,
): ComponentResultBP3 {
  const breakdown: UavBreakdown = calcUavBreakdown(data);
  const score: number = uavScoreFromBreakdown(breakdown);
  const relativeSigma: number = uavRelativeSigma(data);
  const sigma: number = score > 0 ? Math.max(score * relativeSigma, 1) : 0;
  const confidenceGrade: ProvenanceGrade = aggregateGrade([
    data.isrFleet,
    data.strikeFleet,
    data.loiteringStock,
    data.fpvProductionPerMonth,
    data.satelliteSupport,
    data.ewEscort,
  ]);

  const breakdownRecord: Record<string, number> = {
    isrFleet: breakdown.isrFleetRaw,
    strikeFleet: breakdown.strikeFleetRaw,
    loiteringStock: breakdown.loiteringStockRaw,
    fpvProductionPerMonth: breakdown.fpvProductionPerMonthRaw,
    satelliteSupport: breakdown.satelliteSupportRaw,
    ewEscort: breakdown.ewEscortRaw,
    isrScore: breakdown.isrScore,
    strikeScore: breakdown.strikeScore,
    loiteringScore: breakdown.loiteringScore,
    fpvProductionScore: breakdown.fpvProductionScore,
    supportScore: breakdown.supportScore,
  };

  return {
    component: "uav",
    score,
    sigma,
    weight,
    weightedScore: score * weight,
    breakdown: breakdownRecord,
    confidenceGrade,
  };
}
