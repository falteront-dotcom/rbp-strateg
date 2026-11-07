// ─────────────────────────────────────────────────────────────────────────────
// Выносливость в войне: месяцы до исчерпания по категориям (Волна 3)
// Для каждой категории запасов считается чистый месячный поток
// (производство + импорт - расход) и горизонт истощения; итог страны —
// её «бутылочное горлышко»: категория с минимальным горизонтом.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// Метод.
//   Месячный расход = дневной расход x 30 (расчётный месяц движка).
//   Если приток (производство + импорт) >= расхода, категория устойчива:
//   горизонт — бесконечность, страна может вести войну такой интенсивности
//   в этой категории неограниченно долго (пока держится приток).
//   Иначе горизонт в месяцах = запас / (расход - приток).
// Формула сознательно прозрачна: любой аналитик может проверить её вручную
// по трём числам из профиля страны. Сложность начинается в сценариях:
// разгон производства (ramp), перебои импорта (блокада, санкции, удары
// по логистике) и уровни интенсивности меняют все три входа одновременно.
//
// Ограничения честности: модель линейна и не учитывает внутригодовую
// сезонность, перераспределение запасов между театрами и деградацию
// качества запасов на хранении. Это инструмент сравнения горизонтов,
// а не предсказание даты коллапса с точностью до месяца.

import type {
  CountrySustainabilityProfile,
  EnduranceCategoryId,
  StockpileCategoryData,
} from "./data/top30-sustainability";
import {
  ENDURANCE_CATEGORY_LABELS_RU,
  ENDURANCE_CATEGORY_ORDER,
} from "./data/top30-sustainability";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

/** Уровень интенсивности боевых действий */
export type WarIntensity = "low" | "medium" | "high" | "maximum";

/** Вход одной категории для расчёта выносливости */
export interface EnduranceCategoryInput {
  /** Стартовый запас */
  stock: number;
  /** Дневной расход при высокой интенсивности (база профиля) */
  dailyConsumption: number;
  /** Месячное производство на старте */
  monthlyProduction: number;
  /** Месячный импорт на старте */
  monthlyImports: number;
}

/** Параметры сценарного расчёта выносливости */
export interface EnduranceOptions {
  /** Интенсивность войны */
  intensity: WarIntensity;
  /**
   * Разгон производства: за сколько месяцев производство выходит
   * на целевой множитель surgeMultiplier (линейный рост).
   * 0 — разгона нет.
   */
  productionRampMonths: number;
  /** Целевой множитель производства после разгона (1 — без изменений) */
  surgeMultiplier: number;
  /**
   * Коэффициент доступности импорта: 1 — поставки идут полностью,
   * 0.5 — перебои/санкции уполовинили поток, 0 — полная блокада.
   */
  importAvailability: number;
  /** Горизонт моделирования траектории запаса, месяцев */
  horizonMonths: number;
}

/** Критичность категории по горизонту истощения */
export type EnduranceCriticality =
  | "sustainable"
  | "stable"
  | "tight"
  | "critical"
  | "terminal";

/** Результат по одной категории */
export interface CategoryEnduranceResult {
  /** Идентификатор категории */
  category: EnduranceCategoryId;
  /** Название на русском */
  labelRu: string;
  /** Месячный расход при выбранной интенсивности */
  monthlyConsumption: number;
  /** Средний месячный приток за горизонт (производство с разгоном + импорт) */
  averageMonthlyInflow: number;
  /** Чистый месячный поток на старте: приток - расход (отрицательный — проедание) */
  initialNetMonthlyFlow: number;
  /**
   * Месяцев до исчерпания запаса при стартовых потоках.
   * Number.POSITIVE_INFINITY — категория устойчива.
   */
  monthsToExhaustion: number;
  /** Дней до исчерпания (months x 30), для устойчивой — Infinity */
  daysToExhaustion: number;
  /** Критичность */
  criticality: EnduranceCriticality;
  /** Балл выносливости категории 0–100 */
  score: number;
  /** Траектория запаса по месяцам (остаток на конец месяца) */
  trajectory: number[];
  /** Доля запаса, остающаяся к концу горизонта моделирования, % */
  remainingPctAtHorizon: number;
}

/** Полный отчёт выносливости страны */
export interface CountryEnduranceReport {
  /** ISO3 страны */
  iso3: string;
  /** Название на русском */
  nameRu: string;
  /** Результаты по всем категориям */
  categories: CategoryEnduranceResult[];
  /** Категория-бутылочное горлышко (минимальный горизонт) */
  bottleneck: CategoryEnduranceResult;
  /** Второй по критичности ограничитель */
  secondBottleneck: CategoryEnduranceResult | null;
  /** Число устойчивых категорий (горизонт бесконечен) */
  sustainableCategories: number;
  /** Сводный балл выносливости 0–100 (среднее, взвешенное к горлышку) */
  overallScore: number;
  /** Сводный горизонт страны в месяцах — равен горизонту горлышка */
  overallMonths: number;
  /** Вердикт на русском */
  verdictRu: string;
}

/** Строка сравнения стран по выносливости */
export interface EnduranceRankingRow {
  /** ISO3 */
  iso3: string;
  /** Название на русском */
  nameRu: string;
  /** Сводный балл */
  overallScore: number;
  /** Горизонт горлышка в месяцах */
  bottleneckMonths: number;
  /** Категория-горлышко */
  bottleneckCategory: EnduranceCategoryId;
  /** Название горлышка на русском */
  bottleneckLabelRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Константы модели
// ─────────────────────────────────────────────────────────────────────────────

/** Расчётный месяц движка, суток */
export const DAYS_PER_MONTH: number = 30;

/** Множители расхода по уровням интенсивности относительно базы «high» */
export const INTENSITY_MULTIPLIERS: Record<WarIntensity, number> = {
  low: 0.3,
  medium: 0.6,
  high: 1.0,
  maximum: 1.6,
};

/** Названия уровней интенсивности на русском */
export const INTENSITY_LABELS_RU: Record<WarIntensity, string> = {
  low: "Низкая (позиционная, локальные бои)",
  medium: "Средняя (активные действия на отдельных направлениях)",
  high: "Высокая (общевойсковая операция, база профилей)",
  maximum: "Максимальная (тотальная война на истощение)",
};

/** Значения опций по умолчанию: высокая интенсивность без сценариев */
export const DEFAULT_ENDURANCE_OPTIONS: EnduranceOptions = {
  intensity: "high",
  productionRampMonths: 0,
  surgeMultiplier: 1,
  importAvailability: 1,
  horizonMonths: 36,
};

// ─────────────────────────────────────────────────────────────────────────────
// Базовые расчёты одной категории
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Месяцев до исчерпания при постоянных потоках.
 * Чистая формула горизонта: запас / (расход - приток).
 * Приток >= расхода — устойчивая категория, возвращается Infinity.
 * Расход 0 — тоже Infinity (категория не расходуется).
 */
export function monthsToExhaustion(input: EnduranceCategoryInput): number {
  const monthlyConsumption: number = input.dailyConsumption * DAYS_PER_MONTH;
  const inflow: number = input.monthlyProduction + input.monthlyImports;
  const netDrain: number = monthlyConsumption - inflow;
  if (netDrain <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (input.stock <= 0) {
    return 0;
  }
  return input.stock / netDrain;
}

/**
 * Производство в конкретном месяце с учётом линейного разгона.
 * Месяц 1 — стартовое производство; к месяцу rampMonths производство
 * достигает base x surgeMultiplier и далее остаётся на этом уровне.
 */
export function productionAtMonth(
  baseMonthlyProduction: number,
  month: number,
  options: EnduranceOptions,
): number {
  if (options.productionRampMonths <= 0 || options.surgeMultiplier === 1) {
    return baseMonthlyProduction;
  }
  const progress: number = Math.min(1, month / options.productionRampMonths);
  const multiplier: number = 1 + (options.surgeMultiplier - 1) * progress;
  return baseMonthlyProduction * multiplier;
}

/**
 * Траектория запаса по месяцам с разгоном производства и доступностью импорта.
 * Остаток не уходит ниже нуля: месяц, в котором запас кончился, даёт 0,
 * и все последующие месяцы остаются 0.
 */
export function simulateStockTrajectory(
  input: EnduranceCategoryInput,
  options: EnduranceOptions,
): number[] {
  const monthlyConsumption: number =
    input.dailyConsumption *
    DAYS_PER_MONTH *
    INTENSITY_MULTIPLIERS[options.intensity];
  const trajectory: number[] = [];
  let stock: number = input.stock;

  for (let month: number = 1; month <= options.horizonMonths; month += 1) {
    const production: number = productionAtMonth(
      input.monthlyProduction,
      month,
      options,
    );
    const imports: number = input.monthlyImports * options.importAvailability;
    stock = Math.max(0, stock + production + imports - monthlyConsumption);
    trajectory.push(stock);
    if (stock <= 0) {
      // Добиваем оставшиеся месяцы нулями, чтобы длина траектории была стабильной.
      for (let rest: number = month + 1; rest <= options.horizonMonths; rest += 1) {
        trajectory.push(0);
      }
      break;
    }
  }
  return trajectory;
}

/** Критичность по горизонту истощения в месяцах */
export function criticalityForMonths(months: number): EnduranceCriticality {
  if (!Number.isFinite(months)) {
    return "sustainable";
  }
  if (months >= 24) {
    return "stable";
  }
  if (months >= 12) {
    return "tight";
  }
  if (months >= 4) {
    return "critical";
  }
  return "terminal";
}

/** Названия критичности на русском */
export const CRITICALITY_LABELS_RU: Record<EnduranceCriticality, string> = {
  sustainable: "Устойчива (производство и импорт покрывают расход)",
  stable: "Стабильна (горизонт больше двух лет)",
  tight: "Напряжена (горизонт один-два года)",
  critical: "Критична (горизонт месяцы)",
  terminal: "Терминальна (горизонт недели)",
};

/**
 * Балл выносливости категории 0–100 по горизонту.
 * Шкала логарифмически-подобная: 3 месяца — ~30, 12 месяцев — ~60,
 * 36 месяцев — ~85, устойчивость — 100. Точная формула:
 * score = 100 x months / (months + 7) для конечных горизонтов.
 */
export function enduranceScoreForMonths(months: number): number {
  if (!Number.isFinite(months)) {
    return 100;
  }
  if (months <= 0) {
    return 0;
  }
  return Math.round((100 * months) / (months + 7));
}

// ─────────────────────────────────────────────────────────────────────────────
// Расчёт категории и страны
// ─────────────────────────────────────────────────────────────────────────────

/** Привести данные категории профиля к входу движка */
export function categoryInputFromProfile(
  data: StockpileCategoryData,
): EnduranceCategoryInput {
  return {
    stock: data.stock,
    dailyConsumption: data.dailyConsumption,
    monthlyProduction: data.monthlyProduction,
    monthlyImports: data.monthlyImports,
  };
}

/** Полный расчёт одной категории профиля в заданном сценарии */
export function assessCategory(
  category: EnduranceCategoryId,
  data: StockpileCategoryData,
  options: EnduranceOptions,
): CategoryEnduranceResult {
  const input: EnduranceCategoryInput = categoryInputFromProfile(data);
  const monthlyConsumption: number =
    input.dailyConsumption *
    DAYS_PER_MONTH *
    INTENSITY_MULTIPLIERS[options.intensity];

  // Горизонт по стартовым (без разгона) потокам с учётом интенсивности
  // и доступности импорта: это консервативная оценка «как есть сейчас».
  const startInflow: number =
    input.monthlyProduction + input.monthlyImports * options.importAvailability;
  const netDrain: number = monthlyConsumption - startInflow;
  const months: number =
    netDrain <= 0
      ? Number.POSITIVE_INFINITY
      : input.stock <= 0
        ? 0
        : input.stock / netDrain;

  const trajectory: number[] = simulateStockTrajectory(input, options);

  // Средний приток за горизонт — с разгоном производства.
  let inflowSum: number = 0;
  for (let month: number = 1; month <= options.horizonMonths; month += 1) {
    inflowSum +=
      productionAtMonth(input.monthlyProduction, month, options) +
      input.monthlyImports * options.importAvailability;
  }
  const averageInflow: number =
    options.horizonMonths > 0 ? inflowSum / options.horizonMonths : startInflow;

  const lastStock: number =
    trajectory.length > 0 ? trajectory[trajectory.length - 1] : input.stock;

  return {
    category,
    labelRu: ENDURANCE_CATEGORY_LABELS_RU[category],
    monthlyConsumption,
    averageMonthlyInflow: averageInflow,
    initialNetMonthlyFlow: startInflow - monthlyConsumption,
    monthsToExhaustion: months,
    daysToExhaustion: Number.isFinite(months)
      ? months * DAYS_PER_MONTH
      : Number.POSITIVE_INFINITY,
    criticality: criticalityForMonths(months),
    score: enduranceScoreForMonths(months),
    trajectory,
    remainingPctAtHorizon:
      input.stock > 0 ? (lastStock / input.stock) * 100 : 0,
  };
}

/** Сортировка результатов категорий: сначала самое узкое горлышко */
function byHorizonAscending(
  left: CategoryEnduranceResult,
  right: CategoryEnduranceResult,
): number {
  const leftMonths: number = Number.isFinite(left.monthsToExhaustion)
    ? left.monthsToExhaustion
    : Number.MAX_SAFE_INTEGER;
  const rightMonths: number = Number.isFinite(right.monthsToExhaustion)
    ? right.monthsToExhaustion
    : Number.MAX_SAFE_INTEGER;
  return leftMonths - rightMonths;
}

/** Вердикт страны на русском по её горлышку */
function buildCountryVerdictRu(
  profile: CountrySustainabilityProfile,
  bottleneck: CategoryEnduranceResult,
  sustainableCount: number,
  totalCategories: number,
): string {
  if (!Number.isFinite(bottleneck.monthsToExhaustion)) {
    return (
      `${profile.nameRu}: все категории устойчивы при заданной интенсивности — ` +
      `производство и импорт покрывают расход. Война ограничивается не запасами, ` +
      `а политикой, людьми и союзниками.`
    );
  }
  const monthsText: string = bottleneck.monthsToExhaustion.toFixed(1);
  return (
    `${profile.nameRu}: бутылочное горлышко — «${bottleneck.labelRu}», ` +
    `горизонт около ${monthsText} мес. при заданной интенсивности. ` +
    `Устойчивых категорий: ${sustainableCount} из ${totalCategories}. ` +
    `Стратегия противника будет бить именно по горлышку: по его производству, ` +
    `импорту и складам.`
  );
}

/**
 * Полный отчёт выносливости страны по её профилю.
 * Сводный балл: 60% — балл горлышка, 40% — среднее по категориям;
 * так сводка не прячет катастрофу одной категории за успехами остальных.
 */
export function assessCountryEndurance(
  profile: CountrySustainabilityProfile,
  options: EnduranceOptions = DEFAULT_ENDURANCE_OPTIONS,
): CountryEnduranceReport {
  const categories: CategoryEnduranceResult[] = ENDURANCE_CATEGORY_ORDER.map(
    (category: EnduranceCategoryId): CategoryEnduranceResult =>
      assessCategory(category, profile.categories[category], options),
  );

  const sorted: CategoryEnduranceResult[] = [...categories].sort(byHorizonAscending);
  const bottleneck: CategoryEnduranceResult = sorted[0];
  const secondBottleneck: CategoryEnduranceResult | null =
    sorted.length > 1 ? sorted[1] : null;

  const sustainableCategories: number = categories.filter(
    (result: CategoryEnduranceResult): boolean =>
      !Number.isFinite(result.monthsToExhaustion),
  ).length;

  const averageScore: number =
    categories.reduce(
      (sum: number, result: CategoryEnduranceResult): number => sum + result.score,
      0,
    ) / categories.length;
  const overallScore: number = Math.round(
    bottleneck.score * 0.6 + averageScore * 0.4,
  );

  return {
    iso3: profile.iso3,
    nameRu: profile.nameRu,
    categories,
    bottleneck,
    secondBottleneck,
    sustainableCategories,
    overallScore,
    overallMonths: bottleneck.monthsToExhaustion,
    verdictRu: buildCountryVerdictRu(
      profile,
      bottleneck,
      sustainableCategories,
      categories.length,
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Сравнение стран и сценарные исследования
// ─────────────────────────────────────────────────────────────────────────────

/** Рейтинг стран по выносливости при заданном сценарии */
export function rankCountriesByEndurance(
  profiles: CountrySustainabilityProfile[],
  options: EnduranceOptions = DEFAULT_ENDURANCE_OPTIONS,
): EnduranceRankingRow[] {
  const rows: EnduranceRankingRow[] = profiles.map(
    (profile: CountrySustainabilityProfile): EnduranceRankingRow => {
      const report: CountryEnduranceReport = assessCountryEndurance(profile, options);
      return {
        iso3: report.iso3,
        nameRu: report.nameRu,
        overallScore: report.overallScore,
        bottleneckMonths: report.bottleneck.monthsToExhaustion,
        bottleneckCategory: report.bottleneck.category,
        bottleneckLabelRu: report.bottleneck.labelRu,
      };
    },
  );
  rows.sort(
    (left: EnduranceRankingRow, right: EnduranceRankingRow): number =>
      right.overallScore - left.overallScore,
  );
  return rows;
}

/**
 * Сценарий блокады: импорт перекрыт полностью (importAvailability = 0).
 * Возвращает отчёт и дельту горизонта горлышка против базового сценария.
 * Классический вопрос анализа: «что будет, если союзники перестанут поставлять».
 */
export function blockadeImpact(
  profile: CountrySustainabilityProfile,
  baseOptions: EnduranceOptions = DEFAULT_ENDURANCE_OPTIONS,
): {
  base: CountryEnduranceReport;
  blockaded: CountryEnduranceReport;
  bottleneckMonthsDelta: number;
  verdictRu: string;
} {
  const base: CountryEnduranceReport = assessCountryEndurance(profile, baseOptions);
  const blockaded: CountryEnduranceReport = assessCountryEndurance(profile, {
    ...baseOptions,
    importAvailability: 0,
  });
  const baseMonths: number = base.bottleneck.monthsToExhaustion;
  const blockadedMonths: number = blockaded.bottleneck.monthsToExhaustion;
  const delta: number =
    Number.isFinite(baseMonths) && Number.isFinite(blockadedMonths)
      ? blockadedMonths - baseMonths
      : Number.isFinite(blockadedMonths)
        ? blockadedMonths
        : 0;
  const verdictRu: string = !Number.isFinite(blockadedMonths)
    ? `${profile.nameRu} не зависит от импорта критично: даже при полной блокаде горлышко устойчиво.`
    : `${profile.nameRu} при блокаде импорта: горлышко «${blockaded.bottleneck.labelRu}» ` +
      `с горизонтом ${blockadedMonths.toFixed(1)} мес. ` +
      (Number.isFinite(baseMonths)
        ? `Потеря горизонта против базы: ${Math.abs(delta).toFixed(1)} мес.`
        : "В базовом сценарии страна была устойчива — блокада создаёт горлышко из ничего.");
  return { base, blockaded, bottleneckMonthsDelta: delta, verdictRu };
}

/**
 * Какой месячный приток (производство + импорт) нужен категории,
 * чтобы стать устойчивой при заданной интенсивности.
 * Ответ — целевое значение для промышленной мобилизации.
 */
export function requiredInflowForSustainability(
  data: StockpileCategoryData,
  intensity: WarIntensity,
): number {
  return (
    data.dailyConsumption * DAYS_PER_MONTH * INTENSITY_MULTIPLIERS[intensity]
  );
}

/**
 * На сколько месяцев хватит запаса категории при заданном горизонте войны,
 * если война продлится дольше: дефицит категории к концу горизонта
 * (сколько единиц не хватит при стартовых потоках без разгона).
 * Положительное число — дефицит, ноль/отрицательное — запас покрывает горизонт.
 */
export function shortfallAtHorizon(
  data: StockpileCategoryData,
  options: EnduranceOptions,
): number {
  const trajectory: number[] = simulateStockTrajectory(
    categoryInputFromProfile(data),
    options,
  );
  if (trajectory.length === 0) {
    return 0;
  }
  const monthlyConsumption: number =
    data.dailyConsumption *
    DAYS_PER_MONTH *
    INTENSITY_MULTIPLIERS[options.intensity];
  // Если запас закончился раньше горизонта, дефицит — расход оставшихся месяцев.
  const firstZeroIndex: number = trajectory.findIndex(
    (value: number): boolean => value <= 0,
  );
  if (firstZeroIndex === -1) {
    return 0;
  }
  const remainingMonths: number = options.horizonMonths - (firstZeroIndex + 1);
  return remainingMonths * monthlyConsumption;
}

// ─────────────────────────────────────────────────────────────────────────────
// Сценарные пресеты и текстовый отчёт
// ─────────────────────────────────────────────────────────────────────────────

/** Именованный сценарный пресет выносливости */
export interface EnduranceScenarioPreset {
  /** Идентификатор */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Что моделирует пресет */
  descriptionRu: string;
  /** Опции расчёта */
  options: EnduranceOptions;
}

/** Каталог сценарных пресетов выносливости */
export const ENDURANCE_SCENARIO_PRESETS: EnduranceScenarioPreset[] = [
  {
    id: "baseline_high",
    nameRu: "База: высокая интенсивность, снабжение как сейчас",
    descriptionRu:
      "Текущие производство и импорт, война высокой интенсивности. Точка отсчёта для всех остальных сценариев.",
    options: {
      intensity: "high",
      productionRampMonths: 0,
      surgeMultiplier: 1,
      importAvailability: 1,
      horizonMonths: 36,
    },
  },
  {
    id: "industrial_mobilization",
    nameRu: "Промышленная мобилизация: разгон производства x2 за год",
    descriptionRu:
      "Военная экономика: производство удваивается линейно за 12 месяцев, импорт сохранён. Проверяет, успевает ли разгон до исчерпания стартовых запасов.",
    options: {
      intensity: "high",
      productionRampMonths: 12,
      surgeMultiplier: 2,
      importAvailability: 1,
      horizonMonths: 36,
    },
  },
  {
    id: "blockade",
    nameRu: "Блокада: импорт перекрыт полностью",
    descriptionRu:
      "Санкции, морская блокада или политическое решение союзников прекращают внешние поставки с первого месяца.",
    options: {
      intensity: "high",
      productionRampMonths: 0,
      surgeMultiplier: 1,
      importAvailability: 0,
      horizonMonths: 36,
    },
  },
  {
    id: "partial_supply_crisis",
    nameRu: "Кризис снабжения: импорт уполовинен, максимальная интенсивность",
    descriptionRu:
      "Худший реалистичный случай: противник навязывает максимальный темп расхода, а внешние поставки идут с перебоями.",
    options: {
      intensity: "maximum",
      productionRampMonths: 18,
      surgeMultiplier: 1.5,
      importAvailability: 0.5,
      horizonMonths: 36,
    },
  },
  {
    id: "positional_war",
    nameRu: "Позиционная война: низкая интенсивность, длинный горизонт",
    descriptionRu:
      "Замороженный фронт с локальными боями: расход втрое ниже базового, горизонт моделирования — пять лет.",
    options: {
      intensity: "low",
      productionRampMonths: 0,
      surgeMultiplier: 1,
      importAvailability: 1,
      horizonMonths: 60,
    },
  },
];

/** Найти пресет выносливости по идентификатору */
export function getEnduranceScenarioPreset(
  id: string,
): EnduranceScenarioPreset | undefined {
  return ENDURANCE_SCENARIO_PRESETS.find(
    (preset: EnduranceScenarioPreset): boolean => preset.id === id,
  );
}

/** Форматирование горизонта для текста: месяцы или «устойчиво» */
export function formatMonthsRu(months: number): string {
  if (!Number.isFinite(months)) {
    return "устойчиво (приток покрывает расход)";
  }
  if (months < 1) {
    return `${Math.round(months * DAYS_PER_MONTH)} сут.`;
  }
  return `${months.toFixed(1)} мес.`;
}

/**
 * Текстовый отчёт выносливости страны для сводок и UI.
 * Формат: заголовок, строка по каждой категории, горлышко, вердикт.
 */
export function formatEnduranceReportRu(report: CountryEnduranceReport): string {
  const lines: string[] = [];
  lines.push(`ВЫНОСЛИВОСТЬ: ${report.nameRu} (${report.iso3})`);
  lines.push(`Сводный балл: ${report.overallScore}/100`);
  for (const category of report.categories) {
    lines.push(
      `- ${category.labelRu}: ${formatMonthsRu(category.monthsToExhaustion)} ` +
        `[${CRITICALITY_LABELS_RU[category.criticality]}]`,
    );
  }
  lines.push(
    `Бутылочное горлышко: ${report.bottleneck.labelRu} — ` +
      formatMonthsRu(report.bottleneck.monthsToExhaustion),
  );
  if (report.secondBottleneck !== null) {
    lines.push(
      `Второй ограничитель: ${report.secondBottleneck.labelRu} — ` +
        formatMonthsRu(report.secondBottleneck.monthsToExhaustion),
    );
  }
  lines.push(`Вердикт: ${report.verdictRu}`);
  return lines.join("\n");
}
