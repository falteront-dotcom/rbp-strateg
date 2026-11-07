// ─────────────────────────────────────────────────────────────────────────────
// BP Model 3.0 – Component P: боеприпасы и оборонное производство
// Волна 1 дорожной карты 3.0 (закрывает п. 1 критики 2.0)
//
// Главный урок войны 2022–2026 гг. для моделей военной мощи: армии
// проигрывают не тогда, когда у них кончаются танки на бумаге, а когда
// расход снарядов и ракет превышает производство и запасы. Европа в
// 2022–2023 гг. обнаружила, что её «арсеналы» — это недели войны
// высокой интенсивности. bp-v2 запасы и производство не считал вовсе.
//
// Формула P (подбаллы 0–100):
//   P = ShellEndurance×0.25 + MissileEndurance×0.15
//     + Production×0.25 + Coverage×0.15 + Independence×0.20
// где:
//   ShellEndurance — месяцы войны по снарядам: запас / (расход − производство),
//                    при производстве ≥ расхода — насыщение (потолок шкалы);
//   MissileEndurance — месяцы по управляемым ракетам аналогично;
//   Production — абсолютный темп производства снарядов (лог-шкала);
//   Coverage — доля месячного расхода, покрываемая производством;
//   Independence — 100 − доля импортных критических компонентов.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ComponentResultBP3,
  MunitionsRawData,
  ProvenanceGrade,
  SourcedValue,
} from "./types";
import { GRADE_RELATIVE_SIGMA, GRADE_RANK, gradeFromRank } from "./types";
import { cappedNormalizeBp3, logNormalizeBp3 } from "./uav-potential";

// ─── Методические константы ──────────────────────────────────────────────────

/** Месяцы войны по снарядам, дающие полный балл выносливости */
export const SHELL_ENDURANCE_CAP_MONTHS = 24;
/** Месяцы войны по ракетам, дающие полный балл выносливости */
export const MISSILE_ENDURANCE_CAP_MONTHS = 18;
/** Потолок темпа производства снарядов, тыс. шт./мес */
export const SHELL_PRODUCTION_CAP_PER_MONTH_THOUSANDS = 350;
/** Покрытие расхода производством, дающее полный балл (150%) */
export const PRODUCTION_COVERAGE_CAP = 1.5;

// ─── Внутрикомпонентные веса ─────────────────────────────────────────────────

export const MUNITIONS_SUBWEIGHTS = {
  shellEndurance: 0.25,
  missileEndurance: 0.15,
  production: 0.25,
  coverage: 0.15,
  independence: 0.2,
} as const;

// ─── Выносливость ────────────────────────────────────────────────────────────

/**
 * Месяцы до исчерпания запаса при заданных расходе и производстве.
 * Чистый расход = расход − производство; если производство покрывает
 * расход, запас не исчерпывается — возвращаем Infinity (насыщение).
 * Если и запаса нет, и чистый расход неотрицателен — 0 месяцев.
 */
export function monthsOfEndurance(
  stock: number,
  consumptionPerMonth: number,
  productionPerMonth: number,
): number {
  if (stock <= 0) return 0;
  const netConsumption: number = consumptionPerMonth - productionPerMonth;
  if (netConsumption <= 0) return Number.POSITIVE_INFINITY;
  return stock / netConsumption;
}

/** Конечная версия monthsOfEndurance для разбивки: Infinity → capMonths */
export function enduranceForDisplay(
  months: number,
  capMonths: number,
): number {
  if (!Number.isFinite(months)) return capMonths;
  return Math.min(months, capMonths);
}

// ─── Разбивка ────────────────────────────────────────────────────────────────

/** Разбивка компонента P по подметрикам */
export interface MunitionsBreakdown {
  /** Месяцы войны: снаряды (сырое значение, может быть Infinity→cap) */
  shellMonths: number;
  /** Месяцы войны: ракеты */
  missileMonths: number;
  /** Доля расхода снарядов, покрываемая производством (0..>1) */
  productionCoverageRatio: number;
  /** Подбаллы 0–100 */
  shellEnduranceScore: number;
  missileEnduranceScore: number;
  productionScore: number;
  coverageScore: number;
  independenceScore: number;
}

/** Считает подбаллы компонента P из сырых данных */
export function calcMunitionsBreakdown(
  data: MunitionsRawData,
): MunitionsBreakdown {
  const shellMonthsRaw: number = monthsOfEndurance(
    data.artilleryShellStockThousands.value,
    data.artilleryShellConsumptionPerMonthThousands.value,
    data.artilleryShellProductionPerMonthThousands.value,
  );
  // По ракетам месячный расход высокой интенсивности не публикуется даже
  // оценочно для большинства стран; методический прокси bp-v3: расход =
  // 4% запаса в месяц для стран с запасом > 0. Это оценка модели,
  // а не данные — помечено здесь, чтобы не выдавать прокси за факт.
  const missileMonthlyConsumption: number = data.missileStockTotal.value * 0.04;
  const missileMonthsRaw: number = monthsOfEndurance(
    data.missileStockTotal.value,
    missileMonthlyConsumption,
    data.missileProductionPerMonth.value,
  );

  const shellMonths: number = enduranceForDisplay(
    shellMonthsRaw,
    SHELL_ENDURANCE_CAP_MONTHS,
  );
  const missileMonths: number = enduranceForDisplay(
    missileMonthsRaw,
    MISSILE_ENDURANCE_CAP_MONTHS,
  );

  const consumption: number =
    data.artilleryShellConsumptionPerMonthThousands.value;
  const productionCoverageRatio: number =
    consumption > 0
      ? data.artilleryShellProductionPerMonthThousands.value / consumption
      : data.artilleryShellProductionPerMonthThousands.value > 0
        ? PRODUCTION_COVERAGE_CAP
        : 0;

  const shellEnduranceScore: number = cappedNormalizeBp3(
    shellMonths,
    SHELL_ENDURANCE_CAP_MONTHS,
  );
  const missileEnduranceScore: number = cappedNormalizeBp3(
    missileMonths,
    MISSILE_ENDURANCE_CAP_MONTHS,
  );
  const productionScore: number = logNormalizeBp3(
    data.artilleryShellProductionPerMonthThousands.value,
    SHELL_PRODUCTION_CAP_PER_MONTH_THOUSANDS,
  );
  const coverageScore: number = cappedNormalizeBp3(
    productionCoverageRatio,
    PRODUCTION_COVERAGE_CAP,
  );
  const independenceScore: number = Math.min(
    Math.max(100 - data.importDependencyPct.value, 0),
    100,
  );

  return {
    shellMonths,
    missileMonths,
    productionCoverageRatio,
    shellEnduranceScore,
    missileEnduranceScore,
    productionScore,
    coverageScore,
    independenceScore,
  };
}

/** Точечный балл компонента P (0–100) по разбивке */
export function munitionsScoreFromBreakdown(
  breakdown: MunitionsBreakdown,
): number {
  return (
    breakdown.shellEnduranceScore * MUNITIONS_SUBWEIGHTS.shellEndurance +
    breakdown.missileEnduranceScore * MUNITIONS_SUBWEIGHTS.missileEndurance +
    breakdown.productionScore * MUNITIONS_SUBWEIGHTS.production +
    breakdown.coverageScore * MUNITIONS_SUBWEIGHTS.coverage +
    breakdown.independenceScore * MUNITIONS_SUBWEIGHTS.independence
  );
}

// ─── Агрегация провенанса ────────────────────────────────────────────────────

/** Агрегированный грейд входов компонента P */
export function munitionsConfidenceGrade(
  data: MunitionsRawData,
): ProvenanceGrade {
  const values: SourcedValue[] = [
    data.artilleryShellStockThousands,
    data.artilleryShellProductionPerMonthThousands,
    data.artilleryShellConsumptionPerMonthThousands,
    data.missileStockTotal,
    data.missileProductionPerMonth,
    data.samInterceptorStock,
    data.importDependencyPct,
  ];
  const rankSum: number = values.reduce(
    (acc, v) => acc + GRADE_RANK[v.grade],
    0,
  );
  return gradeFromRank(rankSum / values.length);
}

/** Относительная сигма компонента P — среднее сигм грейдов входов */
export function munitionsRelativeSigma(data: MunitionsRawData): number {
  const values: SourcedValue[] = [
    data.artilleryShellStockThousands,
    data.artilleryShellProductionPerMonthThousands,
    data.artilleryShellConsumptionPerMonthThousands,
    data.missileStockTotal,
    data.missileProductionPerMonth,
    data.samInterceptorStock,
    data.importDependencyPct,
  ];
  const sum: number = values.reduce(
    (acc, v) => acc + GRADE_RELATIVE_SIGMA[v.grade],
    0,
  );
  return sum / values.length;
}

// ─── Публичный скоринг ───────────────────────────────────────────────────────

/**
 * Полный скоринг компонента P для страны.
 *
 * @param data   - сырые данные боеприпасов и производства с провенансом
 * @param weight - вес компонента P в конфигурации БП 3.0
 */
export function scoreMunitions(
  data: MunitionsRawData,
  weight: number,
): ComponentResultBP3 {
  const breakdown: MunitionsBreakdown = calcMunitionsBreakdown(data);
  const score: number = munitionsScoreFromBreakdown(breakdown);
  const relativeSigma: number = munitionsRelativeSigma(data);
  const sigma: number = score > 0 ? Math.max(score * relativeSigma, 1) : 0;

  const breakdownRecord: Record<string, number> = {
    shellStockThousands: data.artilleryShellStockThousands.value,
    shellProductionPerMonthThousands:
      data.artilleryShellProductionPerMonthThousands.value,
    shellConsumptionPerMonthThousands:
      data.artilleryShellConsumptionPerMonthThousands.value,
    missileStockTotal: data.missileStockTotal.value,
    missileProductionPerMonth: data.missileProductionPerMonth.value,
    samInterceptorStock: data.samInterceptorStock.value,
    importDependencyPct: data.importDependencyPct.value,
    shellMonths: breakdown.shellMonths,
    missileMonths: breakdown.missileMonths,
    productionCoverageRatio: breakdown.productionCoverageRatio,
    shellEnduranceScore: breakdown.shellEnduranceScore,
    missileEnduranceScore: breakdown.missileEnduranceScore,
    productionScore: breakdown.productionScore,
    coverageScore: breakdown.coverageScore,
    independenceScore: breakdown.independenceScore,
  };

  return {
    component: "munitions",
    score,
    sigma,
    weight,
    weightedScore: score * weight,
    breakdown: breakdownRecord,
    confidenceGrade: munitionsConfidenceGrade(data),
  };
}
