// ─────────────────────────────────────────────────────────────────────────────
// Верификационный контур данных (Волна 4 дорожной карты 3.0)
// Кросс-чек значений по ≥2 независимым источникам, правило ±20%,
// карантин спорных значений, флаги качества, отчёты по полю и по стране
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// ЗАЧЕМ ЭТОТ МОДУЛЬ.
// Значительная часть данных проекта винтажа 2.0 была сгенерирована
// LLM-агентами без проверяемого провенанса: значение существовало,
// но ответить на вопрос «откуда это число» было нельзя. Волна 4 вводит
// жёсткое правило: ни одно значение не считается рабочим, пока оно не
// прошло кросс-чек минимум по двум независимым источникам либо не
// помечено честным флагом «один источник» / «только оценка».
//
// ПРАВИЛО ±20%.
// Если два независимых источника расходятся по одному полю одной страны
// более чем на 20% (относительное отклонение от медианы), значение НЕ
// усредняется молча и НЕ выбирается «более удобное» — оно уходит в
// карантин с зафиксированным расхождением. Карантин — это не удаление:
// значение хранится с флагом, видно в отчётах и может быть реабилити-
// ровано третьим источником или ручной сверкой с первоисточником.
//
// СОВМЕСТИМОСТЬ С ПРОВЕНАНСОМ.
// Типы ниже сознательно совместимы по духу с src/lib/intel/provenance.ts
// (ValueProvenance: поле, источник, год, метод, адмиралтейский грейд),
// но модуль автономен: он не импортирует intel, чтобы верификационный
// контур можно было гонять отдельной проверкой типов и отдельным
// verify-скриптом без поднятия всего дерева зависимостей проекта.
// Грейды здесь — те же адмиралтейские: надёжность источника A–F и
// достоверность информации 1–6 по стандарту НАТО (STANAG 2511 / AJP-2.1).

// ─────────────────────────────────────────────────────────────────────────────
// Базовые типы провенанса (локальные, совместимые с intel/provenance)
// ─────────────────────────────────────────────────────────────────────────────

/** Надёжность источника по адмиралтейской шкале: A — полностью надёжен, F — оценить нельзя */
export type Data3Reliability = "A" | "B" | "C" | "D" | "E" | "F";

/** Достоверность информации по адмиралтейской шкале: 1 — подтверждена, 6 — оценить нельзя */
export type Data3Credibility = 1 | 2 | 3 | 4 | 5 | 6;

/** Адмиралтейский грейд значения: надёжность источника × достоверность информации */
export interface Data3Grade {
  /** Надёжность источника A–F */
  source: Data3Reliability;
  /** Достоверность информации 1–6 */
  info: Data3Credibility;
}

/** Метод получения значения (зеркалит ProvenanceMethod из intel/provenance) */
export type Data3Method =
  | "official-statistics"
  | "manual-curation"
  | "scraping"
  | "expert-estimate"
  | "llm-generated"
  | "cross-validated"
  | "field-report"
  | "commercial-database";

/** Идентификаторы источников, известные контуру (расширяемо строкой реестра) */
export type Data3SourceId =
  | "sipri"
  | "iiss"
  | "fas"
  | "worldbank"
  | "cia"
  | "un"
  | "gfp"
  | "csis"
  | "rusi"
  | "janes"
  | "national-statistics"
  | "industry-press"
  | "osint"
  | "custom";

/**
 * Провенанс одного наблюдения.
 * Поле без провенанса в контур не принимается вообще: наблюдение с
 * неполным провенансом получает флаг missing-provenance и не может
 * подняться выше статуса «один источник».
 */
export interface Data3Provenance {
  /** Идентификатор источника из реестра проекта */
  sourceId: Data3SourceId;
  /** Человекочитаемое имя источника для отчётов */
  sourceNameRu: string;
  /** Год, к которому относятся данные (не год публикации) */
  dataYear: number;
  /** Метод получения значения */
  method: Data3Method;
  /** Адмиралтейский грейд, присвоенный значению */
  grade: Data3Grade;
  /** Значение является оценкой, а не опубликованным фактом */
  estimated: boolean;
  /** Свободная пометка: выпуск базы, страница, дата обращения */
  noteRu: string;
}

/**
 * Одно наблюдение: значение одного поля одной страны из одного источника.
 * Верификация работает не со «значениями страны», а с наборами
 * наблюдений: одно поле × одна страна × N источников.
 */
export interface Data3Observation {
  /** ISO 3166-1 alpha-3 код страны */
  iso3: string;
  /** Имя поля модели (например, militaryBudgetBn) */
  field: string;
  /** Числовое значение в единице измерения поля */
  value: number;
  /** Единица измерения (млрд долл., чел., шт., мес. и т.д.) */
  unit: string;
  /** Провенанс наблюдения */
  provenance: Data3Provenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Статусы и флаги качества
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Итоговый статус поля страны после верификации.
 * verified        — ≥2 независимых источника, расхождение в пределах допуска;
 * single-source   — источник один, расхождение проверить нечем;
 * estimated-only  — все наблюдения — оценки (нет опубликованного факта);
 * stale           — источники согласны, но данные старше порога свежести;
 * quarantine      — расхождение источников выше допуска ИЛИ метод
 *                   llm-generated без подтверждающего кросс-чека;
 * rejected        — значение вне физического диапазона поля или дубль.
 */
export type VerificationStatus =
  | "verified"
  | "single-source"
  | "estimated-only"
  | "stale"
  | "quarantine"
  | "rejected";

/** Флаги качества: не исключающие друг друга пометки поверх статуса */
export type QualityFlag =
  | "cross-checked"
  | "single-source"
  | "llm-origin"
  | "estimated"
  | "stale-data"
  | "divergence-over-tolerance"
  | "out-of-range"
  | "duplicate-observation"
  | "missing-provenance"
  | "unit-mismatch"
  | "low-grade-source"
  | "manual-review-required";

/** Запись карантина: значение изъято из рабочего ряда, но не удалено */
export interface QuarantineEntry {
  /** Страна */
  iso3: string;
  /** Поле */
  field: string;
  /** Причина помещения в карантин (человекочитаемая) */
  reasonRu: string;
  /** Наблюдения, породившие конфликт, — целиком, для ручной сверки */
  observations: Data3Observation[];
  /** Максимальное относительное расхождение в группе, % */
  maxDeviationPct: number;
  /** Что нужно для реабилитации значения */
  resolutionHintRu: string;
}

/** Результат кросс-чека одного поля одной страны */
export interface FieldVerification {
  /** Страна */
  iso3: string;
  /** Поле */
  field: string;
  /** Итоговый статус */
  status: VerificationStatus;
  /** Флаги качества */
  flags: QualityFlag[];
  /** Число независимых источников в группе */
  independentSources: number;
  /** Медианное значение группы (рабочее значение, если не карантин) */
  medianValue: number | null;
  /** Максимальное относительное отклонение от медианы, % */
  maxDeviationPct: number;
  /** Итоговый confidence 0..1 для проброса в модель */
  confidence: number;
  /** Лучший (минимальный по шкале) грейд среди наблюдений */
  bestGrade: Data3Grade | null;
  /** Пояснение статуса для отчёта */
  summaryRu: string;
}

/** Отчёт верификации по стране: все поля + сводные счётчики */
export interface CountryVerificationReport {
  /** Страна */
  iso3: string;
  /** Проверено полей */
  fieldsChecked: number;
  /** Поля по статусам */
  byStatus: Record<VerificationStatus, number>;
  /** Средний confidence по полям страны 0..1 */
  meanConfidence: number;
  /** Доля полей, прошедших кросс-чек, 0..1 */
  crossCheckedShare: number;
  /** Детализация по полям */
  fields: FieldVerification[];
  /** Записи карантина страны */
  quarantine: QuarantineEntry[];
}

/** Отчёт верификации по всему набору данных */
export interface DatasetVerificationReport {
  /** Всего наблюдений на входе */
  totalObservations: number;
  /** Всего проверенных пар «страна × поле» */
  totalFields: number;
  /** Всего стран */
  totalCountries: number;
  /** Группы по статусам */
  byStatus: Record<VerificationStatus, number>;
  /** Весь карантин набора */
  quarantine: QuarantineEntry[];
  /** Отчёты по странам */
  countries: CountryVerificationReport[];
  /** Средний confidence набора 0..1 */
  meanConfidence: number;
  /** Человекочитаемая сводка */
  summaryRu: string;
}

/** Конфигурация контура: допуски и пороги */
export interface VerificationConfig {
  /** Допустимое относительное расхождение источников, % (правило ±20%) */
  tolerancePct: number;
  /** Минимум независимых источников для статуса verified */
  minIndependentSources: number;
  /** Текущий год для расчёта свежести */
  currentYear: number;
  /** Возраст данных (лет), после которого ставится флаг stale-data */
  staleAfterYears: number;
  /** Грейд надёжности хуже этого уровня даёт флаг low-grade-source */
  lowGradeThreshold: Data3Reliability;
}

/** Конфигурация по умолчанию: правило ±20%, два источника, горизонт свежести 3 года */
export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  tolerancePct: 20,
  minIndependentSources: 2,
  currentYear: 2026,
  staleAfterYears: 3,
  lowGradeThreshold: "D",
};

// ─────────────────────────────────────────────────────────────────────────────
// Реестр правил диапазонов полей
// Значение вне диапазона поля — не «спорное», а битое: rejected без
// кросс-чека. Диапазоны заданы с запасом относительно реальных рядов
// 2024–2026 годов и служат ловушкой грубых ошибок (перепутанные
// единицы, лишние нули, LLM-галлюцинации масштаба).
// ─────────────────────────────────────────────────────────────────────────────

/** Правило диапазона одного поля модели */
export interface FieldRangeRule {
  /** Имя поля */
  field: string;
  /** Человекочитаемое имя поля */
  nameRu: string;
  /** Единица измерения */
  unit: string;
  /** Минимум физически допустимого диапазона (включительно) */
  min: number;
  /** Максимум физически допустимого диапазона (включительно) */
  max: number;
  /** Пояснение: откуда взят потолок диапазона */
  rationaleRu: string;
}

/** Реестр диапазонов полей модели и данных Волны 4 */
export const FIELD_RANGE_RULES: FieldRangeRule[] = [
  {
    field: "activePersonnel",
    nameRu: "Активный личный состав",
    unit: "чел.",
    min: 0,
    max: 3500000,
    rationaleRu: "Потолок — крупнейшая армия мира (Китай, ~2,0–2,1 млн) с запасом на мобилизационные всплески учёта.",
  },
  {
    field: "reservePersonnel",
    nameRu: "Резервный личный состав",
    unit: "чел.",
    min: 0,
    max: 10000000,
    rationaleRu: "Потолок — суммарные резервные системы крупнейших стран (КНДР заявляет миллионы резервистов и ополчения).",
  },
  {
    field: "paramilitary",
    nameRu: "Военизированные формирования",
    unit: "чел.",
    min: 0,
    max: 5000000,
    rationaleRu: "Потолок — народное ополчение и внутренние войска крупнейших государств.",
  },
  {
    field: "populationM",
    nameRu: "Население",
    unit: "млн чел.",
    min: 0,
    max: 1600,
    rationaleRu: "Потолок — население Индии (~1,45 млрд) с запасом на ревизии ООН.",
  },
  {
    field: "totalTanks",
    nameRu: "Танки (всего)",
    unit: "шт.",
    min: 0,
    max: 25000,
    rationaleRu: "Потолок — российский парк с хранением по открытым оценкам IISS.",
  },
  {
    field: "armoredVehicles",
    nameRu: "Бронемашины (всего)",
    unit: "шт.",
    min: 0,
    max: 120000,
    rationaleRu: "Потолок — суммарный парк бронетехники крупнейших армий включая хранение.",
  },
  {
    field: "artillery",
    nameRu: "Артиллерийские системы",
    unit: "шт.",
    min: 0,
    max: 30000,
    rationaleRu: "Потолок — артиллерийский парк России и КНДР по открытым оценкам.",
  },
  {
    field: "mlrs",
    nameRu: "РСЗО",
    unit: "шт.",
    min: 0,
    max: 6000,
    rationaleRu: "Потолок — крупнейшие парки РСЗО (Россия, Китай, КНДР).",
  },
  {
    field: "totalAircraft",
    nameRu: "Авиация (всего)",
    unit: "шт.",
    min: 0,
    max: 25000,
    rationaleRu: "Потолок — суммарная авиация США всех ведомств (~13 тыс. военных бортов) с запасом.",
  },
  {
    field: "fighters",
    nameRu: "Истребители",
    unit: "шт.",
    min: 0,
    max: 4000,
    rationaleRu: "Потолок — истребительный парк США и Китая суммарно по классам не превышает порог на страну.",
  },
  {
    field: "attackHelicopters",
    nameRu: "Ударные вертолёты",
    unit: "шт.",
    min: 0,
    max: 2500,
    rationaleRu: "Потолок — парк ударных вертолётов США (~1 тыс.) и России с запасом.",
  },
  {
    field: "totalNavy",
    nameRu: "Корабельный состав (всего)",
    unit: "шт.",
    min: 0,
    max: 1500,
    rationaleRu: "Потолок — крупнейшие флоты по вымпелам (Китай, ~370 боевых + вспомогательные).",
  },
  {
    field: "aircraftCarriers",
    nameRu: "Авианосцы",
    unit: "шт.",
    min: 0,
    max: 25,
    rationaleRu: "Потолок — 11 американских CVN + вертолётоносцы всех стран по отдельности не превышают порог.",
  },
  {
    field: "submarines",
    nameRu: "Подводные лодки",
    unit: "шт.",
    min: 0,
    max: 150,
    rationaleRu: "Потолок — крупнейшие подводные флоты (США, Россия, Китай — 60–80 единиц).",
  },
  {
    field: "gdpPppBn",
    nameRu: "ВВП по ППС",
    unit: "млрд долл.",
    min: 0,
    max: 45000,
    rationaleRu: "Потолок — ВВП по ППС Китая (~35–40 трлн) с запасом на ревизии Всемирного банка.",
  },
  {
    field: "gdpNominalBn",
    nameRu: "ВВП номинальный",
    unit: "млрд долл.",
    min: 0,
    max: 35000,
    rationaleRu: "Потолок — номинальный ВВП США (~29–31 трлн).",
  },
  {
    field: "militaryBudgetBn",
    nameRu: "Военные расходы",
    unit: "млрд долл.",
    min: 0,
    max: 1500,
    rationaleRu: "Потолок — военные расходы США 2025 ($921 млрд по SIPRI) с запасом на рост и пересчёты.",
  },
  {
    field: "defensePctGdp",
    nameRu: "Доля военных расходов в ВВП",
    unit: "%",
    min: 0,
    max: 45,
    rationaleRu: "Потолок — Украина военных лет (~34–40% по SIPRI); выше — почти наверняка ошибка единиц.",
  },
  {
    field: "armsExports",
    nameRu: "Экспорт вооружений (TIV)",
    unit: "млн TIV",
    min: 0,
    max: 20000,
    rationaleRu: "Потолок — пиковые годовые поставки крупнейших экспортёров по SIPRI TIV.",
  },
  {
    field: "armsImports",
    nameRu: "Импорт вооружений (TIV)",
    unit: "млн TIV",
    min: 0,
    max: 20000,
    rationaleRu: "Потолок — пиковый импорт воюющих государств (Украина 2022–2024) по SIPRI TIV.",
  },
  {
    field: "nuclearWarheads",
    nameRu: "Ядерные боеголовки (всего)",
    unit: "шт.",
    min: 0,
    max: 8000,
    rationaleRu: "Потолок — арсенал России по FAS (~5 580) с запасом на методики подсчёта.",
  },
  {
    field: "icbmCount",
    nameRu: "МБР развёрнуто",
    unit: "шт.",
    min: 0,
    max: 600,
    rationaleRu: "Потолок — развёрнутые МБР России и США (по ~300–400) с запасом.",
  },
  {
    field: "uavCount",
    nameRu: "Парк БПЛА (все классы)",
    unit: "шт.",
    min: 0,
    max: 2000000,
    rationaleRu: "Потолок — заявляемые объёмы FPV-производства воюющих стран в пересчёте на парк/годовой выпуск.",
  },
  {
    field: "fpvProductionMonthly",
    nameRu: "Производство FPV в месяц",
    unit: "шт./мес",
    min: 0,
    max: 500000,
    rationaleRu: "Потолок — публичные заявления о темпах FPV-производства Украины и России 2025 года.",
  },
  {
    field: "shellStockMonths",
    nameRu: "Запасы снарядов в месяцах войны",
    unit: "мес.",
    min: 0,
    max: 120,
    rationaleRu: "Потолок — десятилетие расхода высокой интенсивности; выше — ошибка методики, а не запас.",
  },
  {
    field: "shellProductionMonthly",
    nameRu: "Производство снарядов в месяц",
    unit: "шт./мес",
    min: 0,
    max: 1000000,
    rationaleRu: "Потолок — пиковые оценки суммарного производства крупнейших производителей 2025 года.",
  },
  {
    field: "artilleryShellStock",
    nameRu: "Запас артиллерийских выстрелов",
    unit: "шт.",
    min: 0,
    max: 60000000,
    rationaleRu: "Потолок — оценки складов крупнейших армий (десятки миллионов выстрелов с хранением).",
  },
  {
    field: "airDefenseInterceptors",
    nameRu: "Перехватчики ПВО/ПРО (ЗУР)",
    unit: "шт.",
    min: 0,
    max: 100000,
    rationaleRu: "Потолок — суммарные запасы ЗУР крупнейших систем ПВО по открытым оценкам.",
  },
  {
    field: "missileStock",
    nameRu: "Запас ракет (КР/БР/РСЗО крупный калибр)",
    unit: "шт.",
    min: 0,
    max: 100000,
    rationaleRu: "Потолок — суммарные ракетные запасы крупнейших держав по открытым оценкам CSIS/IISS.",
  },
  {
    field: "c4isrScore",
    nameRu: "Балл C4ISR (рубрика 1–10)",
    unit: "балл",
    min: 0,
    max: 10,
    rationaleRu: "Шкала рубрики Волны 1: балл вне 0–10 — программная ошибка, а не оценка.",
  },
  {
    field: "ewScore",
    nameRu: "Балл РЭБ (рубрика 1–10)",
    unit: "балл",
    min: 0,
    max: 10,
    rationaleRu: "Шкала рубрики Волны 1: балл вне 0–10 — программная ошибка, а не оценка.",
  },
  {
    field: "techLevel",
    nameRu: "Технологический уровень (1–10)",
    unit: "балл",
    min: 0,
    max: 10,
    rationaleRu: "Шкала рубрики проекта: балл вне 0–10 — программная ошибка.",
  },
  {
    field: "moraleIndex",
    nameRu: "Индекс морали (0–10)",
    unit: "балл",
    min: 0,
    max: 10,
    rationaleRu: "Шкала рубрики проекта: балл вне 0–10 — программная ошибка.",
  },
  {
    field: "readinessRate",
    nameRu: "Коэффициент боеготовности техники",
    unit: "доля",
    min: 0,
    max: 1,
    rationaleRu: "Доля по определению в [0, 1]; значения в процентах (например, 85) — ошибка единиц.",
  },
  {
    field: "spendingChangePct",
    nameRu: "Изменение военных расходов за год",
    unit: "%",
    min: -60,
    max: 160,
    rationaleRu: "Диапазон реальных годовых изменений SIPRI: от сокращений мирного времени до всплесков первого года войны.",
  },
  {
    field: "worldSharePct",
    nameRu: "Доля в мировых военных расходах",
    unit: "%",
    min: 0,
    max: 45,
    rationaleRu: "Потолок — доля США (~32–37% мировых расходов) с запасом.",
  },
  {
    field: "strategicValue",
    nameRu: "Стратегическая значимость объекта",
    unit: "балл",
    min: 1,
    max: 10,
    rationaleRu: "Шкала каталога объектов проекта: 1–10.",
  },
  {
    field: "lat",
    nameRu: "Широта",
    unit: "град.",
    min: -90,
    max: 90,
    rationaleRu: "Географический диапазон широты.",
  },
  {
    field: "lng",
    nameRu: "Долгота",
    unit: "град.",
    min: -180,
    max: 180,
    rationaleRu: "Географический диапазон долготы.",
  },
];

/** Правило диапазона по имени поля (undefined — правило не задано). */
export function rangeRuleForField(field: string): FieldRangeRule | undefined {
  return FIELD_RANGE_RULES.find((rule) => rule.field === field);
}

/** Значение внутри физического диапазона своего поля. */
export function isWithinRange(observation: Data3Observation): boolean {
  const rule = rangeRuleForField(observation.field);
  if (!rule) {
    return Number.isFinite(observation.value);
  }
  return (
    Number.isFinite(observation.value) &&
    observation.value >= rule.min &&
    observation.value <= rule.max
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ядро: расхождение, медиана, грейды, confidence
// ─────────────────────────────────────────────────────────────────────────────

/** Медиана числового ряда (пустой ряд — null). */
export function medianOf(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Относительное отклонение значения от базы, %.
 * База 0 — особый случай: отклонение 0 при нулевом значении,
 * бесконечность (фактически — полное расхождение) при ненулевом.
 */
export function relativeDeviationPct(value: number, base: number): number {
  if (base === 0) {
    return value === 0 ? 0 : Number.POSITIVE_INFINITY;
  }
  return (Math.abs(value - base) / Math.abs(base)) * 100;
}

/** Числовой ранг надёжности источника: A=0 (лучший) … F=5 (худший). */
export function reliabilityRank(reliability: Data3Reliability): number {
  const ranks: Record<Data3Reliability, number> = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
  };
  return ranks[reliability];
}

/**
 * Базовый confidence грейда 0..1.
 * Согласовано по духу с confidenceFromGrade из intel/admiralty:
 * надёжность даёт основную массу, достоверность — поправку.
 */
export function gradeConfidence(grade: Data3Grade): number {
  const reliabilityBase: Record<Data3Reliability, number> = {
    A: 0.95,
    B: 0.85,
    C: 0.7,
    D: 0.5,
    E: 0.35,
    F: 0.2,
  };
  const infoFactor: Record<Data3Credibility, number> = {
    1: 1.0,
    2: 0.92,
    3: 0.8,
    4: 0.62,
    5: 0.45,
    6: 0.3,
  };
  return reliabilityBase[grade.source] * infoFactor[grade.info];
}

/** Лучший грейд из набора: сначала надёжность, при равенстве — достоверность. */
export function bestGradeOf(grades: Data3Grade[]): Data3Grade | null {
  if (grades.length === 0) {
    return null;
  }
  let best = grades[0];
  for (const grade of grades) {
    const betterSource = reliabilityRank(grade.source) < reliabilityRank(best.source);
    const sameSourceBetterInfo =
      reliabilityRank(grade.source) === reliabilityRank(best.source) && grade.info < best.info;
    if (betterSource || sameSourceBetterInfo) {
      best = grade;
    }
  }
  return best;
}

/** Свежесть данных 0..1: линейный штраф за возраст, горизонт — 6 лет. */
export function freshnessFactor(dataYear: number, currentYear: number): number {
  const age = Math.max(0, currentYear - dataYear);
  return Math.max(0, 1 - age / 6);
}

/** Провенанс считается полным, если заполнены все ключевые элементы. */
export function provenanceIsComplete(provenance: Data3Provenance): boolean {
  return (
    provenance.sourceId.length > 0 &&
    provenance.sourceNameRu.length > 0 &&
    provenance.dataYear > 1950 &&
    provenance.method.length > 0 &&
    provenance.grade.source.length === 1 &&
    provenance.grade.info >= 1 &&
    provenance.grade.info <= 6
  );
}

/** Наблюдение обязано жить в карантине до подтверждающего кросс-чека. */
export function observationRequiresQuarantine(observation: Data3Observation): boolean {
  return observation.provenance.method === "llm-generated" || observation.provenance.grade.source === "F";
}

// ─────────────────────────────────────────────────────────────────────────────
// Дубли и независимость источников
// ─────────────────────────────────────────────────────────────────────────────

/** Ключ наблюдения: страна × поле × источник (для поиска дублей). */
export function observationKey(observation: Data3Observation): string {
  return `${observation.iso3}::${observation.field}::${observation.provenance.sourceId}`;
}

/** Ключ группы кросс-чека: страна × поле. */
export function groupKey(observation: Data3Observation): string {
  return `${observation.iso3}::${observation.field}`;
}

/**
 * Дубли наблюдений: повтор того же источника по тому же полю страны.
 * Дубль не является вторым независимым источником — это частая ошибка
 * пайплайнов (в винтаже 2.0 так дублировалась Австралия в GFP-выборке).
 */
export function findDuplicateObservations(
  observations: Data3Observation[],
): Data3Observation[] {
  const seen = new Set<string>();
  const duplicates: Data3Observation[] = [];
  for (const observation of observations) {
    const key = observationKey(observation);
    if (seen.has(key)) {
      duplicates.push(observation);
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}

/**
 * Число независимых источников в группе.
 * Независимость здесь — разные sourceId; два выпуска одной базы
 * (например, GFP двух лет) независимыми источниками НЕ считаются.
 */
export function countIndependentSources(observations: Data3Observation[]): number {
  const sources = new Set<Data3SourceId>();
  for (const observation of observations) {
    sources.add(observation.provenance.sourceId);
  }
  return sources.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// Кросс-чек одной группы «страна × поле»
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Верификация одной группы наблюдений (одно поле одной страны).
 * Порядок решений — от жёстких отказов к мягким статусам:
 *   1. вне диапазона / дубли / конфликт единиц → rejected;
 *   2. расхождение выше допуска → quarantine (правило ±20%);
 *   3. llm-origin без подтверждения независимым источником → quarantine;
 *   4. один источник → single-source (или estimated-only);
 *   5. источники согласны, но стары → stale;
 *   6. иначе → verified (или estimated-only, если факта нет вовсе).
 */
export function verifyFieldGroup(
  observations: Data3Observation[],
  config: VerificationConfig = DEFAULT_VERIFICATION_CONFIG,
): FieldVerification {
  if (observations.length === 0) {
    throw new Error("verifyFieldGroup: пустая группа наблюдений");
  }
  const iso3 = observations[0].iso3;
  const field = observations[0].field;
  const flags: QualityFlag[] = [];

  // Единицы измерения обязаны совпадать внутри группы.
  const units = new Set(observations.map((o) => o.unit));
  if (units.size > 1) {
    flags.push("unit-mismatch");
    return {
      iso3,
      field,
      status: "rejected",
      flags,
      independentSources: countIndependentSources(observations),
      medianValue: null,
      maxDeviationPct: Number.POSITIVE_INFINITY,
      confidence: 0,
      bestGrade: bestGradeOf(observations.map((o) => o.provenance.grade)),
      summaryRu: `Конфликт единиц измерения внутри группы: ${[...units].join(" / ")}. Группа отклонена до ручной нормализации единиц.`,
    };
  }

  // Дубли одного источника не участвуют в кросс-чеке как отдельные голоса.
  const duplicates = findDuplicateObservations(observations);
  if (duplicates.length > 0) {
    flags.push("duplicate-observation");
  }
  const seenKeys = new Set<string>();
  const uniqueObservations = observations.filter((o) => {
    const key = observationKey(o);
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });

  // Физический диапазон поля — жёсткий отказ.
  const outOfRange = uniqueObservations.filter((o) => !isWithinRange(o));
  if (outOfRange.length > 0) {
    flags.push("out-of-range");
    return {
      iso3,
      field,
      status: "rejected",
      flags,
      independentSources: countIndependentSources(uniqueObservations),
      medianValue: null,
      maxDeviationPct: Number.POSITIVE_INFINITY,
      confidence: 0,
      bestGrade: bestGradeOf(uniqueObservations.map((o) => o.provenance.grade)),
      summaryRu: `Значение вне физического диапазона поля ${field}: ${outOfRange
        .map((o) => o.value)
        .join(", ")}. Группа отклонена: вероятна ошибка единиц или масштаба.`,
    };
  }

  const values = uniqueObservations.map((o) => o.value);
  const median = medianOf(values);
  if (median === null) {
    throw new Error("verifyFieldGroup: медиана пустой группы");
  }
  let maxDeviationPct = 0;
  for (const value of values) {
    const deviation = relativeDeviationPct(value, median);
    if (deviation > maxDeviationPct) {
      maxDeviationPct = deviation;
    }
  }

  const independentSources = countIndependentSources(uniqueObservations);
  const grades = uniqueObservations.map((o) => o.provenance.grade);
  const bestGrade = bestGradeOf(grades);
  const hasLlmOrigin = uniqueObservations.some((o) => o.provenance.method === "llm-generated");
  const allEstimated = uniqueObservations.every((o) => o.provenance.estimated);
  const hasIncompleteProvenance = uniqueObservations.some(
    (o) => !provenanceIsComplete(o.provenance),
  );
  const newestYear = Math.max(...uniqueObservations.map((o) => o.provenance.dataYear));
  const isStale = config.currentYear - newestYear > config.staleAfterYears;
  const hasLowGrade = grades.some(
    (g) => reliabilityRank(g.source) >= reliabilityRank(config.lowGradeThreshold),
  );

  if (hasLlmOrigin) {
    flags.push("llm-origin");
  }
  if (allEstimated) {
    flags.push("estimated");
  }
  if (hasIncompleteProvenance) {
    flags.push("missing-provenance");
  }
  if (isStale) {
    flags.push("stale-data");
  }
  if (hasLowGrade) {
    flags.push("low-grade-source");
  }
  if (independentSources >= 2) {
    flags.push("cross-checked");
  } else {
    flags.push("single-source");
  }

  // Базовый confidence: грейд × свежесть × согласие источников.
  const gradePart = bestGrade ? gradeConfidence(bestGrade) : 0.2;
  const freshPart = freshnessFactor(newestYear, config.currentYear);
  const agreementPart =
    maxDeviationPct === Number.POSITIVE_INFINITY
      ? 0
      : Math.max(0, 1 - maxDeviationPct / 100);
  let confidence = gradePart * (0.5 + 0.5 * freshPart) * (0.6 + 0.4 * agreementPart);
  if (independentSources < config.minIndependentSources) {
    confidence *= 0.7;
  }
  if (hasIncompleteProvenance) {
    confidence *= 0.8;
  }
  confidence = Math.min(1, Math.max(0, confidence));

  // Правило ±20%: расхождение выше допуска — карантин, без исключений.
  if (independentSources >= 2 && maxDeviationPct > config.tolerancePct) {
    flags.push("divergence-over-tolerance");
    flags.push("manual-review-required");
    return {
      iso3,
      field,
      status: "quarantine",
      flags,
      independentSources,
      medianValue: median,
      maxDeviationPct,
      confidence: confidence * 0.5,
      bestGrade,
      summaryRu: `Расхождение источников ${maxDeviationPct.toFixed(1)}% превышает допуск ±${config.tolerancePct}%. Значение отправлено в карантин, медиана ${median} не публикуется как факт.`,
    };
  }

  // LLM-значение без независимого подтверждения — карантин по происхождению.
  if (hasLlmOrigin && independentSources < config.minIndependentSources) {
    flags.push("manual-review-required");
    return {
      iso3,
      field,
      status: "quarantine",
      flags,
      independentSources,
      medianValue: median,
      maxDeviationPct,
      confidence: confidence * 0.5,
      bestGrade,
      summaryRu:
        "Значение LLM-происхождения не подтверждено независимым источником. Карантин до кросс-чека по правилу Волны 4.",
    };
  }

  if (independentSources < config.minIndependentSources) {
    return {
      iso3,
      field,
      status: allEstimated ? "estimated-only" : "single-source",
      flags,
      independentSources,
      medianValue: median,
      maxDeviationPct,
      confidence,
      bestGrade,
      summaryRu: allEstimated
        ? "Единственное наблюдение — оценка, опубликованного факта по полю нет."
        : "Только один независимый источник: расхождение проверить нечем, статус — single-source.",
    };
  }

  if (isStale) {
    return {
      iso3,
      field,
      status: "stale",
      flags,
      independentSources,
      medianValue: median,
      maxDeviationPct,
      confidence,
      bestGrade,
      summaryRu: `Источники согласны (расхождение ${maxDeviationPct.toFixed(1)}%), но новейшие данные — ${newestYear} год: требуется обновление ряда.`,
    };
  }

  return {
    iso3,
    field,
    status: allEstimated ? "estimated-only" : "verified",
    flags,
    independentSources,
    medianValue: median,
    maxDeviationPct,
    confidence,
    bestGrade,
    summaryRu: allEstimated
      ? `Источники согласны (расхождение ${maxDeviationPct.toFixed(1)}%), но все значения — оценки: статус estimated-only, не факт.`
      : `Кросс-чек пройден: ${independentSources} независимых источника, максимальное расхождение ${maxDeviationPct.toFixed(1)}% в пределах допуска ±${config.tolerancePct}%.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Верификация набора: группировка, карантин, отчёты по странам
// ─────────────────────────────────────────────────────────────────────────────

/** Пустой счётчик статусов (все ключи присутствуют всегда). */
export function emptyStatusCounter(): Record<VerificationStatus, number> {
  return {
    verified: 0,
    "single-source": 0,
    "estimated-only": 0,
    stale: 0,
    quarantine: 0,
    rejected: 0,
  };
}

/** Группировка наблюдений по ключу «страна × поле» с сохранением порядка входа. */
export function groupObservations(
  observations: Data3Observation[],
): Map<string, Data3Observation[]> {
  const groups = new Map<string, Data3Observation[]>();
  for (const observation of observations) {
    const key = groupKey(observation);
    const existing = groups.get(key);
    if (existing) {
      existing.push(observation);
    } else {
      groups.set(key, [observation]);
    }
  }
  return groups;
}

/** Запись карантина из результата проверки поля. */
export function quarantineEntryFromField(
  fieldVerification: FieldVerification,
  observations: Data3Observation[],
): QuarantineEntry {
  const llmDriven = observations.some((o) => o.provenance.method === "llm-generated");
  return {
    iso3: fieldVerification.iso3,
    field: fieldVerification.field,
    reasonRu: fieldVerification.summaryRu,
    observations,
    maxDeviationPct: fieldVerification.maxDeviationPct,
    resolutionHintRu: llmDriven
      ? "Найти независимый опубликованный источник по полю (IISS/SIPRI/национальная статистика) и добавить наблюдение; LLM-значение само по себе реабилитировать нельзя."
      : "Сверить с третьим независимым источником; при его согласии с одной из сторон — оставить согласную пару и зафиксировать отклонённое значение в журнале.",
  };
}

/** Полная верификация набора наблюдений: отчёт по странам и по набору. */
export function verifyDataset(
  observations: Data3Observation[],
  config: VerificationConfig = DEFAULT_VERIFICATION_CONFIG,
): DatasetVerificationReport {
  const groups = groupObservations(observations);
  const byStatus = emptyStatusCounter();
  const quarantine: QuarantineEntry[] = [];
  const countryMap = new Map<string, FieldVerification[]>();
  const countryQuarantine = new Map<string, QuarantineEntry[]>();

  for (const group of groups.values()) {
    const result = verifyFieldGroup(group, config);
    byStatus[result.status] += 1;
    const countryFields = countryMap.get(result.iso3) ?? [];
    countryFields.push(result);
    countryMap.set(result.iso3, countryFields);
    if (result.status === "quarantine") {
      const entry = quarantineEntryFromField(result, group);
      quarantine.push(entry);
      const existing = countryQuarantine.get(result.iso3) ?? [];
      existing.push(entry);
      countryQuarantine.set(result.iso3, existing);
    }
  }

  const countries: CountryVerificationReport[] = [];
  let confidenceSum = 0;
  let fieldTotal = 0;
  for (const [iso3, fields] of countryMap.entries()) {
    const countryByStatus = emptyStatusCounter();
    let countryConfidenceSum = 0;
    let crossChecked = 0;
    for (const field of fields) {
      countryByStatus[field.status] += 1;
      countryConfidenceSum += field.confidence;
      if (field.flags.includes("cross-checked")) {
        crossChecked += 1;
      }
    }
    const fieldsChecked = fields.length;
    countries.push({
      iso3,
      fieldsChecked,
      byStatus: countryByStatus,
      meanConfidence: fieldsChecked > 0 ? countryConfidenceSum / fieldsChecked : 0,
      crossCheckedShare: fieldsChecked > 0 ? crossChecked / fieldsChecked : 0,
      fields,
      quarantine: countryQuarantine.get(iso3) ?? [],
    });
    confidenceSum += countryConfidenceSum;
    fieldTotal += fieldsChecked;
  }

  countries.sort((a, b) => a.iso3.localeCompare(b.iso3));
  const meanConfidence = fieldTotal > 0 ? confidenceSum / fieldTotal : 0;
  const summaryRu = buildDatasetSummaryRu({
    totalObservations: observations.length,
    totalFields: fieldTotal,
    totalCountries: countries.length,
    byStatus,
    quarantineCount: quarantine.length,
    meanConfidence,
  });

  return {
    totalObservations: observations.length,
    totalFields: fieldTotal,
    totalCountries: countries.length,
    byStatus,
    quarantine,
    countries,
    meanConfidence,
    summaryRu,
  };
}

/** Короткая сводка по набору одной строкой (для логов и шапки отчёта). */
export function buildDatasetSummaryRu(input: {
  totalObservations: number;
  totalFields: number;
  totalCountries: number;
  byStatus: Record<VerificationStatus, number>;
  quarantineCount: number;
  meanConfidence: number;
}): string {
  return (
    `Наблюдений: ${input.totalObservations}; полей «страна × показатель»: ${input.totalFields}; ` +
    `стран: ${input.totalCountries}. Верифицировано: ${input.byStatus.verified}; ` +
    `один источник: ${input.byStatus["single-source"]}; только оценки: ${input.byStatus["estimated-only"]}; ` +
    `устарело: ${input.byStatus.stale}; карантин: ${input.quarantineCount}; отклонено: ${input.byStatus.rejected}. ` +
    `Средний confidence: ${input.meanConfidence.toFixed(2)}.`
  );
}

/** Текстовый отчёт по набору: сводка + карантин + худшие страны по confidence. */
export function formatDatasetReportRu(report: DatasetVerificationReport): string {
  const lines: string[] = [];
  lines.push("ОТЧЁТ ВЕРИФИКАЦИИ ДАННЫХ (Волна 4)");
  lines.push(report.summaryRu);
  lines.push("");
  lines.push(`КАРАНТИН (${report.quarantine.length}):`);
  if (report.quarantine.length === 0) {
    lines.push("  — пуст: расхождений выше допуска не найдено.");
  }
  for (const entry of report.quarantine) {
    lines.push(
      `  ${entry.iso3} / ${entry.field}: расхождение ${entry.maxDeviationPct.toFixed(1)}% — ${entry.reasonRu}`,
    );
    lines.push(`    Реабилитация: ${entry.resolutionHintRu}`);
  }
  lines.push("");
  lines.push("СТРАНЫ С НИЗКИМ CONFIDENCE (топ-10):");
  const worst = [...report.countries]
    .sort((a, b) => a.meanConfidence - b.meanConfidence)
    .slice(0, 10);
  for (const country of worst) {
    lines.push(
      `  ${country.iso3}: confidence ${country.meanConfidence.toFixed(2)}, полей ${country.fieldsChecked}, кросс-чек ${(country.crossCheckedShare * 100).toFixed(0)}%`,
    );
  }
  return lines.join("\n");
}

/** Текстовый отчёт по одной стране. */
export function formatCountryReportRu(report: CountryVerificationReport): string {
  const lines: string[] = [];
  lines.push(`ВЕРИФИКАЦИЯ: ${report.iso3}`);
  lines.push(
    `Полей: ${report.fieldsChecked}; средний confidence: ${report.meanConfidence.toFixed(2)}; доля кросс-чека: ${(report.crossCheckedShare * 100).toFixed(0)}%`,
  );
  for (const field of report.fields) {
    lines.push(
      `  [${field.status}] ${field.field}: медиана ${field.medianValue ?? "—"}, расхождение ${field.maxDeviationPct.toFixed(1)}%, источников ${field.independentSources}, confidence ${field.confidence.toFixed(2)}`,
    );
  }
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Правила контура (публичная формулировка для методологии и UI)
// ─────────────────────────────────────────────────────────────────────────────

/** Правила верификационного контура — как они публикуются пользователю. */
export const VERIFICATION_RULES_RU: string[] = [
  "Рабочим считается значение, подтверждённое минимум двумя независимыми источниками.",
  "Расхождение независимых источников более ±20% от медианы — карантин, а не усреднение.",
  "LLM-сгенерированное значение живёт в карантине, пока его не подтвердит независимый опубликованный источник.",
  "Дубль одного источника не является вторым источником: независимость считается по разным базам и ведомствам.",
  "Значение вне физического диапазона поля отклоняется без кросс-чека: это ошибка единиц или масштаба.",
  "Оценки не смешиваются с фактами без флага estimated: ряд из одних оценок получает статус estimated-only.",
  "Карантин не удаляет значение: оно хранится с причиной и путём реабилитации и видно в отчётах.",
  "Confidence значения пробрасывается в модель БП: широта неопределённости — часть результата, а не сноска.",
];

/** Порог допуска по умолчанию в процентах — правило ±20% одним числом. */
export const DEFAULT_TOLERANCE_PCT: number = DEFAULT_VERIFICATION_CONFIG.tolerancePct;
