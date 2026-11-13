// ─────────────────────────────────────────────────────────────────────────────
// Фасад API v3 (РБП-Стратег 3.0)
//
// Тонкий серверный слой между библиотеками волн 0–7 (bp3, intel, warfare3,
// data3, monitor, brief, data4, data5) и маршрутами src/app/api/v3/*.
// Страницы и API потребляют только этот фасад: вся сборка входов движков,
// кэширование и «мягкие» отказы секций живут здесь, а не в роутах.
//
// Принципы:
//   1. БП 3.0 считается лениво один раз на процесс и кэшируется на уровне
//      модуля: Монте-Карло по ~200 странам — не работа для каждого запроса.
//   2. Страна, на которой движок БП 3.0 падает, пропускается из рейтинга,
//      а не роняет весь эндпоинт.
//   3. Секции детали страны независимы: упавшая секция даёт null (или []
//      для торнадо), а не ошибку всей страницы.
// ─────────────────────────────────────────────────────────────────────────────

import { openReadonlyDatabase } from "@/db/runtime";
import {
  mapCountryRows,
  type CountryApiData,
  type RawCountryRow,
} from "@/db/country-mapper";

import {
  BP3_COMPONENTS,
  BP3_COMPONENT_LABELS_RU,
  analyzeSensitivity,
  calculateCountryBP3,
  deltaVsV2Only,
  findTop30Input,
  percentile,
} from "./bp3";
import type {
  BP3Component,
  ComponentInput,
  CountryBP3Input,
  CountryBP3Result,
  MunitionsRawData,
  RankStability,
  SourcedValue,
  UavRawData,
  V2Component,
} from "./bp3";

import { getSustainabilityProfile } from "./warfare3";
import { evaluateAll, sortAlerts, type Alert } from "./monitor/alerts";
import { seriesByCountry } from "./monitor/series-2023-2025";
import type { CountrySnapshot } from "./monitor/snapshots";
import {
  generatePlainTextBrief,
  type BriefAlternative,
  type BriefInput,
  type BriefSource,
  type KeyJudgment,
} from "./brief/brief-generator";
import { profile60ByIso3 } from "./data3/country-profiles-60";
import { restProfileByIso3 } from "./data5/country-profiles-rest";
import { allSystems } from "./data4/systems-analysis";
import {
  IW_CATALOG,
  IW_CATEGORY_PROFILES,
  type IWCategory,
} from "./intel/iw-catalog";

// ─── Публичная строка рейтинга БП 3.0 ─────────────────────────────────────────

export interface FacadeBP3Row {
  iso: string;
  name: string;
  total: number;
  p10: number;
  p90: number;
  deltaV2: number;
  hasUP: boolean;
  components: { key: string; label: string; score: number; weight: number }[];
  /** Устойчивость ранга по итерациям MC (весовая неопределённость) */
  rankStability: RankStability;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ─── Нулевая базовая линия U/P для стран вне топ-30 ───────────────────────────
//
// У bp3 нет «пустых» данных: движок требует полное сырьё U и P. Для стран,
// которых нет в TOP30_BP3_INPUTS, фасад подставляет честную нулевую линию:
// парки и производство — 0, зависимость от импорта — 100% (нет собственного
// производства → компонент P не получает баллов «за независимость»).
// Итог такой страны по U/P — нижняя граница, а не оценка; hasUP=false в
// строке рейтинга помечает это для потребителя.

const ZERO_SOURCE_RU =
  "Фасад v3: данные U/P отсутствуют (нулевая базовая линия)";

function zeroSourced(noteRu: string): SourcedValue {
  return {
    value: 0,
    source: ZERO_SOURCE_RU,
    year: 2025,
    grade: "E",
    estimated: true,
    noteRu,
  };
}

function zeroUav(): UavRawData {
  return {
    isrFleet: zeroSourced("Парк разведывательных БПЛА не оценён."),
    strikeFleet: zeroSourced("Парк ударных БПЛА не оценён."),
    loiteringStock: zeroSourced("Запас барражирующих боеприпасов не оценён."),
    fpvProductionPerMonth: zeroSourced("Производство FPV не оценено."),
    satelliteSupport: zeroSourced("Спутниковое сопровождение не оценено."),
    ewEscort: zeroSourced("РЭБ-сопровождение не оценено."),
  };
}

function zeroMunitions(): MunitionsRawData {
  return {
    artilleryShellStockThousands: zeroSourced("Запас снарядов не оценён."),
    artilleryShellProductionPerMonthThousands: zeroSourced(
      "Производство снарядов не оценено.",
    ),
    artilleryShellConsumptionPerMonthThousands: zeroSourced(
      "Расход снарядов не оценён.",
    ),
    missileStockTotal: zeroSourced("Запас управляемых ракет не оценён."),
    missileProductionPerMonth: zeroSourced(
      "Производство управляемых ракет не оценено.",
    ),
    samInterceptorStock: zeroSourced("Запас ЗУР не оценён."),
    importDependencyPct: {
      value: 100,
      source: ZERO_SOURCE_RU,
      year: 2025,
      grade: "E",
      estimated: true,
      noteRu: "Собственное производство не подтверждено: принято 100%.",
    },
  };
}

// ─── Сборка входа БП 3.0 из строки БД ─────────────────────────────────────────

function v2ComponentInput(score: number): ComponentInput {
  return {
    score,
    source: "Ядро bp-v2 проекта (SQLite, колонки bp_* таблицы countries)",
    year: 2025,
    grade: "C",
    estimated: true,
  };
}

function buildBP3Input(country: CountryApiData): {
  input: CountryBP3Input;
  hasUP: boolean;
} {
  const v2Scores: Record<V2Component, ComponentInput> = {
    weapon: v2ComponentInput(country.bpWeapon),
    manpower: v2ComponentInput(country.bpManpower),
    logistics: v2ComponentInput(country.bpLogistics),
    c2: v2ComponentInput(country.bpC2),
    economy: v2ComponentInput(country.bpEconomy),
    doctrine: v2ComponentInput(country.bpDoctrine),
    readiness: v2ComponentInput(country.bpReadiness),
    terrain: v2ComponentInput(country.bpTerrain),
  };
  const top30 = findTop30Input(country.isoCode);
  return {
    hasUP: top30 !== undefined,
    input: {
      isoCode: country.isoCode,
      name: country.name,
      nameRu: country.nameRu,
      v2Scores,
      uav: top30 ? top30.uav : zeroUav(),
      munitions: top30 ? top30.munitions : zeroMunitions(),
    },
  };
}

function toFacadeRow(
  result: CountryBP3Result,
  country: CountryApiData,
  hasUP: boolean,
): FacadeBP3Row {
  return {
    iso: result.isoCode,
    name: country.nameRu || result.nameRu,
    total: round1(result.total.median),
    p10: round1(result.total.p10),
    p90: round1(result.total.p90),
    deltaV2: round1(deltaVsV2Only(result)),
    hasUP,
    components: BP3_COMPONENTS.map((key: BP3Component) => ({
      key,
      label: BP3_COMPONENT_LABELS_RU[key],
      score: round1(result.components[key].score),
      weight: result.components[key].weight,
    })),
    // Плейсхолдер: реальное значение ставится после расчёта когорты
    // (computeRankStability в ensureBP3Cache), до выдачи наружу не доходит.
    rankStability: { rankP10: 0, rankP90: 0, pAboveNext: null },
  };
}

// ─── Кэш БП 3.0 (ленивый, один раз на процесс) ────────────────────────────────

interface BP3CacheEntry {
  result: CountryBP3Result;
  row: FacadeBP3Row;
}

interface BP3Cache {
  rows: FacadeBP3Row[];
  byIso: Map<string, BP3CacheEntry>;
}

let bp3Cache: BP3Cache | null = null;

/** Страны БД в порядке v2-балла — общий вход для рейтинга и диагностик. */
function readCountriesForBP3(): CountryApiData[] {
  const db = openReadonlyDatabase();
  try {
    const rows = db
      .prepare("SELECT * FROM countries ORDER BY bp_total DESC")
      .all() as RawCountryRow[];
    return mapCountryRows(rows);
  } finally {
    db.close();
  }
}

/**
 * Входы БП3 для всех стран БД — для диагностик (leave-one-component-out
 * и т.п.). Тот же путь построения, что у рейтинга, без кэша результатов.
 */
export function getBP3Inputs(): { input: CountryBP3Input; hasUP: boolean }[] {
  const out: { input: CountryBP3Input; hasUP: boolean }[] = [];
  for (const country of readCountriesForBP3()) {
    try {
      out.push(buildBP3Input(country));
    } catch {
      continue;
    }
  }
  return out;
}

function ensureBP3Cache(): BP3Cache {
  if (bp3Cache !== null) {
    return bp3Cache;
  }
  const countries = readCountriesForBP3();

  const results: { result: CountryBP3Result; entry: BP3CacheEntry }[] = [];
  const byIso = new Map<string, BP3CacheEntry>();
  for (const country of countries) {
    try {
      const { input, hasUP } = buildBP3Input(country);
      const result = calculateCountryBP3(input, { keepSamples: true });
      const entry: BP3CacheEntry = {
        result,
        row: toFacadeRow(result, country, hasUP),
      };
      results.push({ result, entry });
      byIso.set(result.isoCode, entry);
    } catch {
      // Страна, на которой движок упал, пропускается: рейтинг остальных
      // стран не должен зависеть от одной битой записи.
      continue;
    }
  }
  results.sort((a, b) => b.result.total.median - a.result.total.median);
  const stability = computeRankStability(results.map((r) => r.result));
  results.forEach(({ result, entry }, idx) => {
    entry.row.rankStability = stability.get(result.isoCode) ?? {
      rankP10: idx + 1,
      rankP90: idx + 1,
      pAboveNext: null,
    };
    // Сырые итерации нужны были только для rank-stability — в кэше не держим.
    delete result.samples;
  });
  bp3Cache = { rows: results.map((r) => r.entry.row), byIso };
  return bp3Cache;
}

/**
 * Rank-stability когорты по сырым итерациям MC.
 *
 * На каждой итерации страны сортируются по drawn-итогу → распределение ранга
 * каждой страны (P10/P90). pAboveNext — доля итераций, где страна выше
 * следующего соседа по медиане: «место в рейтинге — не точка».
 * Сиды стран независимы (countrySeed), поэтому парные сравнения итерация-в-
 * итерацию корректны. Стоимость: O(iters × N log N), один раз на процесс.
 */
function computeRankStability(
  sorted: readonly CountryBP3Result[],
): Map<string, RankStability> {
  const out = new Map<string, RankStability>();
  const n = sorted.length;
  if (n === 0) return out;
  const iters: number = sorted[0]?.samples?.length ?? 0;
  if (iters === 0) return out;

  const pAbove: (number | null)[] = sorted.map((r, idx) => {
    const next = sorted[idx + 1];
    const a = r.samples;
    const b = next?.samples;
    if (!a || !b) return null;
    let wins = 0;
    for (let i = 0; i < iters; i++) {
      if ((a[i] ?? 0) > (b[i] ?? 0)) wins++;
    }
    return wins / iters;
  });

  const ranks: number[][] = sorted.map(() => []);
  const order: number[] = sorted.map((_, idx) => idx);
  for (let i = 0; i < iters; i++) {
    order.sort(
      (x, y) =>
        (sorted[y]?.samples?.[i] ?? 0) - (sorted[x]?.samples?.[i] ?? 0),
    );
    for (let pos = 0; pos < n; pos++) {
      ranks[order[pos] ?? 0]?.push(pos + 1);
    }
  }

  sorted.forEach((r, idx) => {
    const rs = ranks[idx] ?? [];
    rs.sort((a, b) => a - b);
    const p = pAbove[idx];
    out.set(r.isoCode, {
      rankP10: Math.round(percentile(rs, 10)),
      rankP90: Math.round(percentile(rs, 90)),
      pAboveNext: p === null ? null : Math.round(p * 1000) / 1000,
    });
  });
  return out;
}

/** Рейтинг БП 3.0 всех стран БД, сортировка по медиане итога ↓. */
export function getBP3Ranking(): FacadeBP3Row[] {
  return ensureBP3Cache().rows;
}

// ─── Кэш рядов мониторинга ────────────────────────────────────────────────────

let seriesCache: Map<string, CountrySnapshot[]> | null = null;

function ensureSeries(): Map<string, CountrySnapshot[]> {
  if (seriesCache === null) {
    seriesCache = seriesByCountry();
  }
  return seriesCache;
}

/** Лента алертов мониторинга: все правила по всем странам, отсортированы. */
export function getAlertsFeed(): Alert[] {
  return sortAlerts(evaluateAll(ensureSeries()));
}

// ─── Деталь страны ────────────────────────────────────────────────────────────

function buildCountryBriefInput(
  row: FacadeBP3Row,
  countryAlerts: Alert[],
): BriefInput {
  const sources: BriefSource[] = [
    {
      nameRu: "Ядро bp-v2 проекта (агрегат открытых рейтингов и ежегодников)",
      grade: { source: "B", info: 2 },
      contributionRu: "Баллы восьми унаследованных компонентов БП.",
    },
    {
      nameRu: "Модель БП 3.0 проекта (компоненты U/P, Монте-Карло)",
      grade: { source: "C", info: 3 },
      contributionRu:
        "Компоненты БПЛА и боеприпасов/производства, интервалы неопределённости итога.",
    },
  ];

  const sorted = [...row.components].sort((a, b) => b.score - a.score);
  const judgments: KeyJudgment[] = [];
  for (const comp of sorted.slice(0, 2)) {
    judgments.push({
      statementRu: `Сильнейшая сторона страны — компонент «${comp.label}» (балл ${comp.score.toFixed(0)} из 100)`,
      probabilityPct: 70,
      confidence: "moderate",
      basisRu: `Балл компонента рассчитан моделью БП 3.0 с весом ${comp.weight.toFixed(2)} в итоге страны.`,
      sourceIndexes: [0, 1],
    });
  }
  const weakest = sorted[sorted.length - 1];
  if (weakest !== undefined) {
    judgments.push({
      statementRu: `Главное ограничение страны — компонент «${weakest.label}» (балл ${weakest.score.toFixed(0)} из 100)`,
      probabilityPct: 65,
      confidence: "moderate",
      basisRu:
        "Слабейший компонент тянет медиану БП 3.0 вниз сильнее остальных при текущих весах модели.",
      sourceIndexes: [0, 1],
    });
  }
  for (const alert of countryAlerts.slice(0, 2)) {
    judgments.push({
      statementRu: alert.titleRu,
      probabilityPct: 60,
      confidence: "low",
      basisRu: alert.explanationRu,
      sourceIndexes: [1],
    });
  }

  const alternatives: BriefAlternative[] = [
    {
      statementRu:
        "Фактический потенциал страны ниже расчётного из-за скрытых ограничений запасов и темпов производства",
      whyPlausibleRu:
        "Запасы боеприпасов и реальные темпы выпуска не публикуются большинством стран; модель опирается на оценки.",
      discriminatorRu:
        "Верифицированные данные о запасах и производстве (утечки, спутниковая съёмка производственных площадок, таможенная статистика).",
    },
  ];

  const gapsRu: string[] = [
    "Исторический бэктест модели БП 3.0 на исходах конфликтов не проведён: веса остаются экспертными.",
  ];
  if (!row.hasUP) {
    gapsRu.push(
      "Данные по БПЛА и боеприпасам/производству для страны отсутствуют: компоненты U и P посчитаны по нулевой базовой линии, итог — нижняя граница.",
    );
  }

  return {
    kind: "country",
    titleRu: `Страновая сводка: ${row.name}`,
    dateIso: "2026-11-07",
    horizonRu: "12 месяцев",
    blufRu: `${row.name}: боевой потенциал по модели 3.0 — ${row.total.toFixed(0)} балла (интервал P10–P90: ${row.p10.toFixed(0)}–${row.p90.toFixed(0)}); сдвиг относительно платформенной картины v2: ${row.deltaV2 >= 0 ? "+" : ""}${row.deltaV2.toFixed(1)}.`,
    blufProbabilityPct: 65,
    blufConfidence: "moderate",
    judgments,
    sources,
    alternatives,
    whatWouldChange: [
      "Появление верифицированных данных по запасам боеприпасов и производству БПЛА страны.",
      "Срабатывание критических алертов мониторинга по стране в следующем периоде наблюдения.",
    ],
    gapsRu,
  };
}

export function getBP3Detail(iso: string): {
  row: FacadeBP3Row;
  tornado: { label: string; low: number; high: number; swing: number }[];
  sustainability: unknown | null;
  series: unknown | null;
  briefText: string | null;
  profile: unknown | null;
  /** Грейд провенанса входов каждого компонента (для досье) */
  grades: Record<string, string>;
} | null {
  const normalized: string = iso.trim().toUpperCase();
  const entry: BP3CacheEntry | undefined =
    ensureBP3Cache().byIso.get(normalized);
  if (entry === undefined) {
    return null;
  }
  const { result, row } = entry;

  // Торнадо: топ-8 компонентов по размаху OAT (analyzeSensitivity уже
  // возвращает строки в торнадо-порядке).
  let tornado: { label: string; low: number; high: number; swing: number }[] =
    [];
  try {
    tornado = analyzeSensitivity(result)
      .entries.slice(0, 8)
      .map((e) => ({
        label: e.labelRu,
        low: round1(e.oatLowTotal),
        high: round1(e.oatHighTotal),
        swing: round1(e.oatSwing),
      }));
  } catch {
    tornado = [];
  }

  let sustainability: unknown | null = null;
  try {
    sustainability =
      (getSustainabilityProfile(normalized) as unknown) ?? null;
  } catch {
    sustainability = null;
  }

  let series: unknown | null = null;
  try {
    series = (ensureSeries().get(normalized) as unknown) ?? null;
  } catch {
    series = null;
  }

  let briefText: string | null = null;
  try {
    const countryAlerts: Alert[] = getAlertsFeed().filter(
      (a: Alert) => a.iso3 === normalized,
    );
    briefText = generatePlainTextBrief(
      buildCountryBriefInput(row, countryAlerts),
    );
  } catch {
    briefText = null;
  }

  let profile: unknown | null = null;
  try {
    profile =
      (profile60ByIso3(normalized) as unknown) ??
      (restProfileByIso3(normalized) as unknown) ??
      null;
  } catch {
    profile = null;
  }

  return {
    row,
    tornado,
    sustainability,
    series,
    briefText,
    profile,
    grades: Object.fromEntries(
      BP3_COMPONENTS.map((c) => [c, result.components[c].confidenceGrade]),
    ),
  };
}

// ─── Системы вооружений (data4) ───────────────────────────────────────────────

/**
 * Список систем вооружений: все 220 записей базы data4.
 * q — подстрока по русскому или английскому названию (без регистра);
 * cls — точный classId системы (mbt, fighter, airdef, ...).
 */
export function getSystemsList(q?: string, cls?: string): unknown[] {
  const needle: string | null =
    q !== undefined && q.trim() !== "" ? q.trim().toLowerCase() : null;
  const classFilter: string | null =
    cls !== undefined && cls.trim() !== "" ? cls.trim() : null;
  const filtered = allSystems().filter((system) => {
    if (classFilter !== null && system.classId !== classFilter) {
      return false;
    }
    if (needle !== null) {
      const inRu: boolean = system.nameRu.toLowerCase().includes(needle);
      const inEn: boolean = system.nameEn.toLowerCase().includes(needle);
      if (!inRu && !inEn) {
        return false;
      }
    }
    return true;
  });
  return filtered as unknown as unknown[];
}

// ─── Доска I&W (intel) ────────────────────────────────────────────────────────

/**
 * Каталог Indicators & Warnings.
 *
 * Отдаётся и плоский список `indicators`, и группировка `categories`:
 * доска предупреждения строит список по категориям, а скоринг работает
 * с плоским набором. Раньше здесь были только категории, страница искала
 * плоский список и показывала «0 из 0» — каталог был пуст, а оценка всегда
 * нулевой. Описание индикатора тоже отдаётся: без него карточка признака
 * оставалась без пояснения, что именно наблюдать.
 */
export function getIWBoard(): unknown {
  const indicators = IW_CATALOG.map((indicator) => ({
    id: indicator.id,
    code: indicator.code,
    nameRu: indicator.nameRu,
    descriptionRu: indicator.descriptionRu,
    observableRu: indicator.observableRu,
    thresholdRu: indicator.thresholdRu,
    falsePositiveRu: indicator.falsePositiveRu,
    weight: indicator.weight,
    category: indicator.category as IWCategory,
    phase: indicator.phase,
    leadTimeMinDays: indicator.leadTimeMinDays,
    leadTimeMaxDays: indicator.leadTimeMaxDays,
  }));
  const categories = IW_CATEGORY_PROFILES.map((profile) => ({
    id: profile.id,
    code: profile.code,
    nameRu: profile.nameRu,
    descriptionRu: profile.descriptionRu,
    indicators: indicators.filter(
      (indicator) => indicator.category === profile.id,
    ),
  }));
  return {
    totalIndicators: indicators.length,
    indicators,
    categories,
  };
}
