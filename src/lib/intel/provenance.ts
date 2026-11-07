// ─────────────────────────────────────────────────────────────────────────────
// Провенанс значений: источник, год, метод, грейд
// Реестр источников с базовыми адмиралтейскими грейдами и реестр полей по умолчанию
// ─────────────────────────────────────────────────────────────────────────────

import {
  confidenceFromGrade,
  type AdmiraltyGrade,
  type InfoCredibility,
  type SourceReliability,
} from "./admiralty";

// Провенанс — это ответ на вопрос «откуда это число» на уровне одного
// значения, а не страны вообще. Значение без провенанса в РБП-Стратег 3.0
// считается черновиком: оно не попадает в публичные сводки и помечается
// в интерфейсе. Особый режим — метод "llm-generated": такие значения
// обязаны проходить кросс-чек минимум по двум независимым источникам
// (Волна 4 дорожной карты) и до этого живут в карантине.

export type IntelSourceId =
  | "sipri"
  | "iiss"
  | "fas"
  | "worldbank"
  | "cia"
  | "un"
  | "gfp"
  | "csis"
  | "rusi"
  | "custom";

export type ProvenanceMethod =
  | "official-statistics"
  | "manual-curation"
  | "scraping"
  | "expert-estimate"
  | "llm-generated"
  | "cross-validated"
  | "field-report"
  | "commercial-database";

export interface IntelSourceProfile {
  id: IntelSourceId;
  name: string;
  nameRu: string;
  publisherRu: string;
  urlDescriptionRu: string;
  baseReliability: SourceReliability;
  baseCredibility: InfoCredibility;
  rationaleRu: string;
  strengthsRu: string[];
  limitationsRu: string[];
  updateFrequencyRu: string;
  coverageRu: string;
}

export interface ValueProvenance {
  field: string;
  sourceId: IntelSourceId;
  dataYear: number;
  method: ProvenanceMethod;
  grade: AdmiraltyGrade;
  urlDescriptionRu: string;
  retrievedAt: string;
  noteRu: string;
}

export const SOURCE_REGISTRY: IntelSourceProfile[] = [
  {
    id: "sipri",
    name: "SIPRI",
    nameRu: "СИПРИ",
    publisherRu: "Stockholm International Peace Research Institute",
    urlDescriptionRu: "sipri.org — базы военных расходов и поставок вооружений",
    baseReliability: "B",
    baseCredibility: 2,
    rationaleRu:
      "Институт с аудируемой методологией и полувековой историей рядов; расхождения с национальными данными публикуются открыто.",
    strengthsRu: [
      "Военные расходы в сопоставимой методологии по 170+ странам",
      "Поставки вооружений (TIV) с 1950 года",
      "Открытая методика пересчёта в постоянные цены",
    ],
    limitationsRu: [
      "Оценки по закрытым странам (КНДР) — модельные",
      "Годовой лаг публикации",
      "Не публикует запасы и боеготовность",
    ],
    updateFrequencyRu: "Ежегодно (апрель); винтаж реестра — Milex, факт-лист апреля 2026; Yearbook 2026 (июнь 2026)",
    coverageRu: "170+ стран",
  },
  {
    id: "iiss",
    name: "IISS Military Balance",
    nameRu: "IISS «Военный баланс»",
    publisherRu: "International Institute for Strategic Studies",
    urlDescriptionRu: "iiss.org — ежегодник The Military Balance (платный)",
    baseReliability: "B",
    baseCredibility: 2,
    rationaleRu:
      "Стандарт де-факто по составу ВС: редакционная проверка по странам, осторожные оценки с пометками о неопределённости.",
    strengthsRu: [
      "Состав и численность ВС по видам и родам",
      "Органы управления и структура соединений",
      "Оценки с явными оговорками по спорным странам",
    ],
    limitationsRu: [
      "Платный доступ затрудняет прямую перепроверку чисел",
      "Численность техники — наличие, а не боеготовность",
      "Лаг до года по быстро меняющимся данным",
    ],
    updateFrequencyRu: "Ежегодно (февраль); винтаж реестра — The Military Balance 2026 (24.02.2026)",
    coverageRu: "170+ стран",
  },
  {
    id: "fas",
    name: "FAS Nuclear Notebook",
    nameRu: "FAS «Ядерный блокнот»",
    publisherRu: "Federation of American Scientists",
    urlDescriptionRu: "fas.org — Nuclear Notebook, оценки ядерных арсеналов",
    baseReliability: "B",
    baseCredibility: 2,
    rationaleRu:
      "Кристенсен и Корда — наиболее цитируемые открытые оценки арсеналов; методика и допущения публикуются с каждой оценкой.",
    strengthsRu: [
      "Арсеналы всех 9 ядерных держав в одной методологии",
      "Разбивка: развёрнуто/резерв/ожидает демонтажа",
      "Прозрачные допущения по закрытым программам",
    ],
    limitationsRu: [
      "Оценки, а не факты: по КНДР разброс оценок в разы",
      "Израиль — политика амбивалентности, данных нет",
      "Обновления по странам выходят неравномерно",
    ],
    updateFrequencyRu: "По странам, несколько раз в год; винтаж реестра — Status of World Nuclear Forces 2026 (январь 2026)",
    coverageRu: "9 ядерных держав",
  },
  {
    id: "worldbank",
    name: "World Bank Open Data",
    nameRu: "Всемирный банк",
    publisherRu: "World Bank Group",
    urlDescriptionRu: "data.worldbank.org — открытое API макроэкономических рядов",
    baseReliability: "A",
    baseCredibility: 2,
    rationaleRu:
      "Официальная статистика с полной методологией и ревизиями рядов; источник не заинтересован в военных выводах.",
    strengthsRu: [
      "ВВП, население, инфраструктура в единой методологии",
      "Длинные ряды для трендов",
      "Машиночитаемое API и версионирование",
    ],
    limitationsRu: [
      "Военный бюджет — самоотчёт стран без проверки",
      "Лаг 1–2 года",
      "ППС-оценки по закрытым экономикам модельны",
    ],
    updateFrequencyRu: "Ежегодно (июль)",
    coverageRu: "217 стран и территорий",
  },
  {
    id: "cia",
    name: "CIA World Factbook",
    nameRu: "Справочник ЦРУ по странам мира",
    publisherRu: "U.S. Central Intelligence Agency",
    urlDescriptionRu: "cia.gov/the-world-factbook — открытые страновые справки",
    baseReliability: "C",
    baseCredibility: 3,
    rationaleRu:
      "Широчайший охват и частота обновления, но методика по полям не раскрывается, а часть данных перепечатывается из национальных источников.",
    strengthsRu: [
      "География, инфраструктура, население по всем территориям",
      "Еженедельные обновления",
      "Единый формат облегчает сверку",
    ],
    limitationsRu: [
      "Источники по полям не указываются",
      "Военные поля поверхностны",
      "Возможны политические акценты в формулировках",
    ],
    updateFrequencyRu: "Еженедельно",
    coverageRu: "260+ территорий",
  },
  {
    id: "un",
    name: "UN Data",
    nameRu: "Статистическая комиссия ООН",
    publisherRu: "United Nations Statistics Division",
    urlDescriptionRu: "data.un.org — демография и национальные счета",
    baseReliability: "A",
    baseCredibility: 2,
    rationaleRu:
      "Первичная демографическая методология (World Population Prospects) — стандарт для мобилизационных расчётов.",
    strengthsRu: [
      "Демографические прогнозы по возрастным когортам",
      "Методология открыта и рецензируется",
      "Нейтральность источника",
    ],
    limitationsRu: [
      "Нет военных данных как класса",
      "Прогнозы расходятся с переписями по закрытым странам",
      "Годовой лаг",
    ],
    updateFrequencyRu: "Ежегодно",
    coverageRu: "230+ стран и территорий",
  },
  {
    id: "gfp",
    name: "Global Firepower",
    nameRu: "Global Firepower Index",
    publisherRu: "GlobalFirepower.com",
    urlDescriptionRu: "globalfirepower.com — ежегодный рейтинг военной мощи",
    baseReliability: "D",
    baseCredibility: 3,
    rationaleRu:
      "Популярный агрегатор без раскрытой методологии: веса и формулы закрыты, числа невозможно перепроверить до первоисточника.",
    strengthsRu: [
      "Широкий набор полей по технике и ресурсам в одном месте",
      "Ежегодный единый срез по 145 странам",
      "Удобен как черновой каркас для последующей верификации",
    ],
    limitationsRu: [
      "Закрытая методология — грейд источника не может быть выше D",
      "Известны дубли и устаревшие значения (в нашем пайплайне — дубль Австралии)",
      "Ядерное оружие исключено из индекса без явного предупреждения пользователю",
    ],
    updateFrequencyRu: "Ежегодно (январь)",
    coverageRu: "145 стран",
  },
  {
    id: "csis",
    name: "CSIS",
    nameRu: "CSIS (Центр стратегических и международных исследований)",
    publisherRu: "Center for Strategic and International Studies",
    urlDescriptionRu: "csis.org — Asia Maritime Transparency Initiative, Missile Threat, аналитика",
    baseReliability: "C",
    baseCredibility: 2,
    rationaleRu:
      "Сильные тематические проекты с первичными данными (снимки AMTI, база ракетных программ), но это адвокатская аналитика с позицией.",
    strengthsRu: [
      "Первичные спутниковые материалы по спорным территориям",
      "Структурированная база ракетных программ мира",
      "Публичные данные к исследованиям по запасам боеприпасов",
    ],
    limitationsRu: [
      "Позиция института влияет на выбор тем и акценты",
      "Оценки запасов — модельные, с широкими диапазонами",
      "Не страновой, а тематический охват",
    ],
    updateFrequencyRu: "Непрерывно, по проектам",
    coverageRu: "Тематические регионы и программы",
  },
  {
    id: "rusi",
    name: "RUSI",
    nameRu: "RUSI (Королевский объединённый институт оборонных исследований)",
    publisherRu: "Royal United Services Institute",
    urlDescriptionRu: "rusi.org — комментарии и доклады по текущим конфликтам",
    baseReliability: "C",
    baseCredibility: 2,
    rationaleRu:
      "Британский оборонный институт с сильным полевым доступом (доклады по войне в Украине цитируются военными), но оценки часто опираются на анонимные источники.",
    strengthsRu: [
      "Полевые оценки хода боевых действий от военных экспертов",
      "Быстрые доклады по урокам текущих войн",
      "Доступ к западным военным кругам",
    ],
    limitationsRu: [
      "Анонимные источники неперепроверяемы",
      "Оценки потерь сторон расходятся с другими центрами",
      "Институциональная близость к британскому истеблишменту",
    ],
    updateFrequencyRu: "Непрерывно",
    coverageRu: "Тематический охват",
  },
  {
    id: "custom",
    name: "Собственная оценка проекта",
    nameRu: "Внутренние оценки РБП-Стратег",
    publisherRu: "РБП-Стратег (внутренняя методология)",
    urlDescriptionRu: "Внутренние рубрики проекта: экспертные шкалы и модельные расчёты",
    baseReliability: "F",
    baseCredibility: 6,
    rationaleRu:
      "Источник без внешней истории проверки: по правилам адмиралтейской шкалы надёжность не может быть оценена выше F, пока оценки не сверены с исходами.",
    strengthsRu: [
      "Единая рубрика внутри проекта",
      "Воспроизводимость при повторном скоринге",
      "Прямая связь с компонентами модели БП",
    ],
    limitationsRu: [
      "Нет внешней верификации",
      "Риск систематической ошибки одного коллектива оценщиков",
      "LLM-сгенерированные значения требуют обязательной маркировки и карантина",
    ],
    updateFrequencyRu: "При каждом пересчёте модели",
    coverageRu: "Все страны, неравномерно по полям",
  },
];

// ─── Провенанс по умолчанию для полей модели (переопределяется на уровне значения) ───
export interface FieldProvenanceDefault {
  field: string;
  sourceId: IntelSourceId;
  method: ProvenanceMethod;
}
export const FIELD_PROVENANCE_DEFAULTS: FieldProvenanceDefault[] = [
  { field: "activePersonnel", sourceId: "iiss", method: "manual-curation" },
  { field: "reservePersonnel", sourceId: "iiss", method: "manual-curation" },
  { field: "paramilitary", sourceId: "iiss", method: "manual-curation" },
  { field: "fitForServiceM", sourceId: "un", method: "official-statistics" },
  { field: "populationM", sourceId: "worldbank", method: "official-statistics" },
  { field: "totalTanks", sourceId: "iiss", method: "manual-curation" },
  { field: "armoredVehicles", sourceId: "iiss", method: "manual-curation" },
  { field: "artillery", sourceId: "iiss", method: "manual-curation" },
  { field: "mlrs", sourceId: "iiss", method: "manual-curation" },
  { field: "totalAircraft", sourceId: "iiss", method: "manual-curation" },
  { field: "fighters", sourceId: "iiss", method: "manual-curation" },
  { field: "attackHelicopters", sourceId: "iiss", method: "manual-curation" },
  { field: "totalNavy", sourceId: "iiss", method: "manual-curation" },
  { field: "aircraftCarriers", sourceId: "iiss", method: "manual-curation" },
  { field: "submarines", sourceId: "iiss", method: "manual-curation" },
  { field: "destroyers", sourceId: "iiss", method: "manual-curation" },
  { field: "frigates", sourceId: "iiss", method: "manual-curation" },
  { field: "gdpPppBn", sourceId: "worldbank", method: "official-statistics" },
  { field: "gdpNominalBn", sourceId: "worldbank", method: "official-statistics" },
  { field: "militaryBudgetBn", sourceId: "sipri", method: "cross-validated" },
  { field: "defensePctGdp", sourceId: "sipri", method: "cross-validated" },
  { field: "armsExports", sourceId: "sipri", method: "official-statistics" },
  { field: "armsImports", sourceId: "sipri", method: "official-statistics" },
  { field: "defenseIndustryRevenue", sourceId: "sipri", method: "expert-estimate" },
  { field: "areaKm2", sourceId: "cia", method: "manual-curation" },
  { field: "coastlineKm", sourceId: "cia", method: "manual-curation" },
  { field: "bordersKm", sourceId: "cia", method: "manual-curation" },
  { field: "roadwaysKm", sourceId: "worldbank", method: "official-statistics" },
  { field: "railwaysKm", sourceId: "worldbank", method: "official-statistics" },
  { field: "airfields", sourceId: "cia", method: "manual-curation" },
  { field: "ports", sourceId: "cia", method: "manual-curation" },
  { field: "merchantFleet", sourceId: "cia", method: "manual-curation" },
  { field: "oilProductionKbd", sourceId: "cia", method: "manual-curation" },
  { field: "oilReserves", sourceId: "cia", method: "expert-estimate" },
  { field: "nuclearWarheads", sourceId: "fas", method: "expert-estimate" },
  { field: "icbmCount", sourceId: "fas", method: "expert-estimate" },
  { field: "slbmCount", sourceId: "fas", method: "expert-estimate" },
  { field: "strategicBombers", sourceId: "fas", method: "expert-estimate" },
  { field: "c4isrScore", sourceId: "custom", method: "expert-estimate" },
  { field: "ewScore", sourceId: "custom", method: "expert-estimate" },
  { field: "techLevel", sourceId: "custom", method: "expert-estimate" },
  { field: "moraleIndex", sourceId: "custom", method: "expert-estimate" },
  { field: "trainingIndex", sourceId: "custom", method: "expert-estimate" },
  { field: "combatExperienceScore", sourceId: "custom", method: "llm-generated" },
  { field: "strategicCultureScore", sourceId: "custom", method: "llm-generated" },
  { field: "doctrineScore", sourceId: "custom", method: "expert-estimate" },
  { field: "gfpRank", sourceId: "gfp", method: "scraping" },
  { field: "gfpPowerIndex", sourceId: "gfp", method: "scraping" },
  { field: "uavCount", sourceId: "custom", method: "expert-estimate" },
  { field: "fpvProductionMonthly", sourceId: "custom", method: "llm-generated" },
  { field: "shellStockMonths", sourceId: "custom", method: "expert-estimate" },
  { field: "shellProductionMonthly", sourceId: "custom", method: "llm-generated" },
  { field: "missileStock", sourceId: "csis", method: "expert-estimate" },
  { field: "airDefenseInterceptors", sourceId: "custom", method: "expert-estimate" },
  { field: "exercisesPerYear", sourceId: "custom", method: "manual-curation" },
  { field: "conflictHistoryScore", sourceId: "custom", method: "manual-curation" },
  { field: "allianceMembership", sourceId: "un", method: "official-statistics" },
  { field: "basesAbroad", sourceId: "iiss", method: "manual-curation" },
  { field: "spaceAssets", sourceId: "custom", method: "expert-estimate" },
  { field: "cyberCapabilityScore", sourceId: "custom", method: "expert-estimate" },
  { field: "conscriptionTermMonths", sourceId: "iiss", method: "manual-curation" },
  { field: "mobilizationCapacity", sourceId: "custom", method: "expert-estimate" },
  { field: "reserveTrainingDays", sourceId: "custom", method: "llm-generated" },
  { field: "tankProductionMonthly", sourceId: "custom", method: "llm-generated" },
  { field: "aircraftProductionMonthly", sourceId: "custom", method: "expert-estimate" },
  { field: "defenseExportsPartners", sourceId: "sipri", method: "official-statistics" },
  { field: "militaryAidReceived", sourceId: "sipri", method: "cross-validated" },
  { field: "foreignBasesHosted", sourceId: "iiss", method: "manual-curation" },
  { field: "peacekeepingContribution", sourceId: "un", method: "official-statistics" },
  { field: "militarySpendingPerSoldier", sourceId: "sipri", method: "cross-validated" },
  { field: "readinessRate", sourceId: "custom", method: "expert-estimate" },
  { field: "pilotFlightHours", sourceId: "custom", method: "expert-estimate" },
  { field: "artilleryShellStock", sourceId: "custom", method: "expert-estimate" },
  { field: "droneOperatorsTrained", sourceId: "custom", method: "llm-generated" },
  { field: "ewUnitsCount", sourceId: "custom", method: "expert-estimate" },
  { field: "submarinePatrolRate", sourceId: "custom", method: "llm-generated" },
];

/** Профиль источника по id. */
export function getSourceProfile(id: IntelSourceId): IntelSourceProfile {
  const found = SOURCE_REGISTRY.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Неизвестный источник: ${id}`);
  }
  return found;
}

/** Базовый грейд источника из реестра. */
export function baseGradeForSource(id: IntelSourceId): AdmiraltyGrade {
  const profile = getSourceProfile(id);
  return { source: profile.baseReliability, info: profile.baseCredibility };
}

/** Провенанс по умолчанию для поля модели (если значение не несёт свой). */
export function defaultProvenanceForField(field: string): FieldProvenanceDefault | undefined {
  return FIELD_PROVENANCE_DEFAULTS.find((f) => f.field === field);
}

/** Полнота провенанса 0..1: сколько обязательных элементов реально заполнено. */
export function provenanceCompleteness(p: Partial<ValueProvenance>): number {
  let score = 0;
  if (p.field) score += 0.15;
  if (p.sourceId) score += 0.2;
  if (p.dataYear && p.dataYear > 1950) score += 0.15;
  if (p.method) score += 0.15;
  if (p.grade) score += 0.2;
  if (p.urlDescriptionRu) score += 0.1;
  if (p.retrievedAt) score += 0.05;
  return Math.min(1, score);
}

/** Свежесть данных 0..1: линейный штраф за возраст, горизонт — 6 лет. */
export function freshnessScore(dataYear: number, currentYear: number): number {
  const age = Math.max(0, currentYear - dataYear);
  return Math.max(0, 1 - age / 6);
}

/** Итоговый confidence значения: грейд × свежесть × полнота провенанса. */
export function valueConfidence(p: ValueProvenance, currentYear: number): number {
  const gradeConfidence = confidenceFromGrade(p.grade);
  const fresh = freshnessScore(p.dataYear, currentYear);
  const complete = provenanceCompleteness(p);
  return gradeConfidence * (0.5 + 0.5 * fresh) * (0.6 + 0.4 * complete);
}

/** Значение обязано жить в карантине до кросс-чека. */
export function requiresQuarantine(p: ValueProvenance): boolean {
  return p.method === "llm-generated" || p.grade.source === "F";
}

/** Человекочитаемая сноска провенанса для сводок и интерфейса. */
export function formatProvenanceFootnote(p: ValueProvenance): string {
  const profile = getSourceProfile(p.sourceId);
  return `${profile.name}, данные ${p.dataYear} г., метод: ${p.method}, грейд ${p.grade.source}${p.grade.info}. ${p.urlDescriptionRu}`;
}

export const PROVENANCE_REQUIREMENTS_RU: string[] = [
  "Каждое публикуемое значение имеет источник, год данных и метод получения.",
  "LLM-сгенерированные значения маркируются методом llm-generated и не смешиваются с проверенными в одном ряду без флага.",
  "Грейд значения не может быть выше базового грейда его источника без документированной причины.",
  "При расхождении двух источников более чем на 20% значение уходит в карантин, а не усредняется молча.",
  "Сноска провенанса обязательна в каждой экспортируемой сводке (Волна 5).",
];
