// ─────────────────────────────────────────────────────────────────────────────
// Движок дельт: сравнение снапшотов и ранжирование изменений
// «Что изменилось сильнее всего» — по стране, региону и миру
// РБП-Стратег 3.0 · Волна 5 «Мониторинг и аналитический продукт» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// Принципы:
// — дельта считается по каждой метрике отдельно: суммарный БП может стоять,
//   пока внутри идёт перестройка (падает выносливость, растёт производство);
// — относительное изменение без абсолютного — манипуляция: рост выпуска
//   снарядов с 10 до 30 тыс. — это +200% и одновременно статистический шум
//   в масштабе войны. Классификация значимости смотрит на оба числа;
// — сравнение снапшотов разных источников помечается: методологический
//   разрыв нельзя выдавать за изменение реального мира.

import {
  BP_COMPONENT_KEYS,
  PRODUCTION_KINDS,
  productionTotal,
  type BpComponentKey,
  type CountrySnapshot,
  type ProductionKind,
  type RegionKey,
} from "./snapshots";

/** Идентификаторы метрик, по которым строятся дельты. */
export type MetricKey =
  | "bpTotal"
  | "budgetBnUsd"
  | "defenseShareGdpPct"
  | "activePersonnel"
  | "reservePersonnel"
  | "enduranceMonths"
  | `component:${BpComponentKey}`
  | `production:${ProductionKind}`;

/** Подписи метрик. */
export function metricLabelRu(metric: MetricKey): string {
  if (metric.startsWith("component:")) {
    const key = metric.slice("component:".length) as BpComponentKey;
    return `Компонент БП: ${key}`;
  }
  if (metric.startsWith("production:")) {
    const key = metric.slice("production:".length) as ProductionKind;
    return `Производство: ${key}`;
  }
  switch (metric) {
    case "bpTotal":
      return "Боевой потенциал (итог)";
    case "budgetBnUsd":
      return "Военный бюджет, млрд $";
    case "defenseShareGdpPct":
      return "Доля военных расходов в ВВП, %";
    case "activePersonnel":
      return "Активный личный состав";
    case "reservePersonnel":
      return "Резерв";
    case "enduranceMonths":
      return "Выносливость, мес.";
    default:
      return metric;
  }
}

/** Класс значимости изменения. */
export type ChangeSignificance =
  | "negligible"
  | "minor"
  | "moderate"
  | "major"
  | "transformational";

/** Подписи и пороги классов значимости. */
export const SIGNIFICANCE_LABELS_RU: Record<ChangeSignificance, string> = {
  negligible: "Пренебрежимое (шум данных)",
  minor: "Незначительное",
  moderate: "Умеренное",
  major: "Крупное",
  transformational: "Трансформационное",
};

/** Числовой ранг значимости для сортировки (больше — значимее). */
export const SIGNIFICANCE_RANK: Record<ChangeSignificance, number> = {
  negligible: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  transformational: 4,
};

/** Дельта одной метрики одной страны между двумя снапшотами. */
export interface MetricDelta {
  /** Страна. */
  iso3: string;
  /** Название страны. */
  nameRu: string;
  /** Регион страны. */
  region: RegionKey;
  /** Метрика. */
  metric: MetricKey;
  /** Начальный год. */
  fromYear: number;
  /** Конечный год. */
  toYear: number;
  /** Значение в начальном году. */
  fromValue: number;
  /** Значение в конечном году. */
  toValue: number;
  /** Абсолютное изменение (to - from). */
  absolute: number;
  /** Относительное изменение, % (null, если база нулевая/отсутствует). */
  relativePct: number | null;
  /** Класс значимости. */
  significance: ChangeSignificance;
  /** Источники расходятся: методологический разрыв, а не факт мира. */
  sourceMismatch: boolean;
  /** Хотя бы одно из значений оценочное. */
  estimated: boolean;
  /** Готовая русская формулировка изменения для сводок и UI. */
  summaryRu: string;
}

/** Извлечение значения метрики из снапшота (null — метрики нет). */
export function metricValue(
  snapshot: CountrySnapshot,
  metric: MetricKey,
): { value: number; source: string; estimated: boolean } | null {
  if (metric.startsWith("component:")) {
    const key = metric.slice("component:".length) as BpComponentKey;
    return {
      value: snapshot.components[key],
      source: "Модель БП 3.0 (расчёт по снапшоту)",
      estimated: true,
    };
  }
  if (metric.startsWith("production:")) {
    const kind = metric.slice("production:".length) as ProductionKind;
    const line = snapshot.production.find((p) => p.kind === kind);
    if (!line) {
      return null;
    }
    return {
      value: line.annualUnits.value,
      source: line.annualUnits.source,
      estimated: line.annualUnits.estimated,
    };
  }
  switch (metric) {
    case "bpTotal":
      return {
        value: snapshot.bpTotal,
        source: "Модель БП 3.0 (расчёт по снапшоту)",
        estimated: true,
      };
    case "budgetBnUsd":
      return {
        value: snapshot.budgetBnUsd.value,
        source: snapshot.budgetBnUsd.source,
        estimated: snapshot.budgetBnUsd.estimated,
      };
    case "defenseShareGdpPct":
      return {
        value: snapshot.defenseShareGdpPct.value,
        source: snapshot.defenseShareGdpPct.source,
        estimated: snapshot.defenseShareGdpPct.estimated,
      };
    case "activePersonnel":
      return {
        value: snapshot.activePersonnel.value,
        source: snapshot.activePersonnel.source,
        estimated: snapshot.activePersonnel.estimated,
      };
    case "reservePersonnel":
      return {
        value: snapshot.reservePersonnel.value,
        source: snapshot.reservePersonnel.source,
        estimated: snapshot.reservePersonnel.estimated,
      };
    case "enduranceMonths":
      return {
        value: snapshot.enduranceMonths.value,
        source: snapshot.enduranceMonths.source,
        estimated: snapshot.enduranceMonths.estimated,
      };
    default:
      return null;
  }
}

/** Полный набор метрик мониторинга. */
export function allMetrics(): MetricKey[] {
  const base: MetricKey[] = [
    "bpTotal",
    "budgetBnUsd",
    "defenseShareGdpPct",
    "activePersonnel",
    "reservePersonnel",
    "enduranceMonths",
  ];
  for (const key of BP_COMPONENT_KEYS) {
    base.push(`component:${key}`);
  }
  for (const kind of PRODUCTION_KINDS) {
    base.push(`production:${kind}`);
  }
  return base;
}

/**
 * Классификация значимости: смотрит и на относительное, и на абсолютное
 * изменение. Для балльных метрик (БП, компоненты) решают абсолютные пункты;
 * для физических — относительный темп с поправкой на масштаб базы.
 */
export function classifySignificance(
  metric: MetricKey,
  absolute: number,
  relativePct: number | null,
): ChangeSignificance {
  const abs = Math.abs(absolute);
  if (metric === "bpTotal" || metric.startsWith("component:")) {
    if (abs < 0.5) return "negligible";
    if (abs < 2) return "minor";
    if (abs < 5) return "moderate";
    if (abs < 10) return "major";
    return "transformational";
  }
  const rel = relativePct === null ? 0 : Math.abs(relativePct);
  if (rel < 2) return "negligible";
  if (rel < 5) return "minor";
  if (rel < 15) return "moderate";
  if (rel < 40) return "major";
  return "transformational";
}

/** Форматирование числа для сводок: разделители тысяч, до 1 знака. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(Math.trunc(rounded))
    : rounded.toFixed(1);
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Дельта одной метрики между двумя снапшотами одной страны. */
export function compareMetric(
  from: CountrySnapshot,
  to: CountrySnapshot,
  metric: MetricKey,
): MetricDelta | null {
  const a = metricValue(from, metric);
  const b = metricValue(to, metric);
  if (!a || !b) {
    return null;
  }
  const absolute = b.value - a.value;
  const relativePct =
    a.value !== 0 ? (absolute / Math.abs(a.value)) * 100 : null;
  const significance = classifySignificance(metric, absolute, relativePct);
  const sign = absolute > 0 ? "+" : "";
  const relText =
    relativePct === null
      ? "база нулевая"
      : `${relativePct >= 0 ? "+" : ""}${relativePct.toFixed(1)}%`;
  return {
    iso3: to.iso3,
    nameRu: to.nameRu,
    region: to.region,
    metric: metric,
    fromYear: from.year,
    toYear: to.year,
    fromValue: a.value,
    toValue: b.value,
    absolute: absolute,
    relativePct: relativePct,
    significance: significance,
    sourceMismatch: a.source !== b.source,
    estimated: a.estimated || b.estimated,
    summaryRu:
      `${metricLabelRu(metric)}: ${formatNumber(a.value)} → ` +
      `${formatNumber(b.value)} (${sign}${formatNumber(absolute)}; ${relText})`,
  };
}

/** Все дельты между двумя снапшотами одной страны. */
export function compareSnapshots(
  from: CountrySnapshot,
  to: CountrySnapshot,
): MetricDelta[] {
  const out: MetricDelta[] = [];
  for (const metric of allMetrics()) {
    const delta = compareMetric(from, to, metric);
    if (delta) {
      out.push(delta);
    }
  }
  return out;
}

/** Соседние пары ряда → плоский список дельт страны за весь период. */
export function seriesDeltas(series: CountrySnapshot[]): MetricDelta[] {
  const sorted = [...series].sort((a, b) => a.year - b.year);
  const out: MetricDelta[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    out.push(...compareSnapshots(sorted[i - 1], sorted[i]));
  }
  return out;
}

/** Дельта «первый → последний» снапшот ряда (кумулятивное изменение). */
export function cumulativeDelta(
  series: CountrySnapshot[],
  metric: MetricKey,
): MetricDelta | null {
  if (series.length < 2) {
    return null;
  }
  const sorted = [...series].sort((a, b) => a.year - b.year);
  return compareMetric(sorted[0], sorted[sorted.length - 1], metric);
}

/** Сортировка дельт по значимости и масштабу (для «что изменилось сильнее»). */
export function rankDeltas(deltas: MetricDelta[]): MetricDelta[] {
  return [...deltas].sort((a, b) => {
    const rankDiff =
      SIGNIFICANCE_RANK[b.significance] - SIGNIFICANCE_RANK[a.significance];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const relA = a.relativePct === null ? 0 : Math.abs(a.relativePct);
    const relB = b.relativePct === null ? 0 : Math.abs(b.relativePct);
    return relB - relA;
  });
}

/** Топ изменений одной страны за период. */
export function topChangesForCountry(
  series: CountrySnapshot[],
  limit: number,
): MetricDelta[] {
  return rankDeltas(seriesDeltas(series)).slice(0, limit);
}

/** Топ изменений региона: дельты всех стран региона за один шаг лет. */
export function topChangesForRegion(
  seriesByCountry: Map<string, CountrySnapshot[]>,
  region: RegionKey,
  fromYear: number,
  toYear: number,
  limit: number,
): MetricDelta[] {
  const all: MetricDelta[] = [];
  for (const series of seriesByCountry.values()) {
    const from = series.find((s) => s.year === fromYear);
    const to = series.find((s) => s.year === toYear);
    if (from && to && to.region === region) {
      all.push(...compareSnapshots(from, to));
    }
  }
  return rankDeltas(all).slice(0, limit);
}

/** Топ изменений мира: дельты всех стран за один шаг лет. */
export function topChangesGlobal(
  seriesByCountry: Map<string, CountrySnapshot[]>,
  fromYear: number,
  toYear: number,
  limit: number,
): MetricDelta[] {
  const all: MetricDelta[] = [];
  for (const series of seriesByCountry.values()) {
    const from = series.find((s) => s.year === fromYear);
    const to = series.find((s) => s.year === toYear);
    if (from && to) {
      all.push(...compareSnapshots(from, to));
    }
  }
  return rankDeltas(all).slice(0, limit);
}

/** Среднегодовой темп роста (CAGR, %) метрики по ряду; null — не считается. */
export function cagrPct(series: CountrySnapshot[], metric: MetricKey): number | null {
  if (series.length < 2) {
    return null;
  }
  const sorted = [...series].sort((a, b) => a.year - b.year);
  const first = metricValue(sorted[0], metric);
  const last = metricValue(sorted[sorted.length - 1], metric);
  if (!first || !last || first.value <= 0 || last.value <= 0) {
    return null;
  }
  const years = sorted[sorted.length - 1].year - sorted[0].year;
  if (years <= 0) {
    return null;
  }
  return (Math.pow(last.value / first.value, 1 / years) - 1) * 100;
}

/** Проверка: производство вида выросло не менее чем вдвое между снапшотами. */
export function productionDoubled(
  from: CountrySnapshot,
  to: CountrySnapshot,
  kind: ProductionKind,
): boolean {
  const a = productionTotal(from, kind);
  const b = productionTotal(to, kind);
  return a > 0 && b >= a * 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Региональный дайджест изменений: агрегаты для сводок
// ─────────────────────────────────────────────────────────────────────────────

/** Агрегированное изменение метрики по региону за шаг лет. */
export interface RegionalAggregate {
  /** Регион. */
  region: RegionKey;
  /** Метрика. */
  metric: MetricKey;
  /** Сумма значений региона в начальном году. */
  fromTotal: number;
  /** Сумма значений региона в конечном году. */
  toTotal: number;
  /** Абсолютное изменение суммы. */
  absolute: number;
  /** Относительное изменение суммы, % (null при нулевой базе). */
  relativePct: number | null;
  /** Число стран региона, по которым есть оба снапшота. */
  countryCount: number;
  /** Страна — крупнейший вкладчик в изменение (по абсолютной величине). */
  topContributorIso3: string | null;
}

/**
 * Агрегат региона по метрике: суммы считаются только по странам, у которых
 * есть оба снапшота, иначе «изменение» окажется артефактом покрытия.
 */
export function regionalAggregate(
  seriesByCountry: Map<string, CountrySnapshot[]>,
  region: RegionKey,
  metric: MetricKey,
  fromYear: number,
  toYear: number,
): RegionalAggregate {
  let fromTotal = 0;
  let toTotal = 0;
  let count = 0;
  let topIso: string | null = null;
  let topAbs = -1;
  for (const series of seriesByCountry.values()) {
    const from = series.find((s) => s.year === fromYear);
    const to = series.find((s) => s.year === toYear);
    if (!from || !to || to.region !== region) {
      continue;
    }
    const a = metricValue(from, metric);
    const b = metricValue(to, metric);
    if (!a || !b) {
      continue;
    }
    fromTotal += a.value;
    toTotal += b.value;
    count += 1;
    const contribution = Math.abs(b.value - a.value);
    if (contribution > topAbs) {
      topAbs = contribution;
      topIso = to.iso3;
    }
  }
  const absolute = toTotal - fromTotal;
  return {
    region: region,
    metric: metric,
    fromTotal: fromTotal,
    toTotal: toTotal,
    absolute: absolute,
    relativePct: fromTotal !== 0 ? (absolute / Math.abs(fromTotal)) * 100 : null,
    countryCount: count,
    topContributorIso3: topIso,
  };
}

/** Дайджест региона: агрегаты по ключевым метрикам одним списком. */
export function regionalDigest(
  seriesByCountry: Map<string, CountrySnapshot[]>,
  region: RegionKey,
  fromYear: number,
  toYear: number,
): RegionalAggregate[] {
  const metrics: MetricKey[] = [
    "budgetBnUsd",
    "activePersonnel",
    "production:shells_155",
    "production:uav",
    "production:missiles",
  ];
  return metrics.map((metric) =>
    regionalAggregate(seriesByCountry, region, metric, fromYear, toYear),
  );
}

/** Мировой агрегат метрики за шаг лет (все регионы). */
export function globalAggregate(
  seriesByCountry: Map<string, CountrySnapshot[]>,
  metric: MetricKey,
  fromYear: number,
  toYear: number,
): { fromTotal: number; toTotal: number; relativePct: number | null; countryCount: number } {
  let fromTotal = 0;
  let toTotal = 0;
  let count = 0;
  for (const series of seriesByCountry.values()) {
    const from = series.find((s) => s.year === fromYear);
    const to = series.find((s) => s.year === toYear);
    if (!from || !to) {
      continue;
    }
    const a = metricValue(from, metric);
    const b = metricValue(to, metric);
    if (!a || !b) {
      continue;
    }
    fromTotal += a.value;
    toTotal += b.value;
    count += 1;
  }
  const absolute = toTotal - fromTotal;
  return {
    fromTotal: fromTotal,
    toTotal: toTotal,
    relativePct: fromTotal !== 0 ? (absolute / Math.abs(fromTotal)) * 100 : null,
    countryCount: count,
  };
}
