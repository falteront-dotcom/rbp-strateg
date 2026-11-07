// ─────────────────────────────────────────────────────────────────────────────
// Мобилизационная модель: волны, сроки, качество, экономический потолок
// (Волна 3)
// Сколько людей страна может поставить под ружьё волнами, когда каждая
// волна будет готова, какого она будет качества и где проходит потолок,
// за которым мобилизация разрушает экономику быстрее, чем армию.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// Метод.
//   Волна мобилизации описывается четырьмя числами: размер, месяц призыва,
//   длительность обучения, месяц готовности (призыв + обучение).
//   Качество волны падает с её номером (первыми призывают подготовленный
//   резерв, затем — всё менее подготовленных) и растёт с длиной обучения:
//       quality = baseQuality x trainingFactor(месяцы обучения) x decay^(номер)
//   Потолок мобилизации — минимум из трёх ограничений:
//     1) демография: годные к службе;
//     2) экономика: трудоспособное население x устойчивая доля под ружьём;
//     3) кадры: обученный резерв + пропускная способность учебной системы
//        за горизонт (учебные части не штампуют солдат бесконечно).
//   Генератор волн никогда не превышает потолок: последняя волна
//   урезается до остатка потолка — это инвариант модели, проверяемый
//   в verify_warfare3.ts.
//
// Исторические якоря (для калибровки ожиданий, не для формулы):
//   Украина 2022: ~1 млн под ружьём при населении ~38 млн контролируемой
//     территории — доля трудоспособных ~10–15%, экономика на внешнем
//     финансировании.
//   Россия 2022: частичная мобилизация 300 тыс. + контрактная подпитка,
//     без объявления всеобщей мобилизации — политический, не демографический
//     предел.
//   Израиль 2023: 360 тыс. резервистов за 48 часов — предел не призыва,
//     а экономики: длительная мобилизация резерва останавливает гражданские
//     отрасли.
//   СССР 1941–45: ~34 млн прошедших через армию при предельной доле
//     трудоспособных — верхняя граница тотальной войны ценой экономики.

import type {
  CountrySustainabilityProfile,
  MobilizationBaseData,
} from "./data/top30-sustainability";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

/** Параметры мобилизационного плана */
export interface MobilizationPlanOptions {
  /** Размер первой волны, человек */
  firstWaveSize: number;
  /**
   * Коэффициент убывания размера волн: каждая следующая волна —
   * previous x waveDecay (1 — равные волны, 0.8 — убывающие).
   */
  waveDecay: number;
  /** Максимальное число волн в плане */
  maxWaves: number;
  /** Интервал между призывами волн, месяцев */
  waveIntervalMonths: number;
  /** Длительность обучения волны, месяцев */
  trainingMonths: number;
  /**
   * Убывание длительности обучения для поздних волн (месяцев за волну):
   * под давлением фронта поздние волны учат быстрее и хуже. 0 — без убывания.
   */
  trainingDecayPerWave: number;
  /** Минимальная длительность обучения, месяцев (ниже не опускаемся) */
  minTrainingMonths: number;
  /** Базовое качество призывного контингента 0–1 (1 — обученный резерв первой очереди) */
  baseQuality: number;
  /** Множитель убывания качества по номеру волны, на волну (например 0.92) */
  qualityDecayPerWave: number;
  /** Горизонт пропускной способности учебной системы, месяцев */
  trainingHorizonMonths: number;
  /** Пропускная способность учебной системы, человек в месяц */
  trainingThroughputPerMonth: number;
}

/** Одна волна мобилизации */
export interface MobilizationWave {
  /** Номер волны, 1-based */
  index: number;
  /** Размер волны после урезания потолком, человек */
  size: number;
  /** Месяц призыва от начала мобилизации (0 — первый месяц) */
  callupMonth: number;
  /** Фактическая длительность обучения этой волны, месяцев */
  trainingMonths: number;
  /** Месяц готовности волны (callupMonth + trainingMonths) */
  readyMonth: number;
  /** Качество волны 0–1 */
  qualityFactor: number;
  /** Эффективная численность волны: size x qualityFactor */
  effectiveSize: number;
  /** Накопленная мобилизованная численность после этой волны */
  cumulativeMobilized: number;
  /** Доля трудоспособного населения под ружьём после этой волны, % (с учётом действующего состава) */
  workforceSharePct: number;
  /** Была ли волна урезана потолком */
  truncatedByCeiling: boolean;
}

/** Какое ограничение оказалось потолком */
export type MobilizationCeilingKind = "demography" | "economy" | "training";

/** Потолок мобилизации с разбором ограничений */
export interface MobilizationCeiling {
  /** Итоговый потолок: минимум ограничений, человек */
  ceiling: number;
  /** Какое ограничение связало потолок */
  bindingConstraint: MobilizationCeilingKind;
  /** Ограничение демографии: годные к службе минус действующий состав */
  demographyLimit: number;
  /** Ограничение экономики: трудоспособные x устойчивая доля минус действующий состав */
  economyLimit: number;
  /** Ограничение кадров: обученный резерв + пропускная способность за горизонт */
  trainingLimit: number;
  /** Устойчивая доля трудоспособных под ружьём из профиля, % */
  sustainableSharePct: number;
  /** Пояснение на русском */
  explanationRu: string;
}

/** Итог мобилизационного плана */
export interface MobilizationPlanResult {
  /** ISO3 страны */
  iso3: string;
  /** Название страны на русском */
  nameRu: string;
  /** Потолок мобилизации */
  ceiling: MobilizationCeiling;
  /** Волны плана */
  waves: MobilizationWave[];
  /** Всего мобилизовано планом, человек */
  totalMobilized: number;
  /** Эффективная суммарная численность мобилизованных с учётом качества */
  totalEffective: number;
  /** Пиковая доля трудоспособных под ружьём, % (актив + все волны) */
  peakWorkforceSharePct: number;
  /** Устойчивая численность сил: актив + мобилизованные, которых экономика держит долго */
  sustainableForceSize: number;
  /** Месяц, когда последняя волна готова (null — волн нет) */
  lastWaveReadyMonth: number | null;
  /** Средневзвешенное качество мобилизованных 0–1 */
  averageQuality: number;
  /** Оценка экономического напряжения */
  economicStrain: "low" | "moderate" | "high" | "breaking";
  /** Вердикт на русском */
  verdictRu: string;
}

/** Точка временной шкалы численности сил */
export interface ForceTimelinePoint {
  /** Месяц от начала мобилизации */
  month: number;
  /** Готовых мобилизованных к этому месяцу (накопленно), человек */
  readyMobilized: number;
  /** Суммарные силы: действующий состав + готовые волны */
  totalForce: number;
  /** Эффективные силы с учётом качества готовых волн */
  effectiveForce: number;
}

/** Сравнение мобилизационного потенциала двух стран */
export interface MobilizationComparison {
  /** Результат страны A */
  a: MobilizationPlanResult;
  /** Результат страны B */
  b: MobilizationPlanResult;
  /** Кто может выставить больше эффективных сил; null — паритет в пределах 5% */
  advantage: "a" | "b" | null;
  /** Пояснение на русском */
  explanationRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Качество: обучение и номер волны
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Коэффициент качества от длительности обучения.
 * Опорные точки по военной педагогике и практике 2022–2025:
 *   1 мес — 0.35 (базовая подготовка, боец ограниченно годен);
 *   2 мес — 0.48; 3 мес — 0.58 (минимум для линейной пехоты);
 *   4 мес — 0.66; 6 мес — 0.78 (слаживание подразделения);
 *   9 мес — 0.9; 12 мес — 1.0 (полный цикл мирного времени).
 * Между точками — линейная интерполяция, выше 12 мес — плато 1.0.
 */
export const TRAINING_QUALITY_CURVE: ReadonlyArray<{
  months: number;
  factor: number;
}> = [
  { months: 0, factor: 0.15 },
  { months: 1, factor: 0.35 },
  { months: 2, factor: 0.48 },
  { months: 3, factor: 0.58 },
  { months: 4, factor: 0.66 },
  { months: 6, factor: 0.78 },
  { months: 9, factor: 0.9 },
  { months: 12, factor: 1.0 },
];

/** Коэффициент качества для заданной длительности обучения */
export function trainingQualityFactor(trainingMonths: number): number {
  const curve: ReadonlyArray<{ months: number; factor: number }> =
    TRAINING_QUALITY_CURVE;
  if (trainingMonths <= curve[0].months) {
    return curve[0].factor;
  }
  for (let i: number = 1; i < curve.length; i += 1) {
    const upper: { months: number; factor: number } = curve[i];
    if (trainingMonths <= upper.months) {
      const lower: { months: number; factor: number } = curve[i - 1];
      const span: number = upper.months - lower.months;
      const progress: number = span > 0 ? (trainingMonths - lower.months) / span : 0;
      return lower.factor + (upper.factor - lower.factor) * progress;
    }
  }
  return 1.0;
}

/**
 * Качество волны: база x обучение x убывание по номеру волны.
 * Первая волна (подготовленный резерв) получает полный базовый фактор,
 * каждая следующая — умножается на qualityDecayPerWave.
 */
export function qualityForWave(
  waveIndex: number,
  trainingMonths: number,
  baseQuality: number,
  qualityDecayPerWave: number,
): number {
  const decay: number = Math.pow(qualityDecayPerWave, Math.max(0, waveIndex - 1));
  const quality: number =
    baseQuality * trainingQualityFactor(trainingMonths) * decay;
  return Math.max(0.05, Math.min(1, quality));
}

// ─────────────────────────────────────────────────────────────────────────────
// Потолок мобилизации
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Потолок мобилизации страны: сколько человек можно ДОПОЛНИТЕЛЬНО
 * поставить под ружьё сверх действующего состава, не разрушая тыл.
 * Потолок — минимум демографии, экономики и кадровой пропускной способности.
 */
export function mobilizationCeiling(
  base: MobilizationBaseData,
  options: MobilizationPlanOptions,
): MobilizationCeiling {
  const workingAge: number = base.workingAgeMillions * 1_000_000;
  const fitForService: number = base.fitForServiceMillions * 1_000_000;

  const demographyLimit: number = Math.max(0, fitForService - base.activePersonnel);
  const economyLimit: number = Math.max(
    0,
    (workingAge * base.maxSustainableSharePct) / 100 - base.activePersonnel,
  );
  const trainingLimit: number =
    base.trainedReserve +
    options.trainingThroughputPerMonth * options.trainingHorizonMonths;

  let ceiling: number = demographyLimit;
  let binding: MobilizationCeilingKind = "demography";
  if (economyLimit < ceiling) {
    ceiling = economyLimit;
    binding = "economy";
  }
  if (trainingLimit < ceiling) {
    ceiling = trainingLimit;
    binding = "training";
  }

  const explanations: Record<MobilizationCeilingKind, string> = {
    demography:
      "Потолок задаёт демография: годных к службе сверх действующего состава не хватает.",
    economy:
      "Потолок задаёт экономика: устойчивая доля трудоспособных под ружьём исчерпана раньше демографии — дальше мобилизация съедает производство, включая военное.",
    training:
      "Потолок задают кадры: обученный резерв и пропускная способность учебных частей кончаются раньше людей и экономики — призвать можно больше, обучить нельзя.",
  };

  return {
    ceiling: Math.floor(ceiling),
    bindingConstraint: binding,
    demographyLimit: Math.floor(demographyLimit),
    economyLimit: Math.floor(economyLimit),
    trainingLimit: Math.floor(trainingLimit),
    sustainableSharePct: base.maxSustainableSharePct,
    explanationRu: explanations[binding],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Генератор волн
// ─────────────────────────────────────────────────────────────────────────────

/** Значения плана по умолчанию: умеренная мобилизация мирной армии */
export const DEFAULT_MOBILIZATION_OPTIONS: MobilizationPlanOptions = {
  firstWaveSize: 100_000,
  waveDecay: 0.9,
  maxWaves: 8,
  waveIntervalMonths: 2,
  trainingMonths: 4,
  trainingDecayPerWave: 0,
  minTrainingMonths: 2,
  baseQuality: 0.9,
  qualityDecayPerWave: 0.93,
  trainingHorizonMonths: 24,
  trainingThroughputPerMonth: 30_000,
};

/**
 * Сгенерировать волны мобилизации по плану.
 * ИНВАРИАНТ: суммарная мобилизованная численность никогда не превышает
 * потолок — последняя волна урезается, генерация останавливается,
 * когда потолок исчерпан или достигнут лимит волн.
 */
export function generateMobilizationWaves(
  base: MobilizationBaseData,
  options: MobilizationPlanOptions,
): { waves: MobilizationWave[]; ceiling: MobilizationCeiling } {
  const ceiling: MobilizationCeiling = mobilizationCeiling(base, options);
  const workingAge: number = base.workingAgeMillions * 1_000_000;
  const waves: MobilizationWave[] = [];
  let cumulative: number = 0;

  for (let index: number = 1; index <= options.maxWaves; index += 1) {
    const remainingCeiling: number = ceiling.ceiling - cumulative;
    if (remainingCeiling <= 0) {
      break;
    }
    const plannedSize: number = Math.floor(
      options.firstWaveSize * Math.pow(options.waveDecay, index - 1),
    );
    if (plannedSize <= 0) {
      break;
    }
    const size: number = Math.min(plannedSize, remainingCeiling);
    const truncated: boolean = size < plannedSize;

    const trainingMonths: number = Math.max(
      options.minTrainingMonths,
      options.trainingMonths - options.trainingDecayPerWave * (index - 1),
    );
    const callupMonth: number = (index - 1) * options.waveIntervalMonths;
    const quality: number = qualityForWave(
      index,
      trainingMonths,
      options.baseQuality,
      options.qualityDecayPerWave,
    );

    cumulative += size;
    waves.push({
      index,
      size,
      callupMonth,
      trainingMonths,
      readyMonth: callupMonth + trainingMonths,
      qualityFactor: quality,
      effectiveSize: Math.floor(size * quality),
      cumulativeMobilized: cumulative,
      workforceSharePct:
        workingAge > 0
          ? ((base.activePersonnel + cumulative) / workingAge) * 100
          : 0,
      truncatedByCeiling: truncated,
    });

    if (truncated) {
      break;
    }
  }

  return { waves, ceiling };
}

// ─────────────────────────────────────────────────────────────────────────────
// Итог плана, временная шкала, сравнения
// ─────────────────────────────────────────────────────────────────────────────

/** Экономическое напряжение по пиковой доле трудоспособных под ружьём */
export function economicStrainForShare(
  sharePct: number,
  sustainableSharePct: number,
): MobilizationPlanResult["economicStrain"] {
  if (sharePct <= sustainableSharePct * 0.6) {
    return "low";
  }
  if (sharePct <= sustainableSharePct) {
    return "moderate";
  }
  if (sharePct <= sustainableSharePct * 1.3) {
    return "high";
  }
  return "breaking";
}

/** Полный мобилизационный план страны по её профилю */
export function buildMobilizationPlan(
  profile: CountrySustainabilityProfile,
  options: MobilizationPlanOptions = DEFAULT_MOBILIZATION_OPTIONS,
): MobilizationPlanResult {
  const base: MobilizationBaseData = profile.mobilizationBase;
  const { waves, ceiling }: { waves: MobilizationWave[]; ceiling: MobilizationCeiling } =
    generateMobilizationWaves(base, options);

  const totalMobilized: number = waves.reduce(
    (sum: number, wave: MobilizationWave): number => sum + wave.size,
    0,
  );
  const totalEffective: number = waves.reduce(
    (sum: number, wave: MobilizationWave): number => sum + wave.effectiveSize,
    0,
  );
  const lastWave: MobilizationWave | null =
    waves.length > 0 ? waves[waves.length - 1] : null;
  const peakShare: number =
    lastWave !== null ? lastWave.workforceSharePct : 0;
  const averageQuality: number =
    totalMobilized > 0 ? totalEffective / totalMobilized : 0;
  const strain: MobilizationPlanResult["economicStrain"] = economicStrainForShare(
    peakShare,
    base.maxSustainableSharePct,
  );

  const verdictRu: string =
    waves.length === 0
      ? `${profile.nameRu}: план не даёт ни одной волны — потолок исчерпан действующим составом (${ceiling.explanationRu}).`
      : `${profile.nameRu}: ${waves.length} волн, мобилизуется ${totalMobilized.toLocaleString("ru-RU")} человек ` +
        `(эффективно ${totalEffective.toLocaleString("ru-RU")} с учётом качества), ` +
        `последняя волна готова к месяцу ${lastWave !== null ? lastWave.readyMonth : 0}. ` +
        `${ceiling.explanationRu} Экономическое напряжение: ${strain}.`;

  return {
    iso3: profile.iso3,
    nameRu: profile.nameRu,
    ceiling,
    waves,
    totalMobilized,
    totalEffective,
    peakWorkforceSharePct: peakShare,
    sustainableForceSize: base.activePersonnel + totalMobilized,
    lastWaveReadyMonth: lastWave !== null ? lastWave.readyMonth : null,
    averageQuality,
    economicStrain: strain,
    verdictRu,
  };
}

/**
 * Временная шкала сил: по месяцам горизонта — сколько волн уже готово.
 * Волна считается готовой с её readyMonth включительно.
 */
export function forceTimeline(
  profile: CountrySustainabilityProfile,
  options: MobilizationPlanOptions,
  horizonMonths: number,
): ForceTimelinePoint[] {
  const plan: MobilizationPlanResult = buildMobilizationPlan(profile, options);
  const points: ForceTimelinePoint[] = [];
  for (let month: number = 0; month <= horizonMonths; month += 1) {
    let readyMobilized: number = 0;
    let effectiveMobilized: number = 0;
    for (const wave of plan.waves) {
      if (wave.readyMonth <= month) {
        readyMobilized += wave.size;
        effectiveMobilized += wave.effectiveSize;
      }
    }
    points.push({
      month,
      readyMobilized,
      totalForce: profile.mobilizationBase.activePersonnel + readyMobilized,
      effectiveForce:
        profile.mobilizationBase.activePersonnel + effectiveMobilized,
    });
  }
  return points;
}

/**
 * Устойчивый потолок численности сил мирного развёртывания:
 * сколько страна может держать под ружьём годами без разрушения экономики.
 * Это актив + мобилизационный потолок по экономическому ограничению.
 */
export function sustainableForceCeiling(base: MobilizationBaseData): number {
  const workingAge: number = base.workingAgeMillions * 1_000_000;
  return Math.floor((workingAge * base.maxSustainableSharePct) / 100);
}

/** Сравнение мобилизационных планов двух стран при одинаковых параметрах плана */
export function compareMobilization(
  profileA: CountrySustainabilityProfile,
  profileB: CountrySustainabilityProfile,
  options: MobilizationPlanOptions = DEFAULT_MOBILIZATION_OPTIONS,
): MobilizationComparison {
  const a: MobilizationPlanResult = buildMobilizationPlan(profileA, options);
  const b: MobilizationPlanResult = buildMobilizationPlan(profileB, options);
  const totalA: number =
    profileA.mobilizationBase.activePersonnel + a.totalEffective;
  const totalB: number =
    profileB.mobilizationBase.activePersonnel + b.totalEffective;
  const ratio: number = totalB > 0 ? totalA / totalB : Number.POSITIVE_INFINITY;

  let advantage: "a" | "b" | null = null;
  if (ratio > 1.05) {
    advantage = "a";
  } else if (ratio < 0.95) {
    advantage = "b";
  }

  const explanationRu: string =
    advantage === null
      ? `${a.nameRu} и ${b.nameRu} дают сопоставимую эффективную численность после мобилизации (разница в пределах 5%): решают качество действующего состава и техника, а не мобилизация.`
      : `Преимущество мобилизации — ${advantage === "a" ? a.nameRu : b.nameRu}: ` +
        `эффективные силы после волн различаются в ${Math.max(ratio, 1 / ratio).toFixed(2)} раза. ` +
        `Потолок A задаёт ${a.ceiling.bindingConstraint}, потолок B — ${b.ceiling.bindingConstraint}.`;

  return { a, b, advantage, explanationRu };
}

// ─────────────────────────────────────────────────────────────────────────────
// Исторические примеры мобилизации (справочные данные)
// ─────────────────────────────────────────────────────────────────────────────

/** Исторический пример мобилизации для калибровки ожиданий аналитика */
export interface HistoricalMobilizationExample {
  /** Идентификатор */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Годы */
  years: string;
  /** Мобилизовано, человек */
  mobilized: number;
  /** Население страны на тот момент, млн */
  populationMillions: number;
  /** Пиковая доля трудоспособных под ружьём, % */
  workforceSharePct: number;
  /** Скорость развёртывания первой волны */
  firstWaveSpeedRu: string;
  /** Главный урок на русском */
  lessonRu: string;
}

/** Каталог исторических мобилизаций */
export const HISTORICAL_MOBILIZATIONS: HistoricalMobilizationExample[] = [
  {
    id: "ukraine_2022",
    nameRu: "Украина, вторжение 2022",
    years: "2022–2025",
    mobilized: 1_000_000,
    populationMillions: 38,
    workforceSharePct: 12,
    firstWaveSpeedRu: "Территориальная оборона — дни; всеобщая мобилизация — недели",
    lessonRu:
      "Скорость первой волны решает выживание государства; долгую войну держит не призыв, а внешнее финансирование экономики при доле выше устойчивой.",
  },
  {
    id: "russia_2022",
    nameRu: "Россия, частичная мобилизация 2022",
    years: "2022",
    mobilized: 300_000,
    populationMillions: 143,
    workforceSharePct: 2,
    firstWaveSpeedRu: "Одна волна за ~1 месяц, качество волн резко неравномерное",
    lessonRu:
      "Политический предел может быть намного ниже демографического и экономического: модель потолка — верхняя граница, а не прогноз решения.",
  },
  {
    id: "israel_2023",
    nameRu: "Израиль, октябрь 2023",
    years: "2023",
    mobilized: 360_000,
    populationMillions: 9.8,
    workforceSharePct: 10,
    firstWaveSpeedRu: "Резерв укомплектован за 48 часов",
    lessonRu:
      "Эталон скорости резерва; но уже через месяцы мобилизация резерва стала главным тормозом гражданской экономики.",
  },
  {
    id: "ussr_1941",
    nameRu: "СССР, Великая Отечественная война",
    years: "1941–1945",
    mobilized: 34_000_000,
    populationMillions: 197,
    workforceSharePct: 30,
    firstWaveSpeedRu: "Кадрированные дивизии — дни; новые формирования — месяцы при катастрофическом падении качества",
    lessonRu:
      "Тотальная мобилизация возможна ценой экономики и демографии; качество поздних волн падает настолько, что численность перестаёт конвертироваться в боевую силу.",
  },
  {
    id: "usa_1941",
    nameRu: "США, Вторая мировая война",
    years: "1941–1945",
    mobilized: 16_000_000,
    populationMillions: 133,
    workforceSharePct: 18,
    firstWaveSpeedRu: "Плановый призыв с 1940 года, пик развёртывания — 1943–1944",
    lessonRu:
      "Промышленная мобилизация шла параллельно людской: волны получали технику, потому что производство разогнали до призыва, а не после.",
  },
  {
    id: "korea_south_doctrine",
    nameRu: "Южная Корея, доктрина тотальной обороны",
    years: "постоянно",
    mobilized: 3_100_000,
    populationMillions: 52,
    workforceSharePct: 12,
    firstWaveSpeedRu: "Резерв первой очереди — дни по планам военного времени",
    lessonRu:
      "Всеобщий призыв мирного времени превращает резерв в реальную, а не бумажную численность: качество волн падает медленнее, чем у стран с номинальным резервом.",
  },
];

/** Найти исторический пример по идентификатору */
export function getHistoricalMobilization(
  id: string,
): HistoricalMobilizationExample | undefined {
  return HISTORICAL_MOBILIZATIONS.find(
    (example: HistoricalMobilizationExample): boolean => example.id === id,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Пресеты мобилизационных планов и текстовый отчёт
// ─────────────────────────────────────────────────────────────────────────────

/** Именованный пресет мобилизационного плана */
export interface MobilizationPlanPreset {
  /** Идентификатор */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Политический и военный смысл пресета */
  descriptionRu: string;
  /** Опции плана */
  options: MobilizationPlanOptions;
}

/** Каталог пресетов: от точечного усиления до тотальной войны */
export const MOBILIZATION_PLAN_PRESETS: MobilizationPlanPreset[] = [
  {
    id: "reinforcement",
    nameRu: "Усиление: восполнение потерь без расширения армии",
    descriptionRu:
      "Малые волны с полным обучением: армия не растёт, но держит численность и качество. Режим долгой позиционной войны.",
    options: {
      firstWaveSize: 30_000,
      waveDecay: 1.0,
      maxWaves: 6,
      waveIntervalMonths: 3,
      trainingMonths: 6,
      trainingDecayPerWave: 0,
      minTrainingMonths: 4,
      baseQuality: 0.85,
      qualityDecayPerWave: 0.97,
      trainingHorizonMonths: 24,
      trainingThroughputPerMonth: 15_000,
    },
  },
  {
    id: "partial",
    nameRu: "Частичная мобилизация: одна большая волна резервистов",
    descriptionRu:
      "Модель 2022 года: одна волна подготовленного резерва с коротким освежением навыков, затем переход к контрактной подпитке.",
    options: {
      firstWaveSize: 300_000,
      waveDecay: 0.3,
      maxWaves: 3,
      waveIntervalMonths: 4,
      trainingMonths: 2,
      trainingDecayPerWave: 0,
      minTrainingMonths: 1,
      baseQuality: 0.95,
      qualityDecayPerWave: 0.9,
      trainingHorizonMonths: 12,
      trainingThroughputPerMonth: 60_000,
    },
  },
  {
    id: "general",
    nameRu: "Всеобщая мобилизация: волны до потолка",
    descriptionRu:
      "Полный план военного времени: волны идут, пока не упрутся в потолок демографии, экономики или учебных частей.",
    options: {
      firstWaveSize: 200_000,
      waveDecay: 0.9,
      maxWaves: 10,
      waveIntervalMonths: 2,
      trainingMonths: 4,
      trainingDecayPerWave: 0.25,
      minTrainingMonths: 2,
      baseQuality: 0.9,
      qualityDecayPerWave: 0.93,
      trainingHorizonMonths: 24,
      trainingThroughputPerMonth: 40_000,
    },
  },
  {
    id: "total_war",
    nameRu: "Тотальная война: скорость важнее качества",
    descriptionRu:
      "Обучение сжимается до недель, волны идут ежемесячно. Модель показывает цену скорости: численность растёт, эффективная сила — заметно медленнее.",
    options: {
      firstWaveSize: 250_000,
      waveDecay: 0.95,
      maxWaves: 14,
      waveIntervalMonths: 1,
      trainingMonths: 2,
      trainingDecayPerWave: 0.15,
      minTrainingMonths: 1,
      baseQuality: 0.85,
      qualityDecayPerWave: 0.9,
      trainingHorizonMonths: 36,
      trainingThroughputPerMonth: 80_000,
    },
  },
];

/** Найти пресет мобилизационного плана по идентификатору */
export function getMobilizationPlanPreset(
  id: string,
): MobilizationPlanPreset | undefined {
  return MOBILIZATION_PLAN_PRESETS.find(
    (preset: MobilizationPlanPreset): boolean => preset.id === id,
  );
}

/** Построить план страны по пресету */
export function buildMobilizationPlanFromPreset(
  profile: CountrySustainabilityProfile,
  presetId: string,
): MobilizationPlanResult {
  const preset: MobilizationPlanPreset | undefined =
    getMobilizationPlanPreset(presetId);
  if (preset === undefined) {
    throw new Error(`Неизвестный пресет мобилизации: ${presetId}`);
  }
  return buildMobilizationPlan(profile, preset.options);
}

/**
 * Текстовый отчёт мобилизационного плана для сводок и UI.
 * Формат: заголовок, потолок с разбором, волны, итоги, вердикт.
 */
export function formatMobilizationPlanRu(result: MobilizationPlanResult): string {
  const lines: string[] = [];
  lines.push(`МОБИЛИЗАЦИЯ: ${result.nameRu} (${result.iso3})`);
  lines.push(
    `Потолок: ${result.ceiling.ceiling.toLocaleString("ru-RU")} человек ` +
      `(связывает: ${result.ceiling.bindingConstraint}; ` +
      `демография ${result.ceiling.demographyLimit.toLocaleString("ru-RU")}, ` +
      `экономика ${result.ceiling.economyLimit.toLocaleString("ru-RU")}, ` +
      `кадры ${result.ceiling.trainingLimit.toLocaleString("ru-RU")})`,
  );
  for (const wave of result.waves) {
    lines.push(
      `- Волна ${wave.index}: ${wave.size.toLocaleString("ru-RU")} чел., ` +
        `призыв в мес. ${wave.callupMonth}, обучение ${wave.trainingMonths} мес., ` +
        `готова к мес. ${wave.readyMonth}, качество ${wave.qualityFactor.toFixed(2)}` +
        (wave.truncatedByCeiling ? " (урезана потолком)" : ""),
    );
  }
  lines.push(
    `Итого мобилизовано: ${result.totalMobilized.toLocaleString("ru-RU")} ` +
      `(эффективно ${result.totalEffective.toLocaleString("ru-RU")}), ` +
      `пиковая доля трудоспособных под ружьём: ${result.peakWorkforceSharePct.toFixed(1)}%`,
  );
  lines.push(`Вердикт: ${result.verdictRu}`);
  return lines.join("\n");
}
