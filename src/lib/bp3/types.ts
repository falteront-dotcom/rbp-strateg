// ─────────────────────────────────────────────────────────────────────────────
// BP Model 3.0 – Core Types (bp-v3)
// Волна 1 дорожной карты 3.0: модель БП 3.0
//
// Отличия от bp-v2 (src/lib/bp/types.ts):
//   1. Два новых компонента войны 2022–2026 гг.:
//      U — БПЛА и роботизированные системы;
//      P — боеприпасы и оборонное производство.
//   2. Провенанс до значения: каждое входное число несёт источник, год,
//      грейд надёжности и флаг «оценка» (закрывает п. 13 критики 2.0).
//   3. Итог — не точечное число, а распределение: медиана + P10/P90
//      (закрывает п. 4 критики 2.0 — «иллюзия точности»).
//
// Strict TS, no `any`, только относительные импорты внутри bp3.
// ─────────────────────────────────────────────────────────────────────────────

/** Версия модели: bp-v2 заморожена, bp-v3 живёт рядом с флагом A/B */
export const MODEL_VERSION_BP3 = "bp-v3" as const;

// ─── Компоненты ──────────────────────────────────────────────────────────────

/** Компоненты, унаследованные из bp-v2 без изменения смысла */
export const V2_COMPONENTS = [
  "weapon",
  "manpower",
  "logistics",
  "c2",
  "economy",
  "doctrine",
  "readiness",
  "terrain",
] as const;

export type V2Component = (typeof V2_COMPONENTS)[number];

/** Новые компоненты Волны 1 */
export const NEW_COMPONENTS = ["uav", "munitions"] as const;

export type NewComponent = (typeof NEW_COMPONENTS)[number];

/** Все 10 компонентов БП 3.0 */
export const BP3_COMPONENTS = [...V2_COMPONENTS, ...NEW_COMPONENTS] as const;

export type BP3Component = (typeof BP3_COMPONENTS)[number];

/** Человекочитаемые названия компонентов (рус.) */
export const BP3_COMPONENT_LABELS_RU: Record<BP3Component, string> = {
  weapon: "Оружие (платформы)",
  manpower: "Люди",
  logistics: "Логистика",
  c2: "Управление (C2)",
  economy: "Экономика",
  doctrine: "Доктрина",
  readiness: "Боеготовность",
  terrain: "География",
  uav: "БПЛА и роботизированные системы",
  munitions: "Боеприпасы и производство",
};

// ─── Провенанс ───────────────────────────────────────────────────────────────

/**
 * Грейд надёжности значения (упрощённая адмиралтейская шкала, ось источника):
 *   A — официальный/первичный источник, подтверждён независимо;
 *   B — авторитетный вторичный источник (SIPRI, IISS, FAS);
 *   C — открытые оценки нескольких источников, разброс умеренный;
 *   D — единичная оценка / заявление стороны / экстраполяция;
 *   E — экспертное суждение без публичной базы, широкий разброс.
 */
export const PROVENANCE_GRADES = ["A", "B", "C", "D", "E"] as const;

export type ProvenanceGrade = (typeof PROVENANCE_GRADES)[number];

/**
 * Относительное стандартное отклонение входа по грейду (доля от значения).
 * Используется Монте-Карло: чем ниже грейд, тем шире распределение итога.
 * Значения — методическая константа bp-v3, а не измеренная величина.
 */
export const GRADE_RELATIVE_SIGMA: Record<ProvenanceGrade, number> = {
  A: 0.05,
  B: 0.1,
  C: 0.18,
  D: 0.3,
  E: 0.45,
};

/** Числовой ранг грейда: больше — хуже (для агрегации «худший вход») */
export const GRADE_RANK: Record<ProvenanceGrade, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
};

/** Грейд по числовому рангу (обратное отображение GRADE_RANK) */
export function gradeFromRank(rank: number): ProvenanceGrade {
  const clamped: number = Math.min(
    Math.max(Math.round(rank), 0),
    PROVENANCE_GRADES.length - 1,
  );
  const grade: ProvenanceGrade | undefined = PROVENANCE_GRADES[clamped];
  return grade ?? "E";
}

/** Относительная сигма по грейду */
export function gradeSigma(grade: ProvenanceGrade): number {
  return GRADE_RELATIVE_SIGMA[grade];
}

/**
 * Значение с провенансом — базовый кирпич данных БП 3.0.
 * Ни одно число в bp3 не существует без источника и года.
 */
export interface SourcedValue {
  /** Само значение (единицы — по контексту поля) */
  value: number;
  /** Источник: издание/база/организация, не «интернет» */
  source: string;
  /** Год, к которому относится значение (не год публикации, если иной) */
  year: number;
  /** Грейд надёжности источника */
  grade: ProvenanceGrade;
  /** true, если значение — оценка/экстраполяция, а не публикуемая цифра */
  estimated: boolean;
  /** Пояснение: диапазон в источниках, метод оценки, оговорки */
  noteRu?: string;
}

/**
 * Балл компонента v2 (0–100) с провенансом.
 * В bp-v3 баллы v2-компонентов принимаются как входы: пересчёт v2-ядра
 * не входит в Волну 1, но неопределённость входов уже пробрасывается.
 */
export interface ComponentInput {
  /** Балл 0–100, рассчитанный ядром bp-v2 */
  score: number;
  /** Источник данных, из которых ядро v2 посчитало балл */
  source: string;
  /** Год данных */
  year: number;
  /** Грейд надёжности входных данных компонента */
  grade: ProvenanceGrade;
  /** true, если значимая часть входов компонента — оценки */
  estimated: boolean;
}

// ─── Компонент U: БПЛА ───────────────────────────────────────────────────────

/**
 * Сырые входы компонента U (БПЛА и роботизированные системы).
 * Классы парка разнесены, потому что война 2022–2026 гг. показала:
 * «количество дронов» одним числом не значит ничего — ISR, ударные
 * машины и FPV — разные экономики и разные эффекты на поле боя.
 */
export interface UavRawData {
  /** Разведывательные БПЛА всех классов (тактические + MALE/HALE), шт. */
  isrFleet: SourcedValue;
  /** Ударные БПЛА (MALE ударные, ОТРК-класс не сюда), шт. */
  strikeFleet: SourcedValue;
  /** Запас барражирующих боеприпасов (типа Shahed/Lancet-классов), шт. */
  loiteringStock: SourcedValue;
  /** Производство FPV-дронов, шт./мес (факт, не заявленная мощность) */
  fpvProductionPerMonth: SourcedValue;
  /** Спутниковое сопровождение: разведка/наведение, рубрика 1–10 */
  satelliteSupport: SourcedValue;
  /** РЭБ-сопровождение БПЛА-операций, рубрика 1–10 */
  ewEscort: SourcedValue;
}

// ─── Компонент P: боеприпасы и производство ──────────────────────────────────

/**
 * Сырые входы компонента P (боеприпасы и оборонное производство).
 * Ключевая метрика — не «сколько снарядов», а «на сколько месяцев войны
 * высокой интенсивности хватит запаса при текущем расходе и производстве».
 */
export interface MunitionsRawData {
  /** Запас артиллерийских снарядов (все калибры, в пересчёте на 152/155 мм), тыс. шт. */
  artilleryShellStockThousands: SourcedValue;
  /** Производство артиллерийских снарядов, тыс. шт./мес */
  artilleryShellProductionPerMonthThousands: SourcedValue;
  /** Расход артиллерийских снарядов в войне высокой интенсивности, тыс. шт./мес */
  artilleryShellConsumptionPerMonthThousands: SourcedValue;
  /** Суммарный запас управляемых ракет (баллистические + крылатые + ОТР), шт. */
  missileStockTotal: SourcedValue;
  /** Производство управляемых ракет, шт./мес */
  missileProductionPerMonth: SourcedValue;
  /** Запас зенитных управляемых ракет (всех комплексов ПВО), шт. */
  samInterceptorStock: SourcedValue;
  /** Доля импортных критических компонентов в производстве вооружений, % (0–100) */
  importDependencyPct: SourcedValue;
}

// ─── Субъективные шкалы ──────────────────────────────────────────────────────

/**
 * Субъективные баллы 1–10 с привязкой к анкерным рубрикам (rubrics.ts).
 * В bp-v2 эти баллы жили в БД без шкалы; в bp-v3 каждый балл обязан
 * ссылаться на рубрику и проходить два независимых скоринг-прохода.
 */
export interface QualitativeInput {
  /** C4ISR по рубрике C4ISR_RUBRIC */
  c2Score: SourcedValue;
  /** РЭБ по рубрике EW_RUBRIC */
  ewScore: SourcedValue;
  /** Моральный индекс по рубрике MORALE_RUBRIC */
  moraleScore: SourcedValue;
}

// ─── Вход страны для БП 3.0 ──────────────────────────────────────────────────

/** Полный вход расчёта БП 3.0 по одной стране */
export interface CountryBP3Input {
  isoCode: string;
  name: string;
  nameRu: string;
  /** Баллы 8 компонентов bp-v2 с провенансом */
  v2Scores: Record<V2Component, ComponentInput>;
  /** Сырые данные компонента U */
  uav: UavRawData;
  /** Сырые данные компонента P */
  munitions: MunitionsRawData;
  /** Субъективные баллы с рубриками (необязательно на Волне 1) */
  qualitative?: QualitativeInput;
}

// ─── Веса БП 3.0 ─────────────────────────────────────────────────────────────

/** Веса 10 компонентов (сумма строго 1.0) */
export type WeightsBP3 = Record<BP3Component, number>;

/**
 * Веса bp-v3. Логика перебалансировки относительно v2:
 * суммарная доля «платформенных» компонентов снижена (weapon 0.20 → 0.16),
 * высвобожденные 0.20 отданы компонентам U (0.10) и P (0.10) — факторам,
 * которые война 2022–2026 гг. показала решающими. Веса по-прежнему
 * экспертные (калибровка — отдельная задача Волны 1, бэктест на исходах),
 * поэтому bp-v3 обязательно публикует анализ чувствительности вместе
 * с баллом: потребитель видит, насколько итог зависит от выбора весов.
 */
export const DEFAULT_WEIGHTS_BP3: WeightsBP3 = {
  weapon: 0.16,
  manpower: 0.12,
  logistics: 0.1,
  c2: 0.09,
  economy: 0.12,
  doctrine: 0.06,
  readiness: 0.08,
  terrain: 0.07,
  uav: 0.1,
  munitions: 0.1,
} as const;

/**
 * Валидация весов БП 3.0 — тот же контракт, что validateWeights в bp-v2:
 * все компоненты присутствуют, веса конечны и неотрицательны, сумма 1.0 ± ε.
 */
export function validateWeightsBP3(
  weights: Partial<WeightsBP3>,
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  for (const comp of BP3_COMPONENTS) {
    if (weights[comp] === undefined) {
      errors.push(`Missing weight for component "${comp}"`);
    }
  }

  for (const comp of BP3_COMPONENTS) {
    const w: number | undefined = weights[comp];
    if (
      w !== undefined &&
      (typeof w !== "number" || !Number.isFinite(w) || w < 0)
    ) {
      errors.push(
        `Weight for "${comp}" must be a finite non-negative number, got ${w}`,
      );
    }
  }

  const sum: number = BP3_COMPONENTS.reduce(
    (acc, comp) => acc + (weights[comp] ?? 0),
    0,
  );
  if (Math.abs(sum - 1.0) > 1e-6) {
    errors.push(`Weights must sum to 1.0, got ${sum.toFixed(8)}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

// ─── Результаты ──────────────────────────────────────────────────────────────

/** Результат одного компонента БП 3.0 */
export interface ComponentResultBP3 {
  component: BP3Component;
  /** Точечная оценка балла 0–100 (детерминированный расчёт) */
  score: number;
  /** Абсолютная сигма балла (пункты шкалы), выведенная из грейдов входов */
  sigma: number;
  /** Вес компонента в конфигурации расчёта */
  weight: number;
  /** Вклад в точечный итог: score × weight */
  weightedScore: number;
  /** Разбивка по подметрикам: имя → значение (сырьё и подбаллы) */
  breakdown: Record<string, number>;
  /** Агрегированный грейд входов компонента (средний ранг, округлён) */
  confidenceGrade: ProvenanceGrade;
}

/** Сводка неопределённости итога по Монте-Карло */
export interface UncertaintySummary {
  /** Медиана распределения итога — публикуемый балл БП 3.0 */
  median: number;
  /** Среднее распределения */
  mean: number;
  /** 10-й перцентиль: «пессимистичная» граница */
  p10: number;
  /** 90-й перцентиль: «оптимистичная» граница */
  p90: number;
  /** Стандартное отклонение распределения */
  stdDev: number;
  /** Число итераций Монте-Карло */
  iterations: number;
  /** Сид RNG: расчёт полностью воспроизводим по (входы, веса, сид) */
  seed: number;
}

/** Полный результат БП 3.0 по стране */
export interface CountryBP3Result {
  isoCode: string;
  name: string;
  nameRu: string;
  /** Всегда MODEL_VERSION_BP3: результат v3 не смешивается с v2 */
  modelVersion: typeof MODEL_VERSION_BP3;
  /** Итог как распределение, не как точка */
  total: UncertaintySummary;
  /** Детерминированный итог по точечным оценкам (для сверки с Монте-Карло) */
  pointEstimate: number;
  /** Все 10 компонентов с сигмами */
  components: Record<BP3Component, ComponentResultBP3>;
  /** Веса, фактически использованные в расчёте */
  weightsUsed: WeightsBP3;
  /** Ранг по медиане внутри рассчитанной когорты; null вне когорты */
  rank: number | null;
}

/** Опции расчёта БП 3.0 */
export interface CalculateBP3Options {
  /** Переопределение весов (по умолчанию DEFAULT_WEIGHTS_BP3) */
  weights?: WeightsBP3;
  /** Итерации Монте-Карло (по умолчанию 4000) */
  iterations?: number;
  /**
   * Базовый сид RNG. Итоговый сид страны = baseSeed + hash(isoCode),
   * поэтому добавление страны в когорту не меняет чужие распределения.
   */
  baseSeed?: number;
}
