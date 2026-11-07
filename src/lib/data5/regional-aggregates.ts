/**
 * Региональные агрегаты по странам волны data5 («РБП-Стратег 3.0», волна 7).
 *
 * Файл дополняет country-profiles-rest.ts региональным срезом:
 * - типы и функции агрегации по регионам (суммы бюджетов и личного состава,
 *   средние показатели, доли стран без армии, распределение зависимости
 *   от импорта) — считаются из профилей, а не дублируют их вручную;
 * - аналитические профили 13 регионов: география безопасности, ключевые
 *   акторы, конфликтный ландшафт, внешние присутствия, тренды;
 * - региональные роли каждой из 102 стран (вклад страны в баланс региона);
 * - сводные индикаторные таблицы по странам для быстрых сравнений;
 * - внешние военные присутствия, определяющие безопасность этих стран;
 * - трендовые ряды военных расходов регионов за 2020–2024 годы
 *   (оценки по SIPRI, округлённо, только по странам волн data5);
 * - трансграничные коридоры угроз (наркотрафик, джихадистские фронты,
 *   морские маршруты), связывающие профили в единую картину;
 * - глоссарий показателей агрегации.
 *
 * Методологические правила агрегации:
 * - алиас PHI исключён из всех сумм: Филиппины учитываются один раз
 *   в волне data3 под кодом PHL и в страны data5 не входят экономически;
 * - страны с закрытым бюджетом (amountUsdBn = null) не участвуют в суммах
 *   и учитываются отдельным счётчиком непрозрачности региона;
 * - суммы бюджетов — нижняя оценка региона: они складывают только
 *   страны волны data5 и не включают крупные державы волн bp3/warfare3
 *   и data3 того же региона;
 * - средние показатели считаются по странам с известными значениями,
 *   знаменатель всегда возвращается вместе со средним.
 */

import {
  REST_COUNTRY_PROFILES,
  type RestCountryProfile,
  type RestProvenance,
} from "./country-profiles-rest.js";

// ─────────────────────────────────────────────────────────────────────────────
// Типы агрегации
// ─────────────────────────────────────────────────────────────────────────────

/** Агрегированная сводка по одному региону (только страны волны data5). */
export interface RegionAggregate {
  /** Название региона (рус.), совпадает с полем region профилей. */
  region: string;
  /** Число профилей региона (включая алиас PHI, если он в регионе). */
  profileCount: number;
  /** Число стран региона с учётом исключения алиаса PHI. */
  countryCount: number;
  /** Число стран с регулярной армией. */
  withArmyCount: number;
  /** Число стран без армии (силы безопасности / полиция). */
  withoutArmyCount: number;
  /** Сумма известных военных бюджетов, млрд долл. США. */
  knownBudgetSumUsdBn: number;
  /** Число стран с известным бюджетом (знаменатель суммы). */
  budgetKnownCount: number;
  /** Число стран с закрытым бюджетом (null). */
  budgetOpaqueCount: number;
  /** Средний известный бюджет страны региона, млрд долл. США. */
  averageBudgetUsdBn: number | null;
  /** Медианный известный бюджет, млрд долл. США. */
  medianBudgetUsdBn: number | null;
  /** Сумма активного личного состава по известным значениям, человек. */
  knownActiveSum: number;
  /** Число стран с известной численностью активного состава. */
  activeKnownCount: number;
  /** Средний активный состав страны региона, человек. */
  averageActive: number | null;
  /** Сумма резервов по известным значениям, человек. */
  knownReserveSum: number;
  /** Число стран с собственным ВПК (hasIndustry = true). */
  withIndustryCount: number;
  /** Распределение уровней импортозависимости: уровень → число стран. */
  importLevelCounts: ReadonlyMap<string, number>;
  /** Код страны с крупнейшим известным бюджетом региона. */
  largestBudgetIso3: string | null;
  /** Код страны с крупнейшим известным активным составом региона. */
  largestActiveIso3: string | null;
  /** Суммарное число зафиксированных уязвимостей в профилях региона. */
  vulnerabilityTotal: number;
  /** Число уязвимостей высокой тяжести в профилях региона. */
  highSeverityVulnerabilityCount: number;
}

/** Сводка по всем регионам волны data5 сразу. */
export interface AllRegionsSummary {
  /** Агрегаты по регионам в порядке убывания суммарного бюджета. */
  regions: readonly RegionAggregate[];
  /** Общее число профилей (с алиасом). */
  totalProfiles: number;
  /** Общее число стран (без алиаса). */
  totalCountries: number;
  /** Сумма всех известных бюджетов волны, млрд долл. США. */
  totalKnownBudgetUsdBn: number;
  /** Сумма всего известного активного состава волны, человек. */
  totalKnownActive: number;
  /** Число стран без армии во всей волне. */
  totalWithoutArmy: number;
  /** Число стран с закрытым бюджетом во всей волне. */
  totalOpaqueBudgets: number;
}

/** Запись о роли страны в своём регионе. */
export interface CountryRegionRole {
  /** Код ISO3. */
  iso3: string;
  /** Регион (рус.). */
  region: string;
  /** Роль страны в региональном балансе (рус.). */
  roleRu: string;
  /** Вклад страны в регион: население, география, силы, рента (рус.). */
  contributionRu: string;
  /** Главный региональный тренд, затрагивающий страну (рус.). */
  trendRu: string;
  /** Главный региональный риск страны (рус.). */
  riskRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Аналитический профиль региона. */
export interface RegionAnalyticalProfile {
  /** Название региона (рус.). */
  region: string;
  /** Географическая рамка региона в проекте (рус.). */
  scopeRu: string;
  /** Общая характеристика безопасности региона (рус.). */
  summaryRu: string;
  /** Ключевой структурный фактор региона (рус.). */
  structuralFactorRu: string;
  /** Главный конфликтный ландшафт (рус.). */
  conflictLandscapeRu: string;
  /** Роль внешних держав и арендаторов безопасности (рус.). */
  externalActorsRu: string;
  /** Тренд расходов и милитаризации (рус.). */
  spendingTrendRu: string;
  /** Прогнозная оговорка проекта на 2025–2027 годы (рус.). */
  outlookRu: string;
  /** Главные страны региона внутри волны data5 (коды ISO3). */
  keyIso3: readonly string[];
  /** Провенанс профиля. */
  provenance: RestProvenance;
}

/** Сводная индикаторная запись страны для региональных сравнений. */
export interface CountryIndicatorSnapshot {
  /** Код ISO3. */
  iso3: string;
  /** Регион (рус.). */
  region: string;
  /** Известный бюджет, млрд долл. США; null — закрыт. */
  budgetUsdBn: number | null;
  /** Известный активный состав; null — нет оценки. */
  active: number | null;
  /** Есть ли стоячая армия. */
  hasStandingArmy: boolean;
  /** Есть ли собственный ВПК. */
  hasIndustry: boolean;
  /** Уровень импортозависимости (рус.). */
  importLevelRu: string;
  /** Число уязвимостей в профиле. */
  vulnerabilityCount: number;
  /** Число уязвимостей высокой тяжести в профиле. */
  highSeverityCount: number;
}

/** Внешнее военное присутствие, значимое для стран волны data5. */
export interface ExternalPresenceEntry {
  /** Страна или организация — держатель присутствия. */
  holder: string;
  /** Страна пребывания (название, рус.). */
  hostRu: string;
  /** Код ISO3 страны пребывания (из волны data5, если применимо). */
  hostIso3: string | null;
  /** Формат присутствия (рус.). */
  formatRu: string;
  /** Масштаб и функции (рус.). */
  scaleRu: string;
  /** Значение для безопасности принимающей страны (рус.). */
  significanceRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Точка трендового ряда военных расходов региона. */
export interface RegionSpendingPoint {
  /** Год. */
  year: number;
  /** Оценка суммарных известных расходов стран data5 региона, млрд долл. */
  totalUsdBn: number;
  /** Комментарий к динамике года (рус.). */
  noteRu: string;
}

/** Трендовый ряд одного региона за 2020–2024 годы. */
export interface RegionSpendingSeries {
  /** Регион (рус.). */
  region: string;
  /** Точки ряда по годам. */
  points: readonly RegionSpendingPoint[];
  /** Провенанс ряда. */
  provenance: RestProvenance;
}

/** Трансграничный коридор угроз, связывающий несколько профилей волны. */
export interface ThreatCorridorEntry {
  /** Название коридора (рус.). */
  nameRu: string;
  /** Тип угрозы (рус.): наркотрафик, джихадизм, пиратство и т.д. */
  typeRu: string;
  /** Описание маршрута и механизма (рус.). */
  descriptionRu: string;
  /** Затронутые страны волны data5 (коды ISO3). */
  affectedIso3: readonly string[];
  /** Как страны волны отвечают на угрозу (рус.). */
  responseRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Запись глоссария показателей агрегации. */
export interface AggregationGlossaryEntry {
  /** Термин (рус.). */
  termRu: string;
  /** Определение в контексте волны data5 (рус.). */
  definitionRu: string;
  /** Методическая оговорка по термину (рус.). */
  caveatRu: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции агрегации
// ─────────────────────────────────────────────────────────────────────────────

/** Алиасный код, исключаемый из всех экономических сумм волны. */
export const AGGREGATION_EXCLUDED_ALIAS: string = "PHI";

/**
 * Профили, участвующие в экономических агрегатах:
 * все профили волны, кроме алиаса PHI.
 */
export function aggregatableProfiles(): readonly RestCountryProfile[] {
  return REST_COUNTRY_PROFILES.filter(
    (profile) => profile.iso3 !== AGGREGATION_EXCLUDED_ALIAS,
  );
}

/** Уникальные регионы волны в порядке первого появления в профилях. */
export function data5Regions(): readonly string[] {
  const seen: string[] = [];
  for (const profile of REST_COUNTRY_PROFILES) {
    if (!seen.includes(profile.region)) {
      seen.push(profile.region);
    }
  }
  return seen;
}

/** Профили одного региона (включая алиас, если он принадлежит региону). */
export function profilesOfRegion(region: string): readonly RestCountryProfile[] {
  return REST_COUNTRY_PROFILES.filter((profile) => profile.region === region);
}

/** Известные бюджеты списка профилей (null отброшены), млрд долл. США. */
export function knownBudgets(
  profiles: readonly RestCountryProfile[],
): readonly number[] {
  const result: number[] = [];
  for (const profile of profiles) {
    if (profile.budget.amountUsdBn !== null) {
      result.push(profile.budget.amountUsdBn);
    }
  }
  return result;
}

/** Сумма чисел; пустой список даёт 0. */
export function sumNumbers(values: readonly number[]): number {
  let total: number = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}

/** Среднее чисел; пустой список даёт null. */
export function averageNumbers(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return sumNumbers(values) / values.length;
}

/** Медиана чисел; пустой список даёт null. */
export function medianNumbers(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted: number[] = [...values].sort((a, b) => a - b);
  const middle: number = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }
  const lower: number = sorted[middle - 1] ?? 0;
  const upper: number = sorted[middle] ?? 0;
  return (lower + upper) / 2;
}

/** Округление суммы бюджетов до двух знаков для устойчивых сравнений. */
export function roundBudget(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Подсчёт уровней импортозависимости по списку профилей. */
export function countImportLevels(
  profiles: readonly RestCountryProfile[],
): ReadonlyMap<string, number> {
  const counts: Map<string, number> = new Map<string, number>();
  for (const profile of profiles) {
    const level: string = profile.importDependence.levelRu;
    counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return counts;
}

/** Профиль с максимальным известным бюджетом в списке; null при отсутствии. */
export function largestBudgetProfile(
  profiles: readonly RestCountryProfile[],
): RestCountryProfile | null {
  let best: RestCountryProfile | null = null;
  for (const profile of profiles) {
    if (profile.budget.amountUsdBn === null) {
      continue;
    }
    if (
      best === null ||
      best.budget.amountUsdBn === null ||
      profile.budget.amountUsdBn > best.budget.amountUsdBn
    ) {
      best = profile;
    }
  }
  return best;
}

/** Профиль с максимальным известным активным составом; null при отсутствии. */
export function largestActiveProfile(
  profiles: readonly RestCountryProfile[],
): RestCountryProfile | null {
  let best: RestCountryProfile | null = null;
  for (const profile of profiles) {
    if (profile.personnel.active === null) {
      continue;
    }
    if (
      best === null ||
      best.personnel.active === null ||
      profile.personnel.active > best.personnel.active
    ) {
      best = profile;
    }
  }
  return best;
}

/** Число уязвимостей высокой тяжести в одном профиле. */
export function highSeverityCount(profile: RestCountryProfile): number {
  let count: number = 0;
  for (const vulnerability of profile.vulnerabilities) {
    if (vulnerability.severityRu === "высокая") {
      count += 1;
    }
  }
  return count;
}

/**
 * Полный агрегат одного региона по профилям волны data5.
 * Алиас PHI учитывается в profileCount, но исключён из сумм и средних.
 */
export function aggregateRegion(region: string): RegionAggregate {
  const allProfiles: readonly RestCountryProfile[] = profilesOfRegion(region);
  const countries: readonly RestCountryProfile[] = allProfiles.filter(
    (profile) => profile.iso3 !== AGGREGATION_EXCLUDED_ALIAS,
  );
  const budgets: readonly number[] = knownBudgets(countries);
  const actives: number[] = [];
  const reserves: number[] = [];
  let activeKnownCount: number = 0;
  for (const profile of countries) {
    if (profile.personnel.active !== null) {
      actives.push(profile.personnel.active);
      activeKnownCount += 1;
    }
    if (profile.personnel.reserve !== null) {
      reserves.push(profile.personnel.reserve);
    }
  }
  let withArmyCount: number = 0;
  let withIndustryCount: number = 0;
  let vulnerabilityTotal: number = 0;
  let highSeverityTotal: number = 0;
  for (const profile of countries) {
    if (profile.hasStandingArmy) {
      withArmyCount += 1;
    }
    if (profile.defenseIndustry.hasIndustry) {
      withIndustryCount += 1;
    }
    vulnerabilityTotal += profile.vulnerabilities.length;
    highSeverityTotal += highSeverityCount(profile);
  }
  const largestBudget: RestCountryProfile | null = largestBudgetProfile(countries);
  const largestActive: RestCountryProfile | null = largestActiveProfile(countries);
  return {
    region: region,
    profileCount: allProfiles.length,
    countryCount: countries.length,
    withArmyCount: withArmyCount,
    withoutArmyCount: countries.length - withArmyCount,
    knownBudgetSumUsdBn: roundBudget(sumNumbers(budgets)),
    budgetKnownCount: budgets.length,
    budgetOpaqueCount: countries.length - budgets.length,
    averageBudgetUsdBn: averageNumbers(budgets),
    medianBudgetUsdBn: medianNumbers(budgets),
    knownActiveSum: sumNumbers(actives),
    activeKnownCount: activeKnownCount,
    averageActive: averageNumbers(actives),
    knownReserveSum: sumNumbers(reserves),
    withIndustryCount: withIndustryCount,
    importLevelCounts: countImportLevels(countries),
    largestBudgetIso3: largestBudget === null ? null : largestBudget.iso3,
    largestActiveIso3: largestActive === null ? null : largestActive.iso3,
    vulnerabilityTotal: vulnerabilityTotal,
    highSeverityVulnerabilityCount: highSeverityTotal,
  };
}

/** Агрегаты всех регионов, отсортированные по суммарному бюджету. */
export function aggregateAllRegions(): readonly RegionAggregate[] {
  const aggregates: RegionAggregate[] = [];
  for (const region of data5Regions()) {
    aggregates.push(aggregateRegion(region));
  }
  aggregates.sort((a, b) => b.knownBudgetSumUsdBn - a.knownBudgetSumUsdBn);
  return aggregates;
}

/** Сводка по всей волне data5. */
export function summarizeData5(): AllRegionsSummary {
  const regions: readonly RegionAggregate[] = aggregateAllRegions();
  const countries: readonly RestCountryProfile[] = aggregatableProfiles();
  let totalBudget: number = 0;
  let totalActive: number = 0;
  let totalWithoutArmy: number = 0;
  let totalOpaque: number = 0;
  for (const aggregate of regions) {
    totalBudget += aggregate.knownBudgetSumUsdBn;
    totalActive += aggregate.knownActiveSum;
    totalWithoutArmy += aggregate.withoutArmyCount;
    totalOpaque += aggregate.budgetOpaqueCount;
  }
  return {
    regions: regions,
    totalProfiles: REST_COUNTRY_PROFILES.length,
    totalCountries: countries.length,
    totalKnownBudgetUsdBn: roundBudget(totalBudget),
    totalKnownActive: totalActive,
    totalWithoutArmy: totalWithoutArmy,
    totalOpaqueBudgets: totalOpaque,
  };
}

/** Индикаторный снимок одного профиля для региональных таблиц. */
export function indicatorSnapshot(
  profile: RestCountryProfile,
): CountryIndicatorSnapshot {
  return {
    iso3: profile.iso3,
    region: profile.region,
    budgetUsdBn: profile.budget.amountUsdBn,
    active: profile.personnel.active,
    hasStandingArmy: profile.hasStandingArmy,
    hasIndustry: profile.defenseIndustry.hasIndustry,
    importLevelRu: profile.importDependence.levelRu,
    vulnerabilityCount: profile.vulnerabilities.length,
    highSeverityCount: highSeverityCount(profile),
  };
}

/** Индикаторные снимки всех профилей волны (включая алиас PHI). */
export function allIndicatorSnapshots(): readonly CountryIndicatorSnapshot[] {
  return REST_COUNTRY_PROFILES.map((profile) => indicatorSnapshot(profile));
}

/** Индикаторные снимки одного региона. */
export function regionIndicatorSnapshots(
  region: string,
): readonly CountryIndicatorSnapshot[] {
  return profilesOfRegion(region).map((profile) => indicatorSnapshot(profile));
}

/**
 * Доля стран региона без армии (0–1); знаменатель — страны без алиаса.
 * Возвращает null для пустого региона.
 */
export function noArmyShare(region: string): number | null {
  const aggregate: RegionAggregate = aggregateRegion(region);
  if (aggregate.countryCount === 0) {
    return null;
  }
  return aggregate.withoutArmyCount / aggregate.countryCount;
}

/**
 * Доля непрозрачных бюджетов региона (0–1): индикатор качества данных.
 * Возвращает null для пустого региона.
 */
export function opaqueBudgetShare(region: string): number | null {
  const aggregate: RegionAggregate = aggregateRegion(region);
  if (aggregate.countryCount === 0) {
    return null;
  }
  return aggregate.budgetOpaqueCount / aggregate.countryCount;
}

/** Регионы, ранжированные по доле уязвимостей высокой тяжести. */
export function regionsByRiskDensity(): readonly RegionAggregate[] {
  const aggregates: RegionAggregate[] = [...aggregateAllRegions()];
  aggregates.sort((a, b) => {
    const densityA: number =
      a.vulnerabilityTotal === 0
        ? 0
        : a.highSeverityVulnerabilityCount / a.vulnerabilityTotal;
    const densityB: number =
      b.vulnerabilityTotal === 0
        ? 0
        : b.highSeverityVulnerabilityCount / b.vulnerabilityTotal;
    return densityB - densityA;
  });
  return aggregates;
}

// ─────────────────────────────────────────────────────────────────────────────
// Аналитические профили регионов (только страны волны data5)
// ─────────────────────────────────────────────────────────────────────────────

/** Аналитические профили всех 13 регионов волны data5. */
export const REGION_ANALYTICAL_PROFILES: readonly RegionAnalyticalProfile[] = [
  {
    region: "Южная Азия",
    scopeRu: "В волне data5 представлены Афганистан, Бутан, Мальдивы — остальные страны региона покрыты волнами bp3, warfare3 и data3",
    summaryRu: "Периферия южноазиатского противостояния Индия — Пакистан — Китай: Афганистан как источник трансграничного риска, Бутан как буфер гималайского трения, Мальдивы как морской плацдарм индийско-китайской конкуренции",
    structuralFactorRu: "География: горные буферы Гималаев и морской коридор Индийского океана делают малые страны объектами, а не субъектами региональной безопасности",
    conflictLandscapeRu: "Войны нет, но афганский терроризм, гималайские стычки у границ Бутана и политическая борьба за Мальдивы задают фон",
    externalActorsRu: "Индия — системный гарант Бутана и конкурент Китая на Мальдивах; Пакистан и Китай используют Афганистан и Мальдивы как рычаги",
    spendingTrendRu: "Расходы малых стран региона символичны на фоне гонки Индии, Пакистана и Китая",
    outlookRu: "Главный риск 2025–2027 годов — не война малых стран, а их втягивание в индийско-китайское соперничество и афганский экспорт нестабильности",
    keyIso3: ["AFG", "BTN", "MDV"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Ближний Восток",
    scopeRu: "В волне data5 представлен только Бахрейн; монархии Залива и Левант покрыты другими волнами",
    summaryRu: "Бахрейн — узел американской военно-морской архитектуры Залива: штаб 5-го флота важнее собственных сил королевства на порядок",
    structuralFactorRu: "Энергетическая рента и шиитско-суннитская демография при полной зависимости от саудовско-американского зонтика",
    conflictLandscapeRu: "Прямой войны нет; риски — иранский фактор, внутренняя оппозиция и безопасность баз",
    externalActorsRu: "США (5-й флот), Саудовская Аравия (фактический гарант с 2011 года), Великобритания (база HMS Jufair)",
    spendingTrendRu: "Расходы стабильны как плата за место в американской архитектуре",
    outlookRu: "Статус-кво устойчив, пока устойчив американский зонтик и саудовская поддержка",
    keyIso3: ["BHR"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Юго-Восточная Азия",
    scopeRu: "В волне data5 — Бруней, Лаос, Восточный Тимор и алиас PHI; ядро АСЕАН покрыто другими волнами",
    summaryRu: "Периферия спора о Южно-Китайском море и индокитайского транзита: нефтегазовый султанат, сухопутный клиент Китая и Вьетнама, молодое государство с австралийским зонтиком",
    structuralFactorRu: "Морские споры с Китаем и сухопутная зависимость от соседей-гигантов задают все три профиля",
    conflictLandscapeRu: "Активных войн нет; фон — китайское давление в ЮКМ и трансграничная преступность Меконга",
    externalActorsRu: "Китай (инфраструктура и давление), Австралия (Тимор), Великобритания (гарнизон в Брунее)",
    spendingTrendRu: "Бруней тратит из ренты, Лаос — минимально, Тимор растёт с низкой базы",
    outlookRu: "Региональный риск — постепенное втягивание Лаоса в китайскую орбиту и милитаризация споров ЮКМ вокруг Брунея",
    keyIso3: ["BRN", "LAO", "TLS"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Центральная Азия",
    scopeRu: "В волне data5 — Кыргызстан, Таджикистан, Туркменистан; Казахстан и Узбекистан покрыты другими волнами",
    summaryRu: "Три слабейшие армии региона между афганской границей, водными спорами Ферганы и конкуренцией внешних гарантов: Россия теряет монополию, Китай и Турция наращивают поставки",
    structuralFactorRu: "Вода и границы Ферганской долины плюс 1,3 тыс. км таджикско-афганской границы — два системных генератора конфликтов",
    conflictLandscapeRu: "Кыргызско-таджикские пограничные войны 2021–2022 годов — единственные межгосударственные бои региона за десятилетия; мирный процесс 2024–2025 годов снижает, но не снимает риск",
    externalActorsRu: "Россия (ОДКБ, 201-я база), Китай (поставки и объект в Мургабе), Турция (БПЛА), США и ЕС (программы пограничной безопасности)",
    spendingTrendRu: "Резкий рост закупок после 2022 года: БПЛА стали валютой регионального статуса",
    outlookRu: "Ключевой вопрос — удержит ли Бишкек и Душанбе делимитацию границы и кто станет главным поставщиком Душанбе и Ашхабада",
    keyIso3: ["KGZ", "TJK", "TKM"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Европа",
    scopeRu: "В волне data5 — малые и нейтральные страны Западной и Южной Европы: Албания, Андорра, Босния и Герцеговина, Кипр, Исландия, Ирландия, Лихтенштейн, Люксембург, Черногория, Северная Македония, Словения, Швейцария, Мальта",
    summaryRu: "Два мира в одном регионе: балканское кольцо НАТО с растущими расходами и клуб нейтралов и микрогосударств, десятилетиями экономивших на обороне под американским зонтиком",
    structuralFactorRu: "НАТО как главный производитель безопасности: членство заменяет собственные армии малым странам, нейтралитет — Ирландии, Швейцарии и Мальте",
    conflictLandscapeRu: "Войн нет; замороженные узлы — Кипр (1974) и Босния (Дейтон), сербско-косовский фон для Черногории и Северной Македонии",
    externalActorsRu: "США и НАТО — системно; Великобритания и Греция/Турция — на Кипре; ЕС — через миссии в Боснии",
    spendingTrendRu: "После 2022 года даже нейтралы пересматривают минимумы: Ирландия обсуждает радары и сонары, Швейцария закупает F-35",
    outlookRu: "Тренд — медленная ремилитаризация малых европейских государств и давление на нейтралов по вопросам транзита и ПВО",
    keyIso3: ["CHE", "CYP", "IRL", "ISL", "SVN"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Восточная Европа",
    scopeRu: "В волне data5 представлена только Молдова; фронт украинского театра покрыт другими волнами",
    summaryRu: "Молдова — нейтральный буфер между Румынией (НАТО/ЕС) и российским контингентом в Приднестровье: её армия сознательно меньше приднестровской группировки",
    structuralFactorRu: "Конституционный нейтралитет при неурегулированном конфликте и полной энергетической зависимости от восточного соседа",
    conflictLandscapeRu: "Замороженный конфликт 1992 года; война в соседней Украине превратила Молдову в тыловой коридор и объект гибридного давления",
    externalActorsRu: "Россия (ОГРВ и склады в Колбасне), ЕС и США (помощь и радары), Румыния (политический зонтик)",
    spendingTrendRu: "Рост с минимальной базы: первые современные радары и программы ЕС",
    outlookRu: "Риск — не вторжение, а политическая дестабилизация и приднестровский инцидент",
    keyIso3: ["MDA"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Центральная Америка и Карибы",
    scopeRu: "В волне data5 — 19 государств: от Гватемалы с армией и военным прошлым до микрогосударств восточных Карибов без вооружённых сил",
    summaryRu: "Регион, где главная война — с преступностью: армии заменены полициями, безопасность коллективизирована (RSS восточных Карибов), а США остаются внешним гарантом и главным источником оружия и наркотрафика одновременно",
    structuralFactorRu: "Наркокоридор Южная Америка — США проходит через регион: география транзита важнее любых армий",
    conflictLandscapeRu: "Межгосударственных войн нет с 1969 года; банды Гаити и Сальвадора, картели Гватемалы и Гондураса — оперативный уровень насилия выше многих войн",
    externalActorsRu: "США (SOUTHCOM, базы и помощь), Китай и Тайвань (конкуренция за признание карибских микрогосударств)",
    spendingTrendRu: "Расходы — полицейские по сути: катера, вертолёты, тюрьмы; исключение — чрезвычайная модель Сальвадора",
    outlookRu: "Гаити — главный очаг: международная миссия и банды определяют повестку региона",
    keyIso3: ["HTI", "SLV", "GTM", "DOM", "PAN"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Южная Америка",
    scopeRu: "В волне data5 — только Гайана и Суринам; континентальные державы покрыты другими волнами",
    summaryRu: "Гвианское побережье — новый нефтяной фронтир континента: территориальный спор Венесуэлы с Гайаной превратил две малые страны в объект большой нефтяной геополитики",
    structuralFactorRu: "Нефть шельфа: доходы Гайаны растут быстрее, чем её институты и силы обороны",
    conflictLandscapeRu: "Спор об Эссекибо — единственный активный межгосударственный территориальный конфликт континента",
    externalActorsRu: "США (партнёрство и учения), Бразилия (региональный балансир), Китай (инфраструктура Суринама)",
    spendingTrendRu: "Гайана наращивает GDF из нефтяных доходов; Суринам минимален",
    outlookRu: "Риск эскалации вокруг Эссекибо сохраняется при любом исходе венесуэльской политики",
    keyIso3: ["GUY", "SUR"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Западная Африка",
    scopeRu: "В волне data5 — 16 государств: от Ганы и Кот-д’Ивуара до хунт Мали, Буркина-Фасо и Нигера, микрогосударств побережья и островного Сан-Томе",
    summaryRu: "Регион раскололся: прибрежное ядро ЭКОВАС против сахельского Альянса государств Сахеля (AES) с российским Африканским корпусом; джихадистский фронт спускается от Сахеля к Гвинейскому заливу",
    structuralFactorRu: "Демография и бедность Сахеля при слабых государствах: джихадизм растёт быстрее, чем любые армии региона",
    conflictLandscapeRu: "Мали, Буркина-Фасо и Нигер — полноценные войны с JNIM и ИГ-Сахель; Бенин и Того уже получают удары на северных границах",
    externalActorsRu: "Россия (Африканский корпус в AES), Франция (выведена из Сахеля, остаётся в Кот-д’Ивуаре), США (пересмотр присутствия после Нигера)",
    spendingTrendRu: "Хунты наращивают закупки (Турция, Китай, Россия); прибрежные страны инвестируют в северные границы",
    outlookRu: "Главный вопрос 2025–2027 годов — удержит ли прибрежная Западная Африка джихадистскую волну и не распадётся ли ЭКОВАС окончательно",
    keyIso3: ["MLI", "BFA", "NER", "GHA", "CIV"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Восточная Африка",
    scopeRu: "В волне data5 — 11 государств: от Уганды и руандийской военной машины до Сомали, Южного Судана, Мадагаскара и островных микрогосударств",
    summaryRu: "Самый милитаризованный малый регион мира: войны в Сомали и Южном Судане, руандийско-конголезский прокси-конфликт и эритрейско-эфиопский фон при плотном внешнем присутствии (США, Китай, Турция, ОАЭ)",
    structuralFactorRu: "Слабые государства при сильных соседях и армиях-партиях: безопасность приватизирована президентами и этническими сетями",
    conflictLandscapeRu: "Аш-Шабааб в Сомали, гражданская война Южного Судана в тлеющей фазе, восточное Конго как перекрёсток интересов Уганды и Руанды",
    externalActorsRu: "США (АФРИКОМ), Китай (база в Джибути рядом), Турция (подготовка сомалийцев), ОАЭ и Катар (конкуренция портов)",
    spendingTrendRu: "Расходы определяет не бюджет, а доступ к внешним спонсорам и рентам (золото, порты, миротворческие контрибуции ООН)",
    outlookRu: "Ключевые риски — распад сомалийского проекта после переформатирования миссии АС и новая фаза войны в Южном Судане",
    keyIso3: ["SOM", "SSD", "UGA", "RWA", "ERI"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Центральная Африка",
    scopeRu: "В волне data5 — 7 государств: Чад, Камерун, ЦАР, обе Конго, Габон, Экваториальная Гвинея",
    summaryRu: "Нефтяные автократии и неконсолидированные государства вокруг конголезского бассейна: Чад — единственная боеспособная армия, ЦАР — протекторат сменяющихся внешних сил, ДРК — крупнейший конфликт континента",
    structuralFactorRu: "Ресурсная рента при пустых институтах: армии охраняют режимы, а не границы",
    conflictLandscapeRu: "Восточная ДРК (M23), англоязычный кризис Камеруна, повстанцы ЦАР, «Боко Харам» у озера Чад",
    externalActorsRu: "Россия (наследие ЧВК в ЦАР), Франция (уходящее присутствие), Руанда (восточная ДРК), США (поддержка Чада)",
    spendingTrendRu: "Нефтяные бюджеты Габона и Экваториальной Гвинеи не конвертируются в боеспособность; Чад инвестирует в армию как в экспортный товар",
    outlookRu: "Переходные процессы в Габоне и Чаде и война в восточной ДРК — три главные неопределённости региона",
    keyIso3: ["TCD", "COD", "CAF", "CMR", "GAB"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Южная Африка",
    scopeRu: "В волне data5 — Ботсвана, Замбия, Зимбабве, Лесото, Малави, Намибия, Эсватини; региональный гегемон ЮАР покрыт волной warfare3",
    summaryRu: "Самый мирный регион континента: ни одной межгосударственной войны, армии — инструмент внутренней стабильности и миротворческих контрибуций; Ботсвана — образец управления обороной",
    structuralFactorRu: "Относительная институциональная зрелость SADC и отсутствие активных фронтов, кроме мозамбикского Кабу-Делгаду у границ",
    conflictLandscapeRu: "Войн нет; риски — зимбабвийская политическая динамика, лесотские армейские кризисы прошлого и трансграничная преступность",
    externalActorsRu: "Китай (инфраструктура, медь Замбии), США (учения и программы), Великобритания (подготовка Ботсваны)",
    spendingTrendRu: "Стабильные низкие расходы; исключение — перевооружение Ботсваны прошлых лет",
    outlookRu: "Регион останется тылом континента; внимание — выборам и преемственности в Зимбабве и Замбии",
    keyIso3: ["BWA", "ZMB", "ZWE", "NAM"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
  {
    region: "Океания",
    scopeRu: "В волне data5 — 11 тихоокеанских государств: от Папуа — Новой Гвинеи с армией до атоллов без вооружённых сил",
    summaryRu: "Лаборатория безопасности без армий: 8 из 11 стран региона не имеют вооружённых сил, безопасность производится договорами (COFA с США, союз Фалепили, австралийская программа катеров) и стала главным призом соперничества США — Китай",
    structuralFactorRu: "Микроскопическое население при гигантских ИЭЗ: контролировать море важнее, чем держать армию",
    conflictLandscapeRu: "Межгосударственных войн не было; внутренние конфликты — Бугенвиль и племенные войны нагорий Папуа, беспорядки на Соломоновых Островах и в Новой Каледонии (соседний контекст)",
    externalActorsRu: "Австралия (системный донор безопасности), США (COFA и радары), Китай (соглашения с Соломоновыми Островами и Кирибати)",
    spendingTrendRu: "Военные расходы почти нулевые; растут полицейские и морские программы за чужой счёт",
    outlookRu: "Каждое новое соглашение о безопасности в регионе — ход в американо-китайской партии; климатическая повестка Тувалу задаёт новый тип союзных договоров",
    keyIso3: ["PNG", "SLB", "FJI", "KIR", "TUV"],
    provenance: {
      source: "Аналитическая оценка проекта",
      year: 2024,
      estimated: true,
    },
  },
];

/** Аналитический профиль региона по названию; undefined, если региона нет. */
export function regionAnalyticalProfile(
  region: string,
): RegionAnalyticalProfile | undefined {
  return REGION_ANALYTICAL_PROFILES.find((entry) => entry.region === region);
}

// ─────────────────────────────────────────────────────────────────────────────
// Региональные роли стран волны data5
// ─────────────────────────────────────────────────────────────────────────────

/** Роли стран волны data5 в своих регионах (Азия и Европа). */
export const COUNTRY_REGION_ROLES: readonly CountryRegionRole[] = [
  {
    iso3: "AFG",
    region: "Южная Азия",
    roleRu: "Источник регионального риска номер один",
    contributionRu: "Население ~41 млн, перекрёсток маршрутов Центральной и Южной Азии",
    trendRu: "Консолидация режима талибов при росте ТТП и ИГ-Хорасан",
    riskRu: "Экспорт терроризма и наркотрафика во все соседние регионы",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BHR",
    region: "Ближний Восток",
    roleRu: "Платформа американского флота в Заливе",
    contributionRu: "Штаб 5-го флота США и британская база при собственных силах ~12 тыс.",
    trendRu: "Стабильность через саудовско-американский зонтик",
    riskRu: "Иранский фактор и внутреннее шиитское недовольство",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BTN",
    region: "Южная Азия",
    roleRu: "Гималайский буфер Индии",
    contributionRu: "Гидроэнергетика и территория между Индией и Китаем",
    trendRu: "Первые прямые контакты с Пекином о границе",
    riskRu: "Сценарий Доклама на своей территории чужими армиями",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BRN",
    region: "Юго-Восточная Азия",
    roleRu: "Нефтяной султанат-спорщик Южно-Китайского моря",
    contributionRu: "Углеводородная рента и британский гарнизон гуркхов",
    trendRu: "Модернизация патрульных сил при молчаливой дипломатии",
    riskRu: "Китайские притязания на риф Луиза и цены на нефть",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LAO",
    region: "Юго-Восточная Азия",
    roleRu: "Сухопутный коридор Китая к Таиланду",
    contributionRu: "Территория Китайско-лаосской железной дороги и меконгский транзит",
    trendRu: "Рост китайской инфраструктурной зависимости",
    riskRu: "Долговая ловушка и преступные анклавы Золотого треугольника",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MDV",
    region: "Южная Азия",
    roleRu: "Морской приз индийско-китайского соперничества",
    contributionRu: "Атоллы на судоходных путях Индийского океана",
    trendRu: "Маятник внешней политики между Дели и Пекином",
    riskRu: "Смена власти меняет гарнизоны и кредиты страны за один цикл",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TLS",
    region: "Юго-Восточная Азия",
    roleRu: "Младший партнёр Австралии на Тиморе",
    contributionRu: "Газовые поля Тиморского моря и заявка в АСЕАН",
    trendRu: "Истощение нефтяного фонда быстрее развития экономики",
    riskRu: "Фискальный обрыв 2030-х годов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PHI",
    region: "Юго-Восточная Азия",
    roleRu: "Алиас: страна учитывается как PHL в волне data3",
    contributionRu: "В региональные суммы волны data5 не входит во избежание двойного счёта",
    trendRu: "См. профиль PHL",
    riskRu: "См. профиль PHL",
    provenance: { source: "Методологическая пометка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "KGZ",
    region: "Центральная Азия",
    roleRu: "Северный фланг региона и хозяин базы Кант",
    contributionRu: "Вода Нарына и транзит между Казахстаном, Китаем и Ферганой",
    trendRu: "Закупки БПЛА как ответ Душанбе",
    riskRu: "Новая пограничная эскалация с Таджикистаном и политическая турбулентность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TJK",
    region: "Центральная Азия",
    roleRu: "Фронтир ОДКБ на афганской границе",
    contributionRu: "1 357 км границы с Афганистаном и 201-я база России",
    trendRu: "Перевооружение за счёт внешних доноров всех лагерей",
    riskRu: "Афганский прорыв и династическая преемственность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TKM",
    region: "Центральная Азия",
    roleRu: "Закрытый газовый нейтрал Каспия",
    contributionRu: "Четвёртые запасы газа мира и каспийский берег",
    trendRu: "Тройной газовый союз и осторожные закупки у Турции",
    riskRu: "Непрозрачность: регион не видит реальной боеспособности Ашхабада",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ALB",
    region: "Европа",
    roleRu: "Адриатический фланг НАТО",
    contributionRu: "Порты и аэродромы западной оконечности Балкан",
    trendRu: "Первые ударные БПЛА и рост расходов к нормативу НАТО",
    riskRu: "Сербско-косовские обострения по соседству",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "AND",
    region: "Европа",
    roleRu: "Пиренейское микрогосударство без армии",
    contributionRu: "Налоговый и туристический анклав между Францией и Испанией",
    trendRu: "Соглашение об ассоциации с ЕС",
    riskRu: "Только полицейские и климатические риски",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BIH",
    region: "Европа",
    roleRu: "Незавершённый постконфликтный узел Балкан",
    contributionRu: "Единые ВС при двух энтитетах и миссии EUFOR",
    trendRu: "Сецессионистская риторика Республики Сербской",
    riskRu: "Политический распад быстрее военной реформы",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CYP",
    region: "Европа",
    roleRu: "Непотопляемый авианосец Восточного Средиземноморья",
    contributionRu: "Британские суверенные базы и позиция между ЕС, Турцией и Левантом",
    trendRu: "Сближение с США и Израилем, газовые проекты шельфа",
    riskRu: "Замороженный конфликт 1974 года при росте турецкого флота",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ISL",
    region: "Европа",
    roleRu: "Североатлантический наблюдательный пост без армии",
    contributionRu: "География GIUK-прохода и база Кеблавик для ротаций НАТО",
    trendRu: "Возврат интереса союзников к арктическим маршрутам",
    riskRu: "Подводная и воздушная активность России у прохода",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "IRL",
    region: "Европа",
    roleRu: "Нейтральный западный фланг ЕС с символическими силами",
    contributionRu: "Подводные кабели и морская зона, в разы превышающая возможности флота",
    trendRu: "Дебаты о радарах, сонарах и форуме по нейтралитету",
    riskRu: "Инцидент с инфраструктурой у берегов при отсутствии средств обнаружения",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LIE",
    region: "Европа",
    roleRu: "Финансовое микрогосударство в швейцарском зонтике",
    contributionRu: "Банковский центр без армии с 1868 года",
    trendRu: "Статус-кво",
    riskRu: "Отсутствуют военные риски",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LUX",
    region: "Европа",
    roleRu: "Финансово-космический вкладчик НАТО",
    contributionRu: "Спутниковая связь GovSat и доля ВВП вместо массы войск",
    trendRu: "Курс на 2% ВВП через нишевые космические программы",
    riskRu: "Внешних военных рисков нет",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MNE",
    region: "Европа",
    roleRu: "Адриатический член НАТО с микровойсками",
    contributionRu: "Которский залив и полный контроль побережья страны НАТО",
    trendRu: "Политическая фрагментация при стабильном курсе в ЕС",
    riskRu: "Внешнее вмешательство в политику при нулевом военном риске",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MKD",
    region: "Европа",
    roleRu: "Сухопутный коридор центральных Балкан",
    contributionRu: "Перекрёсток коридоров VIII и X между Адриатикой и Эгейским морем",
    trendRu: "Интеграция в НАТО компенсирует малый масштаб армии",
    riskRu: "Албанский вопрос внутренней политики и болгарский спор в ЕС",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SVN",
    region: "Европа",
    roleRu: "Альпийско-адриатический тыл НАТО",
    contributionRu: "Порт Копер и кратчайший путь из Италии в Центральную Европу",
    trendRu: "Закупки бронетехники и ПВО после десятилетия экономии",
    riskRu: "Политические споры о расходах при отсутствии угроз",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CHE",
    region: "Европа",
    roleRu: "Вооружённый нейтрал и финансовый центр Европы",
    contributionRu: "Милиционная армия ~100+ тыс. резерва и банковская система мира",
    trendRu: "F-35 и дебаты о сотрудничестве с НАТО без членства",
    riskRu: "Эрозия нейтралитета под давлением санкционной политики",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MDA",
    region: "Восточная Европа",
    roleRu: "Нейтральный буфер у приднестровского анклава",
    contributionRu: "Территория между Румынией и Украиной, склады в Колбасне по соседству",
    trendRu: "Первые радары и помощь ЕС при росте гибридного давления",
    riskRu: "Дестабилизация через Приднестровье и энергетику",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MCO",
    region: "Европа",
    roleRu: "Средиземноморское микрогосударство под французским зонтиком",
    contributionRu: "Финансы и порт при карабинерах ~100 человек",
    trendRu: "Статус-кво",
    riskRu: "Военных рисков нет",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SMR",
    region: "Европа",
    roleRu: "Итальянский анклав с церемониальными корпусами",
    contributionRu: "Туризм и финансы при армии-символе",
    trendRu: "Статус-кво",
    riskRu: "Военных рисков нет",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MLT",
    region: "Европа",
    roleRu: "Нейтральный страж Сицилийского пролива",
    contributionRu: "Позиция на миграционном и судоходном маршруте центрального Средиземноморья",
    trendRu: "Модернизация патрульной авиации при нейтралитете",
    riskRu: "Миграционные кризисы и контрабанда у ливийских берегов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Роли стран волны data5 (Америки). */
export const COUNTRY_REGION_ROLES_AMERICAS: readonly CountryRegionRole[] = [
  {
    iso3: "ATG",
    region: "Центральная Америка и Карибы",
    roleRu: "Член восточнокарибской системы RSS",
    contributionRu: "Аэропорт и порт на атлантических подходах к Карибам",
    trendRu: "Стабильность при туристической экономике",
    riskRu: "Ураганы и наркотранзит малыми судами",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BHS",
    region: "Центральная Америка и Карибы",
    roleRu: "Морской сосед США и крупнейшие силы обороны Карибов",
    contributionRu: "Архипелаг на маршрутах Флорида — Карибы, RBDF как образец малых сил",
    trendRu: "Модернизация флота при поддержке США",
    riskRu: "Миграция с Гаити и наркотрафик через архипелаг",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BRB",
    region: "Центральная Америка и Карибы",
    roleRu: "Штаб-квартира Региональной системы безопасности (RSS)",
    contributionRu: "Политический вес восточных Карибов при малых силах",
    trendRu: "Республиканская реформа и климатическая дипломатия",
    riskRu: "Ураганы и транзитная преступность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BLZ",
    region: "Центральная Америка и Карибы",
    roleRu: "Единственная англоязычная страна Центральной Америки с территориальным спором",
    contributionRu: "Граница с Гватемалой и британский учебный центр джунглей",
    trendRu: "Ожидание решения МС ООН по спору с Гватемалой",
    riskRu: "Наркотранзит и давление спора",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CRI",
    region: "Центральная Америка и Карибы",
    roleRu: "Эталон демилитаризации региона с 1948 года",
    contributionRu: "Доказательство жизнеспособности модели «полиция вместо армии»",
    trendRu: "Рост нарконасилия ставит модель под вопрос",
    riskRu: "Картелизация портов Тихого океана",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "DMA",
    region: "Центральная Америка и Карибы",
    roleRu: "Микрогосударство RSS без армии",
    contributionRu: "Позиция в цепи Наветренных островов",
    trendRu: "Климатическая устойчивость после урагана «Мария»",
    riskRu: "Стихия и транзит",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "DOM",
    region: "Центральная Америка и Карибы",
    roleRu: "Крупнейшая армия Карибов и тыл гаитянского кризиса",
    contributionRu: "Граница с Гаити и туристическая экономика региона",
    trendRu: "Стена и депортации как ответ на распад Гаити",
    riskRu: "Перенос гаитянского кризиса через границу",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SLV",
    region: "Центральная Америка и Карибы",
    roleRu: "Лаборатория чрезвычайной антибандитской модели",
    contributionRu: "CECOT и самый резкий спад убийств в регионе как экспортный кейс",
    trendRu: "Милитаризация внутренней безопасности при популярности модели",
    riskRu: "Устойчивость модели после чрезвычайного положения",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GRD",
    region: "Центральная Америка и Карибы",
    roleRu: "Исторический кейс интервенции США 1983 года",
    contributionRu: "Южные ворота Наветренных островов",
    trendRu: "Стабильность в рамках RSS",
    riskRu: "Ураганы (Иван, Берил) как системный фактор",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GTM",
    region: "Центральная Америка и Карибы",
    roleRu: "Крупнейшее государство северного треугольника",
    contributionRu: "Население ~18 млн и главная сухопутная ось региона",
    trendRu: "Борьба институтов с наркосетями и коррупцией",
    riskRu: "Институциональная хрупкость сильнее внешних угроз",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "HTI",
    region: "Центральная Америка и Карибы",
    roleRu: "Главный очаг нестабильности полушария",
    contributionRu: "Отрицательный вклад: распад государства как региональный риск-экспортёр",
    trendRu: "Международная миссия MSS против коалиции банд",
    riskRu: "Полная гангстеризация столицы и миграционный взрыв",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "HND",
    region: "Центральная Америка и Карибы",
    roleRu: "Центральное звено северного треугольника",
    contributionRu: "База Сото-Кано (США) и коридор миграции",
    trendRu: "Чрезвычайные меры против эксторсии банд",
    riskRu: "Миграционно-наркотический комплекс",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "NIC",
    region: "Центральная Америка и Карибы",
    roleRu: "Авторитарный фланг региона с российским вектором",
    contributionRu: "Крупнейшая территория Центральной Америки и канал-проект в анамнезе",
    trendRu: "Консолидация режима при западной изоляции",
    riskRu: "Политический кризис по образцу 2018 года",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PAN",
    region: "Центральная Америка и Карибы",
    roleRu: "Страж Панамского канала без армии",
    contributionRu: "Канал как глобальная инфраструктура под полицейской охраной",
    trendRu: "Давление США по китайскому присутствию в портах",
    riskRu: "Дарьенский миграционный поток и споры вокруг канала",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "JAM",
    region: "Центральная Америка и Карибы",
    roleRu: "Крупнейшие англоязычные силы Карибов",
    contributionRu: "JDF как региональный донор подготовки и реагирования",
    trendRu: "Зоны чрезвычайных мер против банд",
    riskRu: "Оружейный поток из США и ганг-культура",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "KNA",
    region: "Центральная Америка и Карибы",
    roleRu: "Самое малое государство полушария, член RSS",
    contributionRu: "Символический вклад в коллективную безопасность востока Карибов",
    trendRu: "Стабильность микрогосударства",
    riskRu: "Преступность выше региональной нормы на душу населения",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LCA",
    region: "Центральная Америка и Карибы",
    roleRu: "Член RSS со своей полицейской авиацией региона",
    contributionRu: "Туристический узел Наветренных островов",
    trendRu: "Стабильность",
    riskRu: "Ганг-насилие в Кастри",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "VCT",
    region: "Центральная Америка и Карибы",
    roleRu: "Член RSS, узел транзитных маршрутов",
    contributionRu: "Цепь Гренадин на наркомаршруте к северу",
    trendRu: "Восстановление после извержения Ла-Суфриер",
    riskRu: "Стихия и транзит",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TTO",
    region: "Центральная Америка и Карибы",
    roleRu: "Энергетический юг Карибов у берегов Венесуэлы",
    contributionRu: "Газ и сильнейшие силы обороны южных Карибов",
    trendRu: "Чрезвычайное положение против банд 2024–2025 годов",
    riskRu: "Венесуэльский нарко- и миграционный поток через пролив",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GUY",
    region: "Южная Америка",
    roleRu: "Нефтяной фронтир континента и объект спора с Венесуэлой",
    contributionRu: "Крупнейшие новые запасы нефти на душу населения в мире",
    trendRu: "Ускоренное строительство GDF на нефтяные доходы",
    riskRu: "Венесуэльская эскалация вокруг Эссекибо",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SUR",
    region: "Южная Америка",
    roleRu: "Второй нефтяной претендент гвианского шельфа",
    contributionRu: "Блок 58 и голландско-карибские связи",
    trendRu: "Ожидание первого нефтяного бума к 2028 году",
    riskRu: "Транзит наркотиков прочнее институтов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "XKX",
    region: "Европа",
    roleRu: "Частично признанный протекторат с лёгкой армией",
    contributionRu: "Ключевой узел сербско-албанского урегулирования Балкан",
    trendRu: "Трансформация KSF в армию при спорах о севере",
    riskRu: "Инцидент на севере быстрее дипломатии Белград — Приштина",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PSE",
    region: "Ближний Восток",
    roleRu: "Негосударственный актор левантийского конфликта",
    contributionRu: "Силы безопасности ПА и вооружённые группировки Газы как два разных военных факта",
    trendRu: "Война в Газе переформатировала весь профиль",
    riskRu: "Любая оценка устаревает за недели боевых действий",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Роли стран волны data5 (Африка). */
export const COUNTRY_REGION_ROLES_AFRICA: readonly CountryRegionRole[] = [
  {
    iso3: "BEN",
    region: "Западная Африка",
    roleRu: "Прибрежный рубеж против сахельского джихадизма",
    contributionRu: "Парк Пенджари и северная граница как линия фронта",
    trendRu: "Наращивание северной группировки при поддержке партнёров",
    riskRu: "Проникновение JNIM через парки W и Пенджари",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BFA",
    region: "Западная Африка",
    roleRu: "Эпицентр войны AES против JNIM",
    contributionRu: "Отрицательный вклад: крупнейший театр джихадизма мира по жертвам",
    trendRu: "Мирные переговоры невозможны, ставка на мобилизацию и Россию",
    riskRu: "Потеря контроля над провинциями вне столичного кольца",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BDI",
    region: "Восточная Африка",
    roleRu: "Экспортёр войск в региональные миссии",
    contributionRu: "Контингенты в Сомали и ЦАР при внутренней бедности",
    trendRu: "Напряжённость с Руандой по восточной ДРК",
    riskRu: "Прокси-столкновение с Кигали",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CPV",
    region: "Западная Африка",
    roleRu: "Атлантический островной страж западноафриканских маршрутов",
    contributionRu: "Позиция на кокаиновом маршруте и португальские связи",
    trendRu: "Морская модернизация при поддержке ЕС",
    riskRu: "Наркотранзит сильнее береговой охраны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CMR",
    region: "Центральная Африка",
    roleRu: "Двуфронтовое государство: «Боко Харам» и англоязычный сепаратизм",
    contributionRu: "Вторая экономика CEMAC и якорь залива Гвинея с востока",
    trendRu: "Преемственность власти как главный вопрос десятилетия",
    riskRu: "Два тлеющих конфликта при старении режима",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CAF",
    region: "Центральная Африка",
    roleRu: "Протекторат сменяющихся внешних гарантов",
    contributionRu: "Отрицательный пример: безопасность как импортируемая услуга",
    trendRu: "Переформатирование российского присутствия после 2023 года",
    riskRu: "Периферия вне контроля столицы при любом гаранте",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TCD",
    region: "Центральная Африка",
    roleRu: "Главная боеспособная армия региона и экспортёр стабильности",
    contributionRu: "Силы в Сахеле, у Судана и озера Чад как региональный товар",
    trendRu: "Династический переход при суданской войне на границе",
    riskRu: "Раскол армии по клановым линиям",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "COM",
    region: "Восточная Африка",
    roleRu: "Островное микрогосударство Мозамбикского пролива",
    contributionRu: "Позиция на маршрутах пролива при символических силах",
    trendRu: "Хроническая переворотность как фон",
    riskRu: "Майоттский спор и институциональная пустота",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "COG",
    region: "Центральная Африка",
    roleRu: "Нефтяная республика со стабильным режимом",
    contributionRu: "Порт Пуэнт-Нуар и нефть CEMAC",
    trendRu: "Статус-кво при долговой нагрузке",
    riskRu: "Преемственность и цены на нефть",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "COD",
    region: "Центральная Африка",
    roleRu: "Крупнейший конфликт и кладовая критических минералов континента",
    contributionRu: "Кобальт и колтан мирового рынка при войне на востоке",
    trendRu: "Эскалация вокруг M23 и руандийский фактор",
    riskRu: "Распад контроля над востоком при богатстве недр",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CIV",
    region: "Западная Африка",
    roleRu: "Экономический локомотив франкоязычной Западной Африки",
    contributionRu: "Порт Абиджана и крупнейший ВВП WAEMU",
    trendRu: "Северная граница против джихадизма при росте экономики",
    riskRu: "Выборные циклы и северный фронт",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "DJI",
    region: "Восточная Африка",
    roleRu: "Мировая столица иностранных баз",
    contributionRu: "Баб-эль-Мандеб и порты: безопасность как сдача географии в аренду",
    trendRu: "Кризис Красного моря повысил цену аренды",
    riskRu: "Долг Китаю и конкуренция баз на малой территории",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ERI",
    region: "Восточная Африка",
    roleRu: "Закрытый милитаризованный анклав Красного моря",
    contributionRu: "Побережье и армия неизвестной реальной численности",
    trendRu: "Вмешательства в Эфиопию и Судан как способ выживания режима",
    riskRu: "Непрозрачность делает любой региональный расчёт условным",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SWZ",
    region: "Южная Африка",
    roleRu: "Абсолютная монархия внутри южноафриканского пространства",
    contributionRu: "Транзит между ЮАР и Мозамбиком",
    trendRu: "Постпротестная консолидация монархии",
    riskRu: "Социальный взрыв по образцу 2021 года",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GAB",
    region: "Центральная Африка",
    roleRu: "Нефтяной член ОПЕК в переходном периоде",
    contributionRu: "Нефть и лес при малой армии",
    trendRu: "Постпереворотные выборы и ревизия французских связей",
    riskRu: "Неопределённость перехода",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GMB",
    region: "Западная Африка",
    roleRu: "Речной анклав Сенегала с историей переворотов",
    contributionRu: "Позиция на атлантическом побережье при силах ~2–4 тыс.",
    trendRu: "Миссия ЭКОВАС как кокон переходного периода",
    riskRu: "Армейская политика при слабых институтах",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GHA",
    region: "Западная Африка",
    roleRu: "Демократический якорь побережья и миротворческий донор",
    contributionRu: "Стабильность и армия-образец как региональный актив",
    trendRu: "Северная граница и золотой бум при фискальном кризисе",
    riskRu: "Экономика, а не война: долг давит на оборону",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GIN",
    region: "Западная Африка",
    roleRu: "Бокситовая хунта в переходном периоде",
    contributionRu: "Половина мировых запасов бокситов и железный Симанду",
    trendRu: "Китайский спрос как опора режима",
    riskRu: "Затяжной переход и уличные взрывы",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GNB",
    region: "Западная Африка",
    roleRu: "Классическое наркогосударство риска",
    contributionRu: "Отрицательный вклад: архипелаг Бижагош как перевалка кокаина",
    trendRu: "Переворотные циклы короче выборных",
    riskRu: "Слияние наркосетей и армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LBR",
    region: "Западная Африка",
    roleRu: "Постконфликтная модель разоружения армии",
    contributionRu: "Доказательство: армию можно построить заново под внешним контролем",
    trendRu: "Стабильные выборы при символических силах",
    riskRu: "Бедность и регистровый флот как серые зоны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LSO",
    region: "Южная Африка",
    roleRu: "Горный анклав ЮАР с переворотной историей армии",
    contributionRu: "Вода высокогорий для ЮАР",
    trendRu: "Реформа сектора безопасности под давлением SADC",
    riskRu: "Армия как политический игрок",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MDG",
    region: "Восточная Африка",
    roleRu: "Островной гигант вне континентальных альянсов",
    contributionRu: "Никель, ваниль и позиция в Мозамбикском проливе",
    trendRu: "Сельская небезопасность растёт быстрее армии",
    riskRu: "Дахало и бедность как системный фон",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MWI",
    region: "Южная Африка",
    roleRu: "Миротворческий вкладчик без внешних врагов",
    contributionRu: "Контингенты в ДРК при аграрной экономике",
    trendRu: "Климатические шоки как главный вызов",
    riskRu: "Циклоны и продовольственная безопасность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MLI",
    region: "Западная Африка",
    roleRu: "Исходная точка сахельского распада 2012 года",
    contributionRu: "Отрицательный вклад: война, экспортирующая беженцев и джихадизм",
    trendRu: "Ставка AES на Россию и выход из ЭКОВАС",
    riskRu: "Туарегский север и осада городов JNIM",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MRT",
    region: "Западная Африка",
    roleRu: "Относительно успешный антиджихадистский кейс Сахеля",
    contributionRu: "Газ Торту и граница с Мали как урок сдерживания",
    trendRu: "Газовые доходы при сохранении военной модели",
    riskRu: "Малийский фронт и рабство как социальный фон",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MUS",
    region: "Восточная Африка",
    roleRu: "Островной финансовый центр без армии",
    contributionRu: "Морская полиция и дипломатия малых островных государств",
    trendRu: "Спор о Чагосе разрешён в пользу Маврикия (2024–2025)",
    riskRu: "Наркотранзит и морская преступность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "NAM",
    region: "Южная Африка",
    roleRu: "Стабильный западный фланг региона",
    contributionRu: "Уран, порт Уолфиш-Бей и нефтяные надежды шельфа",
    trendRu: "Нефтяной интерес при стабильных институтах",
    riskRu: "Засуха и безработица молодёжи",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "NER",
    region: "Западная Африка",
    roleRu: "Перекрёсток Сахеля, потерянный Западом за один переворот",
    contributionRu: "Уран и миграционный маршрут к Ливии",
    trendRu: "Разворот к России и конфронтация с ЭКОВАС",
    riskRu: "Два джихадистских фронта при изоляции",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "RWA",
    region: "Восточная Африка",
    roleRu: "Самая эффективная военная машина малых стран Африки",
    contributionRu: "Экспорт безопасности: Мозамбик, ЦАР, миротворчество ООН",
    trendRu: "Прокси-давление на ДРК через M23",
    riskRu: "Санкционный и репутационный ответ на восточную ДРК",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SEN",
    region: "Западная Африка",
    roleRu: "Демократический западный якорь и новый нефтегазовый игрок",
    contributionRu: "Армия без переворотов и порт Дакара",
    trendRu: "Нефть и газ при смене поколения власти",
    riskRu: "Казаманс и фискальные ожидания от ренты",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SYC",
    region: "Восточная Африка",
    roleRu: "Антипиратский ветеран западной части Индийского океана",
    contributionRu: "Опыт 2009–2012 годов и позиция на судоходных путях",
    trendRu: "Наркотрафик заменил пиратство как главный морской риск",
    riskRu: "Героиновый маршрут в ИЭЗ",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SLE",
    region: "Западная Африка",
    roleRu: "Постконфликтная армия под британским менторством",
    contributionRu: "Миротворческие контингенты при хрупкой политике",
    trendRu: "Попытка переворота 2023 года как предупреждение",
    riskRu: "Политизация армии в выборных кризисах",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SOM",
    region: "Восточная Африка",
    roleRu: "Главный незавершённый проект государственного строительства Африки",
    contributionRu: "Длиннейшее побережье континента и контроль над подходами к Баб-эль-Мандебу",
    trendRu: "Переформатирование миссии АС и турецкая ставка",
    riskRu: "Аш-Шабааб как квазигосударство с налогами",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SSD",
    region: "Восточная Африка",
    roleRu: "Нефтяное государство в тлеющей гражданской войне",
    contributionRu: "Отрицательный вклад: война 2013–2018 годов задала паттерн региона",
    trendRu: "Эрозия мирного соглашения и столкновения 2025 года",
    riskRu: "Возврат к полномасштабной войне Киир — Машар",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TGO",
    region: "Западная Африка",
    roleRu: "Портовый хаб и новый северный рубеж джихадизма",
    contributionRu: "Порт Ломе для стран Сахеля без выхода к морю",
    trendRu: "Династическая реформа конституции и атаки на севере",
    riskRu: "Сахельский фронт достиг границ Того",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "UGA",
    region: "Восточная Африка",
    roleRu: "Военный предприниматель Великих озёр",
    contributionRu: "Контингенты в Сомали и операции в ДРК при армии ~50 тыс.",
    trendRu: "Династический горизонт и ADF на западе",
    riskRu: "Восточная ДРК как постоянный фронт",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BWA",
    region: "Южная Африка",
    roleRu: "Образец оборонного управления континента",
    contributionRu: "Алмазная рента, конвертированная в профессиональные силы",
    trendRu: "Смена правящей партии впервые за 58 лет (2024)",
    riskRu: "Алмазный рынок, а не война",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GNQ",
    region: "Центральная Африка",
    roleRu: "Нефтяной сейф самой закрытой автократии побережья",
    contributionRu: "Нефть острова Биоко при нулевой прозрачности",
    trendRu: "Падение добычи при закрытости данных",
    riskRu: "Непрозрачность: регион не знает ни бюджета, ни армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "STP",
    region: "Западная Африка",
    roleRu: "Островное микрогосударство Гвинейского залива (член CEEAC при западноафриканской региональной привязке проекта)",
    contributionRu: "Позиция на морских путях залива при полицейских силах",
    trendRu: "Нефтяные ожидания и португальские связи",
    riskRu: "Пиратство залива при символических силах",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ZMB",
    region: "Южная Африка",
    roleRu: "Медный транзитный узел юга континента",
    contributionRu: "Медь и коридоры Лобиту и к Дурбану",
    trendRu: "Американско-китайская конкуренция за коридоры",
    riskRu: "Долг и засуха бьют сильнее военных факторов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ZWE",
    region: "Южная Африка",
    roleRu: "Армия-арбитр внутренней политики региона",
    contributionRu: "Прецедент 2017 года: военный переход власти без войны",
    trendRu: "Санкционная изоляция при военных связях с Китаем",
    riskRu: "Преемственность и экономический распад",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Роли стран волны data5 (Океания). */
export const COUNTRY_REGION_ROLES_OCEANIA: readonly CountryRegionRole[] = [
  {
    iso3: "FJI",
    region: "Океания",
    roleRu: "Военный центр тяжести тихоокеанских островов",
    contributionRu: "Единственная значимая армия региона и миротворческий экспорт",
    trendRu: "Австралийское партнёрство против китайского интереса",
    riskRu: "Армия как политический игрок внутренней политики",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PNG",
    region: "Океания",
    roleRu: "Крупнейшее государство региона и ресурсный гигант Меланезии",
    contributionRu: "Население ~10 млн, газ и золото при слабом контроле нагорий",
    trendRu: "Оборонные соглашения с Австралией и интерес Китая",
    riskRu: "Племенные войны нагорий масштабом превзошли возможности PNGDF",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "KIR",
    region: "Океания",
    roleRu: "Передний край китайского продвижения в центральную Полинезию",
    contributionRu: "Гигантская ИЭЗ и аэродром Кантон времён Второй мировой",
    trendRu: "Полицейское сотрудничество с Китаем после разрыва с Тайванем",
    riskRu: "Климат и внешняя конкуренция при полицейских силах ~200 человек",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MHL",
    region: "Океания",
    roleRu: "Хозяин американского полигона Кваджалейн",
    contributionRu: "ПРО-инфраструктура США как основа договора COFA",
    trendRu: "Обновлённый COFA и компенсации ядерного наследия",
    riskRu: "Ядерное наследие Бикини и Эниветока как вечный политический фактор",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "FSM",
    region: "Океания",
    roleRu: "Рассеянная федерация под американской обороной",
    contributionRu: "ИЭЗ 2,6 млн км² между Гавайями и Гуамом",
    trendRu: "Обновление COFA при китайском интересе к Чууку",
    riskRu: "Сепаратизм Чуука и китайская инфраструктура",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PLW",
    region: "Океания",
    roleRu: "Американский радарный форпост Филиппинского моря",
    contributionRu: "TACMOR и позиция у второй цепи островов",
    trendRu: "Милитаризация сенсоров без собственной армии",
    riskRu: "Китайское давление из-за признания Тайваня",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "WSM",
    region: "Океания",
    roleRu: "Тихий тыл Полинезии под новозеландским договором",
    contributionRu: "Стабильность как региональный актив",
    trendRu: "Наркотранзит тихоокеанского маршрута",
    riskRu: "Климат и транзитная преступность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SLB",
    region: "Океания",
    roleRu: "Главный приз американо-китайского соперничества в регионе",
    contributionRu: "Соглашение с Китаем 2022 года как прецедент для всего Тихого океана",
    trendRu: "Конкурентное строительство полицейской инфраструктуры двумя державами",
    riskRu: "Внутренние беспорядки быстрее внешних гарантий",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TON",
    region: "Океания",
    roleRu: "Монархия с церемониально-спасательной армией",
    contributionRu: "HMAF как символ государственности и спасательная служба",
    trendRu: "Климатические ЧС как основная повестка",
    riskRu: "Стихия масштаба извержения 2022 года",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TUV",
    region: "Океания",
    roleRu: "Символ климатической безопасности и договора Фалепили",
    contributionRu: "Прецедент: международно-правовое оформление эвакуации государства",
    trendRu: "Цифровое государство как план сохранения нации",
    riskRu: "Физическое затопление атоллов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "VUT",
    region: "Океания",
    roleRu: "Меланезийский архипелаг с полицейской армией VMF",
    contributionRu: "Позиция между Соломоновыми Островами и Новой Каледонией",
    trendRu: "Французский кризис Новой Каледонии как соседний фон",
    riskRu: "Циклоны как регулярная катастрофа",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Все региональные роли волны data5 одним списком. */
export const ALL_COUNTRY_REGION_ROLES: readonly CountryRegionRole[] = [
  ...COUNTRY_REGION_ROLES,
  ...COUNTRY_REGION_ROLES_AMERICAS,
  ...COUNTRY_REGION_ROLES_AFRICA,
  ...COUNTRY_REGION_ROLES_OCEANIA,
];

/** Роль страны по коду ISO3; undefined, если записи нет. */
export function countryRegionRole(iso3: string): CountryRegionRole | undefined {
  return ALL_COUNTRY_REGION_ROLES.find((entry) => entry.iso3 === iso3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Внешние военные присутствия, значимые для стран волны data5
// ─────────────────────────────────────────────────────────────────────────────

/** Реестр внешних присутствий: базы, миссии, гарнизоны, радары, инструкторы. */
export const EXTERNAL_PRESENCES: readonly ExternalPresenceEntry[] = [
  {
    holder: "США",
    hostRu: "Бахрейн",
    hostIso3: "BHR",
    formatRu: "Штаб и база 5-го флота ВМС США (NSA Bahrain)",
    scaleRu: "Тысячи военнослужащих, командование военно-морских операций в Заливе",
    significanceRu: "Основа безопасности королевства; собственные силы Бахрейна вторичны",
    provenance: { source: "ВМС США; IISS", year: 2024, estimated: false },
  },
  {
    holder: "Великобритания",
    hostRu: "Бахрейн",
    hostIso3: "BHR",
    formatRu: "Военно-морская база HMS Jufair (с 2018 года)",
    scaleRu: "Постоянное присутствие кораблей и штаба UKMCC",
    significanceRu: "Второй западный зонтик королевства",
    provenance: { source: "Королевский флот Великобритании", year: 2024, estimated: false },
  },
  {
    holder: "Великобритания",
    hostRu: "Бруней",
    hostIso3: "BRN",
    formatRu: "Гарнизон гуркхов и учебный центр джунглей",
    scaleRu: "Батальон гуркхов, оплачиваемый султанатом",
    significanceRu: "Сухопутное ядро обороны Брунея при его морской милитаризации",
    provenance: { source: "Минобороны Великобритании", year: 2024, estimated: false },
  },
  {
    holder: "Россия",
    hostRu: "Таджикистан",
    hostIso3: "TJK",
    formatRu: "201-я военная база (Душанбе, Бохтар)",
    scaleRu: "Крупнейшая зарубежная сухопутная база России, несколько тысяч военнослужащих",
    significanceRu: "Главный гарант афганской границы и режима",
    provenance: { source: "IISS Military Balance 2024", year: 2024, estimated: true },
  },
  {
    holder: "Россия",
    hostRu: "Кыргызстан",
    hostIso3: "KGZ",
    formatRu: "Авиабаза Кант (ОДКБ)",
    scaleRu: "Штурмовая авиация и ПВО объединённой базы",
    significanceRu: "Символ российского присутствия при растущей конкуренции поставщиков",
    provenance: { source: "IISS Military Balance 2024", year: 2024, estimated: false },
  },
  {
    holder: "Китай",
    hostRu: "Таджикистан",
    hostIso3: "TJK",
    formatRu: "Объект пограничного контроля в Горном Бадахшане (Мургаб)",
    scaleRu: "Сотни сотрудников по открытым оценкам, статус не публикуется",
    significanceRu: "Единственное известное китайское присутствие в Центральной Азии",
    provenance: { source: "Открытые аналитические оценки", year: 2024, estimated: true },
  },
  {
    holder: "Индия",
    hostRu: "Бутан",
    hostIso3: "BTN",
    formatRu: "Военная тренировочная команда IMTRAT",
    scaleRu: "Постоянная учебная миссия, готовящая королевскую армию",
    significanceRu: "Канал индийского влияния и раннего предупреждения о Китае",
    provenance: { source: "Правительство Индии", year: 2024, estimated: false },
  },
  {
    holder: "США",
    hostRu: "Исландия",
    hostIso3: "ISL",
    formatRu: "Ротационное использование базы Кеблавик (морская патрульная авиация)",
    scaleRu: "Эпизодические развёртывания P-8 и истребителей воздушной полиции НАТО",
    significanceRu: "Заменяет Исландии собственную армию в рамках НАТО",
    provenance: { source: "НАТО; ВВС Исландии (береговая охрана)", year: 2024, estimated: false },
  },
  {
    holder: "Великобритания",
    hostRu: "Кипр",
    hostIso3: "CYP",
    formatRu: "Суверенные базовые территории Акротири и Декелия",
    scaleRu: "ВВС и радиоэлектронная разведка, тысячи военнослужащих",
    significanceRu: "Кипр — платформа британской и союзной разведки по Леванту",
    provenance: { source: "Минобороны Великобритании", year: 2024, estimated: false },
  },
  {
    holder: "Турция",
    hostRu: "Северный Кипр (турецкая зона)",
    hostIso3: "CYP",
    formatRu: "Контингент турецких войск на севере острова",
    scaleRu: "Оценочно десятки тысяч военнослужащих с 1974 года",
    significanceRu: "Военная основа замороженного конфликта",
    provenance: { source: "IISS Military Balance 2024", year: 2024, estimated: true },
  },
  {
    holder: "ЕС",
    hostRu: "Босния и Герцеговина",
    hostIso3: "BIH",
    formatRu: "Миссия EUFOR Althea",
    scaleRu: "Около тысячи военнослужащих с резервом усиления",
    significanceRu: "Внешний стабилизатор Дейтонской системы",
    provenance: { source: "EUFOR", year: 2024, estimated: false },
  },
  {
    holder: "НАТО",
    hostRu: "Косово",
    hostIso3: "XKX",
    formatRu: "Миссия KFOR",
    scaleRu: "Несколько тысяч военнослужащих, усилена после 2023 года",
    significanceRu: "Фактический гарант безопасности территории",
    provenance: { source: "НАТО", year: 2024, estimated: false },
  },
  {
    holder: "Россия",
    hostRu: "Молдова (Приднестровье)",
    hostIso3: "MDA",
    formatRu: "Оперативная группа российских войск и охрана складов в Колбасне",
    scaleRu: "Около 1,5 тыс. военнослужащих, крупнейший советский склад боеприпасов Европы рядом",
    significanceRu: "Главный внешний военный фактор Молдовы при её нейтралитете",
    provenance: { source: "IISS Military Balance 2024", year: 2024, estimated: true },
  },
  {
    holder: "США",
    hostRu: "Гондурас",
    hostIso3: "HND",
    formatRu: "Авиабаза Сото-Кано (Joint Task Force Bravo)",
    scaleRu: "Несколько сотен военнослужащих, вертолётная и логистическая поддержка региона",
    significanceRu: "Единственная постоянная база США в Центральной Америке",
    provenance: { source: "SOUTHCOM", year: 2024, estimated: false },
  },
  {
    holder: "Кения и партнёры (мандат ООН)",
    hostRu: "Гаити",
    hostIso3: "HTI",
    formatRu: "Многонациональная миссия поддержки безопасности (MSS)",
    scaleRu: "Кенийское ядро, контингенты карибских стран, финансирование США",
    significanceRu: "Единственная внешняя сила против банд Порт-о-Пренса",
    provenance: { source: "Совет Безопасности ООН, резолюция 2699", year: 2024, estimated: false },
  },
  {
    holder: "Великобритания",
    hostRu: "Белиз",
    hostIso3: "BLZ",
    formatRu: "Учебное подразделение BATSUB (подготовка к войне в джунглях)",
    scaleRu: "Небольшой постоянный штаб и ротационные курсы британской армии",
    significanceRu: "Сдерживающий символ при споре с Гватемалой",
    provenance: { source: "Минобороны Великобритании", year: 2024, estimated: false },
  },
  {
    holder: "Россия (Африканский корпус)",
    hostRu: "Мали",
    hostIso3: "MLI",
    formatRu: "Контингент Африканского корпуса Минобороны России",
    scaleRu: "Инструкторы, операторы БПЛА и охрана объектов с 2021 года (наследие ЧВК)",
    significanceRu: "Замена Франции и ООН как внешнего гаранта хунты",
    provenance: { source: "IISS; открытые источники", year: 2024, estimated: true },
  },
  {
    holder: "Россия (Африканский корпус)",
    hostRu: "Буркина-Фасо",
    hostIso3: "BFA",
    formatRu: "Инструкторы и поставки вооружений",
    scaleRu: "Присутствие с 2023–2024 годов, точный масштаб не публикуется",
    significanceRu: "Опора режима Траоре в войне с JNIM",
    provenance: { source: "Открытые аналитические оценки", year: 2024, estimated: true },
  },
  {
    holder: "Россия (Африканский корпус)",
    hostRu: "Нигер",
    hostIso3: "NER",
    formatRu: "Инструкторы и техника ПВО (с 2024 года)",
    scaleRu: "Развёрнуты на объектах, оставленных США (Агадес)",
    significanceRu: "Символ разворота Сахеля от Запада к России",
    provenance: { source: "Открытые аналитические оценки", year: 2024, estimated: true },
  },
  {
    holder: "Россия",
    hostRu: "Центральноафриканская Республика",
    hostIso3: "CAF",
    formatRu: "Инструкторы и наследие ЧВК (переформатируется в Африканский корпус)",
    scaleRu: "Охрана президента, алмазных и золотых объектов",
    significanceRu: "Фактический гарант режима Туадера",
    provenance: { source: "IISS; открытые источники", year: 2024, estimated: true },
  },
  {
    holder: "Франция",
    hostRu: "Кот-д’Ивуар",
    hostIso3: "CIV",
    formatRu: "Французские силы в Кот-д’Ивуаре (Порт-Буэ)",
    scaleRu: "Сотни военнослужащих после сокращения африканского присутствия Франции",
    significanceRu: "Последний крупный французский опорный пункт Западной Африки",
    provenance: { source: "Минобороны Франции", year: 2024, estimated: false },
  },
  {
    holder: "ЭКОВАС",
    hostRu: "Гамбия",
    hostIso3: "GMB",
    formatRu: "Миссия ECOMIG",
    scaleRu: "Сенегальско-нигерийское ядро, несколько сотен военнослужащих",
    significanceRu: "Гарант постпереходной стабильности с 2017 года",
    provenance: { source: "ЭКОВАС", year: 2024, estimated: false },
  },
  {
    holder: "США",
    hostRu: "Джибути",
    hostIso3: "DJI",
    formatRu: "База Кэмп-Лемонье",
    scaleRu: "Около 4 тыс. военнослужащих, узел операций АФРИКОМ",
    significanceRu: "Крупнейший арендатор джибутийской географии",
    provenance: { source: "АФРИКОМ", year: 2024, estimated: false },
  },
  {
    holder: "Китай",
    hostRu: "Джибути",
    hostIso3: "DJI",
    formatRu: "База обеспечения НОАК (с 2017 года)",
    scaleRu: "Первая зарубежная база Китая, пирс для крупных кораблей",
    significanceRu: "Эталонная точка китайской военно-морской экспансии",
    provenance: { source: "IISS Military Balance 2024", year: 2024, estimated: false },
  },
  {
    holder: "Франция, Япония, Италия, Испания",
    hostRu: "Джибути",
    hostIso3: "DJI",
    formatRu: "Национальные контингенты и базы",
    scaleRu: "Французский контингент — крупнейшая база Франции в Африке; Япония — единственная зарубежная база ССО",
    significanceRu: "Джибути продаёт одну географию всем лагерям одновременно",
    provenance: { source: "IISS Military Balance 2024", year: 2024, estimated: false },
  },
  {
    holder: "Турция",
    hostRu: "Сомали",
    hostIso3: "SOM",
    formatRu: "Учебная база TURKSOM в Могадишо",
    scaleRu: "Крупнейшая зарубежная учебная база Турции; подготовлены тысячи сомалийских военных",
    significanceRu: "Скелет новой сомалийской армии строится Анкарой",
    provenance: { source: "Минобороны Турции", year: 2024, estimated: false },
  },
  {
    holder: "Африканский союз",
    hostRu: "Сомали",
    hostIso3: "SOM",
    formatRu: "Миссии ATMIS, с 2025 года — AUSSOM",
    scaleRu: "Десятки тысяч военнослужащих стран региона в пике, сокращение к передаче функций сомалийцам",
    significanceRu: "Главный военный актор страны полтора десятилетия",
    provenance: { source: "Африканский союз", year: 2024, estimated: false },
  },
  {
    holder: "Руанда",
    hostRu: "Мозамбик (соседний театр) и ЦАР",
    hostIso3: "CAF",
    formatRu: "Двусторонние контингенты по соглашениям",
    scaleRu: "Тысячи военнослужащих в Кабу-Делгаду и охрана Банги",
    significanceRu: "Руанда — экспортёр безопасности континентального масштаба",
    provenance: { source: "IISS; открытые источники", year: 2024, estimated: true },
  },
  {
    holder: "США",
    hostRu: "Палау",
    hostIso3: "PLW",
    formatRu: "Загоризонтная РЛС TACMOR (строительство)",
    scaleRu: "Сенсор ВВС США без постоянного гарнизона",
    significanceRu: "Превращает безоружную Палау в элемент американской ПРО и наблюдения",
    provenance: { source: "ВВС США", year: 2024, estimated: false },
  },
  {
    holder: "США",
    hostRu: "Маршалловы Острова",
    hostIso3: "MHL",
    formatRu: "Полигон ПРО на атолле Кваджалейн (RTS)",
    scaleRu: "Постоянный американский гарнизон и испытательная инфраструктура",
    significanceRu: "Основа договора COFA и американского присутствия в центральной Полинезии",
    provenance: { source: "Армия США", year: 2024, estimated: false },
  },
  {
    holder: "Китай",
    hostRu: "Соломоновы Острова",
    hostIso3: "SLB",
    formatRu: "Полицейские инструкторы и поставки по соглашению 2022 года",
    scaleRu: "Учебное присутствие без формальной базы",
    significanceRu: "Прецедент китайского безопасностного присутствия в Тихом океане",
    provenance: { source: "Открытые аналитические оценки", year: 2024, estimated: true },
  },
  {
    holder: "Австралия",
    hostRu: "Папуа — Новая Гвинея",
    hostIso3: "PNG",
    formatRu: "Оборонное сотрудничество и совместное использование объектов (Ломбрум — с США)",
    scaleRu: "Инструкторы, программы подготовки, модернизация базы Ломбрум",
    significanceRu: "Канберра страхует северный подход к континенту через Порт-Морсби",
    provenance: { source: "Минобороны Австралии", year: 2024, estimated: false },
  },
  {
    holder: "Австралия",
    hostRu: "Тихоокеанские островные государства (программа)",
    hostIso3: null,
    formatRu: "Pacific Maritime Security Program: катера Guardian-class и воздушное наблюдение",
    scaleRu: "Более 20 катеров 14 странам, финансирование эксплуатации",
    significanceRu: "Фактическая военно-морская архитектура региона без армий",
    provenance: { source: "Правительство Австралии", year: 2024, estimated: false },
  },
  {
    holder: "США",
    hostRu: "Гайана (партнёрство)",
    hostIso3: "GUY",
    formatRu: "Учения SOUTHCOM и соглашения о сотрудничестве",
    scaleRu: "Эпизодические развёртывания и обучение GDF",
    significanceRu: "Сдерживающий сигнал Венесуэле в споре об Эссекибо",
    provenance: { source: "SOUTHCOM", year: 2024, estimated: false },
  },
];

/** Присутствия, относящиеся к конкретной стране волны (по коду пребывания). */
export function presencesForHost(iso3: string): readonly ExternalPresenceEntry[] {
  return EXTERNAL_PRESENCES.filter((entry) => entry.hostIso3 === iso3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Трендовые ряды военных расходов регионов (только страны data5, оценки)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оценочные суммарные расходы регионов по странам волны data5.
 * Значения — нижняя граница региона: крупные державы других волн
 * не включены, поэтому ряды показывают динамику именно «остального мира»
 * проекта, а не полные региональные бюджеты SIPRI.
 */
export const REGION_SPENDING_SERIES: readonly RegionSpendingSeries[] = [
  {
    region: "Южная Азия",
    points: [
      { year: 2020, totalUsdBn: 0.24, noteRu: "Афганистан на международной помощи, остальные — минимумы" },
      { year: 2021, totalUsdBn: 0.22, noteRu: "Падение Афганистана после августа 2021 года" },
      { year: 2022, totalUsdBn: 0.12, noteRu: "Афганский бюджет схлопнулся до уровня талибских оценок" },
      { year: 2023, totalUsdBn: 0.13, noteRu: "Стабилизация на низком уровне" },
      { year: 2024, totalUsdBn: 0.14, noteRu: "Мальдивская морская модернизация — главный прирост" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
  {
    region: "Ближний Восток",
    points: [
      { year: 2020, totalUsdBn: 1.5, noteRu: "Бахрейн в постковидном режиме экономии" },
      { year: 2021, totalUsdBn: 1.4, noteRu: "Минимум ряда" },
      { year: 2022, totalUsdBn: 1.45, noteRu: "Нефтяные цены поддержали расходы" },
      { year: 2023, totalUsdBn: 1.45, noteRu: "Плато" },
      { year: 2024, totalUsdBn: 1.4, noteRu: "Бахрейн: стабильность как плата за зонтик" },
    ],
    provenance: { source: "Оценка проекта по SIPRI", year: 2024, estimated: true },
  },
  {
    region: "Юго-Восточная Азия",
    points: [
      { year: 2020, totalUsdBn: 0.95, noteRu: "Бруней доминирует в сумме трёх стран" },
      { year: 2021, totalUsdBn: 0.92, noteRu: "Стагнация Лаоса на фоне долгового кризиса" },
      { year: 2022, totalUsdBn: 0.9, noteRu: "Минимум ряда" },
      { year: 2023, totalUsdBn: 0.95, noteRu: "Брунейские патрульные программы" },
      { year: 2024, totalUsdBn: 1.0, noteRu: "Рост Брунея и Тимора компенсирует Лаос" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
  {
    region: "Центральная Азия",
    points: [
      { year: 2020, totalUsdBn: 0.5, noteRu: "До пограничных войн: минимальные бюджеты" },
      { year: 2021, totalUsdBn: 0.62, noteRu: "Первая кыргызско-таджикская эскалация — рост закупок" },
      { year: 2022, totalUsdBn: 0.78, noteRu: "Битва за Баткен и эра БПЛА в регионе" },
      { year: 2023, totalUsdBn: 0.85, noteRu: "Туркменские и таджикские программы догоняют" },
      { year: 2024, totalUsdBn: 0.9, noteRu: "Плато перевооружения при мирном процессе" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
  {
    region: "Европа",
    points: [
      { year: 2020, totalUsdBn: 4.6, noteRu: "Швейцария — более половины суммы малых стран волны" },
      { year: 2021, totalUsdBn: 4.8, noteRu: "Постковидное восстановление расходов" },
      { year: 2022, totalUsdBn: 5.2, noteRu: "Украинский шок: пересмотр минимумов даже нейтралами" },
      { year: 2023, totalUsdBn: 5.6, noteRu: "Кипрская и балканские программы закупок" },
      { year: 2024, totalUsdBn: 6.0, noteRu: "Рост продолжается: F-35 Швейцарии в графике платежей" },
    ],
    provenance: { source: "Оценка проекта по SIPRI", year: 2024, estimated: true },
  },
  {
    region: "Восточная Европа",
    points: [
      { year: 2020, totalUsdBn: 0.05, noteRu: "Молдова: один из самых низких бюджетов Европы" },
      { year: 2021, totalUsdBn: 0.05, noteRu: "Стагнация" },
      { year: 2022, totalUsdBn: 0.06, noteRu: "Начало западной помощи после февраля 2022 года" },
      { year: 2023, totalUsdBn: 0.09, noteRu: "Первые радары и программы ЕС" },
      { year: 2024, totalUsdBn: 0.11, noteRu: "Удвоение к уровню 2020 года — с минимальной базы" },
    ],
    provenance: { source: "Оценка проекта по SIPRI", year: 2024, estimated: true },
  },
  {
    region: "Центральная Америка и Карибы",
    points: [
      { year: 2020, totalUsdBn: 1.35, noteRu: "Полицейские по сути расходы региона" },
      { year: 2021, totalUsdBn: 1.4, noteRu: "Рост Доминиканы и Гватемалы" },
      { year: 2022, totalUsdBn: 1.5, noteRu: "Сальвадорская чрезвычайная милитаризация" },
      { year: 2023, totalUsdBn: 1.6, noteRu: "CECOT и доминиканская граница" },
      { year: 2024, totalUsdBn: 1.7, noteRu: "Гаити не входит в рост: его бюджет — fiction распавшегося государства" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
  {
    region: "Южная Америка",
    points: [
      { year: 2020, totalUsdBn: 0.14, noteRu: "Гайана до нефтяного бума, Суринам в долговом кризисе" },
      { year: 2021, totalUsdBn: 0.15, noteRu: "Первая нефть Гайаны" },
      { year: 2022, totalUsdBn: 0.17, noteRu: "Рост GDF начинается" },
      { year: 2023, totalUsdBn: 0.22, noteRu: "Референдум Венесуэлы по Эссекибо" },
      { year: 2024, totalUsdBn: 0.3, noteRu: "Гайанское ускорение: авиация и катера на нефтяные доходы" },
    ],
    provenance: { source: "Оценка проекта по SIPRI", year: 2024, estimated: true },
  },
  {
    region: "Западная Африка",
    points: [
      { year: 2020, totalUsdBn: 2.4, noteRu: "Допереворотный уровень при французском присутствии в Сахеле" },
      { year: 2021, totalUsdBn: 2.6, noteRu: "Перевороты в Мали и Гвинее не снизили расходы" },
      { year: 2022, totalUsdBn: 2.9, noteRu: "Буркина-Фасо: двойной переворот и военная мобилизация" },
      { year: 2023, totalUsdBn: 3.2, noteRu: "Нигерский переворот, закупки хунт у Турции и России" },
      { year: 2024, totalUsdBn: 3.4, noteRu: "Прибрежные страны инвестируют в северные границы" },
    ],
    provenance: { source: "Оценка проекта по SIPRI", year: 2024, estimated: true },
  },
  {
    region: "Восточная Африка",
    points: [
      { year: 2020, totalUsdBn: 1.9, noteRu: "Уганда и Руанда — ядро суммы; Эритрея непрозрачна" },
      { year: 2021, totalUsdBn: 2.0, noteRu: "Руандийские операции в Мозамбике и ЦАР" },
      { year: 2022, totalUsdBn: 2.1, noteRu: "Восточная ДРК: угандийская операция «Шуджа»" },
      { year: 2023, totalUsdBn: 2.2, noteRu: "Сомалийское наступление на Аш-Шабааб" },
      { year: 2024, totalUsdBn: 2.3, noteRu: "Рост при полной непрозрачности Эритреи и оценочности Сомали" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
  {
    region: "Центральная Африка",
    points: [
      { year: 2020, totalUsdBn: 1.6, noteRu: "Нефтяные бюджеты при пустых институтах" },
      { year: 2021, totalUsdBn: 1.6, noteRu: "Стагнация" },
      { year: 2022, totalUsdBn: 1.7, noteRu: "Чадская активность в Сахеле" },
      { year: 2023, totalUsdBn: 1.8, noteRu: "Габонский переворот не изменил структуру расходов" },
      { year: 2024, totalUsdBn: 1.9, noteRu: "ДРК наращивает на фоне войны M23" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
  {
    region: "Южная Африка",
    points: [
      { year: 2020, totalUsdBn: 1.5, noteRu: "Ботсвана и Замбия — ядро суммы" },
      { year: 2021, totalUsdBn: 1.5, noteRu: "Плато самого мирного региона" },
      { year: 2022, totalUsdBn: 1.55, noteRu: "Медный цикл поддерживает Замбию" },
      { year: 2023, totalUsdBn: 1.6, noteRu: "Стабильность без гонки вооружений" },
      { year: 2024, totalUsdBn: 1.65, noteRu: "Минимальный рост — инфляционный, не военный" },
    ],
    provenance: { source: "Оценка проекта по SIPRI", year: 2024, estimated: true },
  },
  {
    region: "Океания",
    points: [
      { year: 2020, totalUsdBn: 0.45, noteRu: "Фиджи и Папуа — почти вся сумма региона" },
      { year: 2021, totalUsdBn: 0.46, noteRu: "Стагнация" },
      { year: 2022, totalUsdBn: 0.5, noteRu: "Соглашение Соломоновых Островов с Китаем меняет контекст, не бюджеты" },
      { year: 2023, totalUsdBn: 0.55, noteRu: "Австралийские программы и рост PNG" },
      { year: 2024, totalUsdBn: 0.6, noteRu: "Расходы растут помощью, а не собственными бюджетами" },
    ],
    provenance: { source: "Оценка проекта по SIPRI и IISS", year: 2024, estimated: true },
  },
];

/** Трендовый ряд региона по названию; undefined, если ряда нет. */
export function regionSpendingSeries(
  region: string,
): RegionSpendingSeries | undefined {
  return REGION_SPENDING_SERIES.find((series) => series.region === region);
}

// ─────────────────────────────────────────────────────────────────────────────
// Трансграничные коридоры угроз
// ─────────────────────────────────────────────────────────────────────────────

/** Коридоры угроз, связывающие профили волны data5 в единую систему. */
export const THREAT_CORRIDORS: readonly ThreatCorridorEntry[] = [
  {
    nameRu: "Сахельский джихадистский фронт",
    typeRu: "Джихадизм",
    descriptionRu: "JNIM и ИГ-Сахель расширяются от центрального Мали к Буркина-Фасо, Нигеру и северным границам прибрежных Бенина, Того, Кот-д’Ивуара и Ганы",
    affectedIso3: ["MLI", "BFA", "NER", "BEN", "TGO", "CIV", "GHA"],
    responseRu: "Хунты AES — мобилизация и Россия; прибрежные страны — северные группировки и Аккрская инициатива",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Кокаиновый транзит Южной Атлантики и Карибов",
    typeRu: "Наркотрафик",
    descriptionRu: "Маршруты из Колумбии и Венесуэлы через Карибы и кабо-вердянский коридор к Европе; малые островные государства — перевалочные пункты",
    affectedIso3: ["PAN", "CRI", "JAM", "DOM", "TTO", "BHS", "CPV", "GNB", "ATG", "VCT"],
    responseRu: "Американские и европейские морские операции, RSS, модернизация береговых охран",
    provenance: { source: "UNODC; аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Коридор Великих озёр",
    typeRu: "Прокси-войны и повстанчество",
    descriptionRu: "Восточная ДРК как перекрёсток: M23 и руандийский фактор, угандийская операция против ADF, бурундийское присутствие",
    affectedIso3: ["COD", "RWA", "UGA", "BDI", "SSD"],
    responseRu: "Региональные силы, билатеральные операции и дипломатия Луанды/Найроби без устойчивого результата",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Ферганская дуга",
    typeRu: "Пограничные споры и вода",
    descriptionRu: "Неделимитированные участки, анклавы и водозаборы Кыргызстана и Таджикистана при афганском фоне южнее",
    affectedIso3: ["KGZ", "TJK"],
    responseRu: "Делимитация 2024–2025 годов и демилитаризация спорных участков",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Южно-Китайское море: южный фланг",
    typeRu: "Морское давление великой державы",
    descriptionRu: "Китайские притязания в ИЭЗ Брунея и (через PHL) Филиппин; Бруней отвечает тихой модернизацией патрульных сил",
    affectedIso3: ["BRN", "PHI"],
    responseRu: "Дипломатия АСЕАН и британско-американские связи Брунея",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Тихоокеанский наркомаршрут",
    typeRu: "Наркотрафик",
    descriptionRu: "Кокаин и метамфетамин из Америк к Австралии и Новой Зеландии через воды Фиджи, Тонги, Самоа и Соломоновых Островов",
    affectedIso3: ["FJI", "TON", "WSM", "SLB", "PNG"],
    responseRu: "Катера Guardian-class и совместные операции с Австралией и Новой Зеландией",
    provenance: { source: "UNODC; аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Героиновый маршрут западного Индийского океана",
    typeRu: "Наркотрафик",
    descriptionRu: "Афганский героин морем к берегам Восточной Африки и островным государствам: Сейшелы и Маврикий — узлы потребления и транзита",
    affectedIso3: ["SYC", "MUS", "COM", "MDG"],
    responseRu: "Морские патрули и региональные операции при символических силах островов",
    provenance: { source: "UNODC; аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Дарьенский миграционный коридор",
    typeRu: "Миграция и контрабанда людей",
    descriptionRu: "Панама как воронка миграционного потока Южной Америки к США; контроль потока стал вопросом безопасности канала",
    affectedIso3: ["PAN", "CRI", "HND", "GTM"],
    responseRu: "Панамско-американские соглашения о репатриации и полицейское усиление Дарьена",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Баб-эль-Мандеб и рентная география Джибути",
    typeRu: "Морская безопасность и базы",
    descriptionRu: "Кризисы Красного моря повышают цену джибутийских баз всех держав; Эритрея и Сомали — соседние берега того же пролива",
    affectedIso3: ["DJI", "ERI", "SOM"],
    responseRu: "Арендная модель Джибути; международные коалиции в проливе",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Кипрский узел Восточного Средиземноморья",
    typeRu: "Замороженный конфликт и энергетика",
    descriptionRu: "Разделённый остров между Турцией, Грецией, Великобританией и Израилем при газовых полях шельфа",
    affectedIso3: ["CYP"],
    responseRu: "Статус-кво ООН и наращивание связей Никосии с США и Израилем",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Приднестровский коридор",
    typeRu: "Замороженный конфликт",
    descriptionRu: "Российский контингент и склад в Колбасне между Молдовой и Украиной: гибридное давление важнее военного",
    affectedIso3: ["MDA"],
    responseRu: "Европейская помощь Молдове и форматы урегулирования без прогресса",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Эссекибо и гвианский шельф",
    typeRu: "Территориальный спор и нефть",
    descriptionRu: "Венесуэльские притязания на две трети Гайаны при открытии крупнейших новых запасов нефти региона",
    affectedIso3: ["GUY", "SUR"],
    responseRu: "Американское партнёрство Гайаны и дипломатия КАРИКОМ",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Коридоры угроз, затрагивающие конкретную страну волны. */
export function corridorsForCountry(iso3: string): readonly ThreatCorridorEntry[] {
  return THREAT_CORRIDORS.filter((entry) => entry.affectedIso3.includes(iso3));
}

// ─────────────────────────────────────────────────────────────────────────────
// Глоссарий показателей агрегации
// ─────────────────────────────────────────────────────────────────────────────

/** Глоссарий: как читать агрегаты волны data5. */
export const AGGREGATION_GLOSSARY: readonly AggregationGlossaryEntry[] = [
  {
    termRu: "Известный бюджет",
    definitionRu: "Бюджет, для которого проект располагает числовой оценкой из открытого источника",
    caveatRu: "Для ряда стран оценка условна (Афганистан, Сомали) и помечена в профиле",
  },
  {
    termRu: "Непрозрачный бюджет",
    definitionRu: "Бюджет со значением null: режим не публикует данные, и проект не выдумывает цифру",
    caveatRu: "Эритрея, Туркменистан, Экваториальная Гвинея — классические случаи",
  },
  {
    termRu: "Нижняя оценка региона",
    definitionRu: "Сумма только по странам волны data5 без крупных держав других волн",
    caveatRu: "Нельзя сравнивать с полными региональными итогами SIPRI напрямую",
  },
  {
    termRu: "Алиас PHI",
    definitionRu: "Дублирующий код Филиппин в реестре: страна учитывается один раз как PHL в data3",
    caveatRu: "Агрегаты обязаны исключать PHI, иначе Филиппины посчитаются дважды",
  },
  {
    termRu: "Страна без армии",
    definitionRu: "Государство, где функции обороны выполняют полиция, береговая охрана или внешний гарант по договору",
    caveatRu: "Нулевой военный бюджет таких стран — юридический факт, а не пропуск данных",
  },
  {
    termRu: "Рентная безопасность",
    definitionRu: "Модель, при которой страна продаёт географию (базы, порты) вместо содержания армии: Джибути, Бахрейн",
    caveatRu: "Бюджет такой страны занижает её реальную защищённость на порядок",
  },
  {
    termRu: "Импортозависимость «не применимо»",
    definitionRu: "Уровень для стран без армии: импорта вооружений нет, техника сил безопасности — донорская",
    caveatRu: "Не путать с «низкой» зависимостью стран с армией",
  },
  {
    termRu: "Плотность риска региона",
    definitionRu: "Доля уязвимостей высокой тяжести среди всех зафиксированных в профилях региона",
    caveatRu: "Зависит от полноты профилей: закрытые страны могут недооцениваться",
  },
  {
    termRu: "Индикаторный снимок",
    definitionRu: "Сжатая запись страны (бюджет, состав, армия, ВПК, импорт, уязвимости) для быстрых сравнений",
    caveatRu: "Снимок не заменяет профиль: провенанс и оговорки живут в профиле",
  },
  {
    termRu: "Винтаж данных",
    definitionRu: "Проектный срез открытых источников около 2024 года (SIPRI, IISS Military Balance, CIA Factbook)",
    caveatRu: "Для воюющих стран (Гаити, Сомали, Мали) данные устаревают за месяцы",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Региональные паспорта стран: география и модель безопасности
// ─────────────────────────────────────────────────────────────────────────────

/** Паспорт страны для регионального контекста (не дублирует военный профиль). */
export interface CountryRegionalPassport {
  /** Код ISO3. */
  iso3: string;
  /** Столица (рус.). */
  capitalRu: string;
  /** Население, округлённая оценка (рус.). */
  populationRu: string;
  /** Рельеф и география, значимые для обороны (рус.). */
  terrainRu: string;
  /** Сухопутные соседи / морской характер (рус.). */
  bordersRu: string;
  /** Главный природный риск (рус.). */
  naturalRiskRu: string;
  /** Основная угроза безопасности по оценке проекта (рус.). */
  primaryThreatRu: string;
  /** Модель безопасности страны одной фразой (рус.). */
  securityModelRu: string;
  /** Провенанс паспорта. */
  provenance: RestProvenance;
}

/** Паспорта стран волны data5: Азия, Ближний Восток и Европа. */
export const COUNTRY_PASSPORTS_EURASIA: readonly CountryRegionalPassport[] = [
  {
    iso3: "AFG",
    capitalRu: "Кабул",
    populationRu: "Около 41 млн",
    terrainRu: "Гиндукуш делит страну на северные равнины и южные пустыни; перевалы — единственные оси движения",
    bordersRu: "Шесть соседей, включая Китай (Ваханский коридор) и Иран",
    naturalRiskRu: "Землетрясения и засухи",
    primaryThreatRu: "ИГ-Хорасан и трансграничный терроризм",
    securityModelRu: "Армия религиозного режима без признанного статуса",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BHR",
    capitalRu: "Манама",
    populationRu: "Около 1,6 млн",
    terrainRu: "Низменный архипелаг в центре Залива, соединён дамбой с Саудовской Аравией",
    bordersRu: "Морские границы с Ираном, Катаром и Саудовской Аравией",
    naturalRiskRu: "Экстремальная жара",
    primaryThreatRu: "Иранский фактор и внутренняя оппозиция",
    securityModelRu: "Аренда географии американскому флоту",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BTN",
    capitalRu: "Тхимпху",
    populationRu: "Около 0,8 млн",
    terrainRu: "Гималаи от 7 500 м до субтропиков юга за 170 км",
    bordersRu: "Только Индия и Китай; граница с Китаем не делимитирована",
    naturalRiskRu: "Прорывы ледниковых озёр",
    primaryThreatRu: "Оказаться полем индийско-китайского спора",
    securityModelRu: "Малая армия под индийским менторством",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BRN",
    capitalRu: "Бандар-Сери-Бегаван",
    populationRu: "Около 0,45 млн",
    terrainRu: "Две анклавные части на северном берегу Борнео, джунгли внутри",
    bordersRu: "Малайзия со всех сухопутных сторон, Южно-Китайское море с севера",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Китайские морские притязания",
    securityModelRu: "Рентная армия плюс британский гарнизон",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "LAO",
    capitalRu: "Вьентьян",
    populationRu: "Около 7,6 млн",
    terrainRu: "Горы Аннамского хребта и долина Меконга",
    bordersRu: "Пять соседей — самая «окружённая» страна региона",
    naturalRiskRu: "Наводнения Меконга",
    primaryThreatRu: "Преступные анклавы и зависимость от Китая",
    securityModelRu: "Партийная армия в тени Вьетнама и Китая",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MDV",
    capitalRu: "Мале",
    populationRu: "Около 0,52 млн",
    terrainRu: "Атоллы средней высотой около 1,5 м — самая низкая страна мира",
    bordersRu: "Только море: Индия и Шри-Ланка — ближайшие соседи",
    naturalRiskRu: "Подъём океана и цунами",
    primaryThreatRu: "Соперничество Индии и Китая за атоллы",
    securityModelRu: "Морские силы как береговая охрана океанских путей",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TLS",
    capitalRu: "Дили",
    populationRu: "Около 1,4 млн",
    terrainRu: "Горная восточная половина острова Тимор",
    bordersRu: "Индонезия (Западный Тимор), море — Австралия",
    naturalRiskRu: "Засухи и землетрясения",
    primaryThreatRu: "Фискальное истощение нефтяного фонда",
    securityModelRu: "Малая армия под австралийским зонтиком",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "PHI",
    capitalRu: "Манила",
    populationRu: "См. профиль PHL в волне data3",
    terrainRu: "Алиасная запись: география учтена в профиле PHL",
    bordersRu: "Алиасная запись",
    naturalRiskRu: "Алиасная запись",
    primaryThreatRu: "Алиасная запись",
    securityModelRu: "Алиас: не участвует в агрегатах",
    provenance: { source: "Методологическая пометка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "KGZ",
    capitalRu: "Бишкек",
    populationRu: "Около 7 млн",
    terrainRu: "Тянь-Шань и Памиро-Алай: 90% территории выше 1 500 м",
    bordersRu: "Казахстан, Китай, Таджикистан, Узбекистан; анклавы Ферганы",
    naturalRiskRu: "Землетрясения и сели",
    primaryThreatRu: "Пограничный конфликт с Таджикистаном",
    securityModelRu: "Малая армия ОДКБ с турецкими БПЛА",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TJK",
    capitalRu: "Душанбе",
    populationRu: "Около 10,3 млн",
    terrainRu: "Памир — «крыша мира», 93% гор",
    bordersRu: "Афганистан по Пянджу — 1 357 км; Китай, Кыргызстан, Узбекистан",
    naturalRiskRu: "Землетрясения и сходы ледников",
    primaryThreatRu: "Прорыв афганских группировок и пограничная война на севере",
    securityModelRu: "Фронтирная армия под российской базой",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TKM",
    capitalRu: "Ашхабад",
    populationRu: "Официально около 7 млн; независимые оценки ниже",
    terrainRu: "Пустыня Каракумы — 80% территории, оазисы у Копетдага",
    bordersRu: "Каспий, Иран, Афганистан, Узбекистан, Казахстан",
    naturalRiskRu: "Засуха и аральский кризис",
    primaryThreatRu: "Афганская граница при полной закрытости данных",
    securityModelRu: "Нейтралитет как доктрина изоляции",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "ALB",
    capitalRu: "Тирана",
    populationRu: "Около 2,8 млн",
    terrainRu: "Горы Проклетие и адриатическое побережье",
    bordersRu: "Черногория, Косово, Северная Македония, Греция",
    naturalRiskRu: "Землетрясения",
    primaryThreatRu: "Региональные сербско-албанские трения",
    securityModelRu: "НАТО вместо массовой армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "AND",
    capitalRu: "Андорра-ла-Велья",
    populationRu: "Около 0,08 млн",
    terrainRu: "Пиренейские долины, средняя высота около 2 000 м",
    bordersRu: "Только Франция и Испания",
    naturalRiskRu: "Лавины и наводнения",
    primaryThreatRu: "Отсутствует военная угроза",
    securityModelRu: "Без армии с XIII века: полиция и соседи-соправители",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BIH",
    capitalRu: "Сараево",
    populationRu: "Около 3,2 млн",
    terrainRu: "Динарские горы и узкая долина Савы",
    bordersRu: "Хорватия, Сербия, Черногория; 20 км побережья у Неума",
    naturalRiskRu: "Наводнения и мины войны 1990-х",
    primaryThreatRu: "Сецессионизм Республики Сербской",
    securityModelRu: "Единые ВС под надзором EUFOR",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CYP",
    capitalRu: "Никосия (последняя разделённая столица Европы)",
    populationRu: "Около 1,26 млн с севером",
    terrainRu: "Хребты Троодос и Кирения, равнина Месаория между ними",
    bordersRu: "Буферная зона ООН делит остров с 1974 года",
    naturalRiskRu: "Засуха",
    primaryThreatRu: "Турецкий военный фактор севера",
    securityModelRu: "Национальная гвардия плюс британские базы и связи с США",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "ISL",
    capitalRu: "Рейкьявик",
    populationRu: "Около 0,39 млн",
    terrainRu: "Вулканический остров на стыке плит в центре GIUK-прохода",
    bordersRu: "Только море: Гренландия, Норвегия, Великобритания",
    naturalRiskRu: "Вулканы и землетрясения",
    primaryThreatRu: "Активность России в Северной Атлантике",
    securityModelRu: "Без армии: береговая охрана и ротации НАТО",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "IRL",
    capitalRu: "Дублин",
    populationRu: "Около 5,3 млн",
    terrainRu: "Остров с низкой береговой линией и огромной морской зоной",
    bordersRu: "Великобритания (Северная Ирландия), Атлантика",
    naturalRiskRu: "Штормы",
    primaryThreatRu: "Подводная инфраструктура при отсутствии средств её контроля",
    securityModelRu: "Нейтралитет при символических силах обороны",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "LIE",
    capitalRu: "Вадуц",
    populationRu: "Около 0,04 млн",
    terrainRu: "Альпийская долина Рейна",
    bordersRu: "Швейцария и Австрия",
    naturalRiskRu: "Наводнения Рейна",
    primaryThreatRu: "Отсутствует",
    securityModelRu: "Без армии с 1868 года, таможенный союз со Швейцарией",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "LUX",
    capitalRu: "Люксембург",
    populationRu: "Около 0,66 млн",
    terrainRu: "Арденны и долина Мозеля",
    bordersRu: "Бельгия, Германия, Франция",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Отсутствует прямая угроза",
    securityModelRu: "Нишевой вклад в НАТО: спутники вместо дивизий",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MNE",
    capitalRu: "Подгорица",
    populationRu: "Около 0,62 млн",
    terrainRu: "Карстовые горы и Которский залив",
    bordersRu: "Хорватия, Босния, Сербия, Косово, Албания",
    naturalRiskRu: "Землетрясения",
    primaryThreatRu: "Политическое вмешательство извне",
    securityModelRu: "Микровойска в рамках НАТО",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MKD",
    capitalRu: "Скопье",
    populationRu: "Около 1,8 млн",
    terrainRu: "Котловины Вардара между горными хребтами",
    bordersRu: "Косово, Сербия, Болгария, Греция, Албания; выхода к морю нет",
    naturalRiskRu: "Землетрясения (Скопье 1963 года)",
    primaryThreatRu: "Межэтническая напряжённость",
    securityModelRu: "Малая профессиональная армия НАТО",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SVN",
    capitalRu: "Любляна",
    populationRu: "Около 2,1 млн",
    terrainRu: "Альпы, карст и 47 км адриатического берега",
    bordersRu: "Италия, Австрия, Венгрия, Хорватия",
    naturalRiskRu: "Наводнения (2023 год — крупнейшие в истории)",
    primaryThreatRu: "Отсутствует прямая угроза",
    securityModelRu: "Тыловая армия НАТО с ростом закупок",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CHE",
    capitalRu: "Берн (де-факто)",
    populationRu: "Около 8,9 млн",
    terrainRu: "Альпийский редут: перевалы и туннели как оборонительные рубежи",
    bordersRu: "Пять соседей ЕС и Лихтенштейн",
    naturalRiskRu: "Лавины и наводнения",
    primaryThreatRu: "Эрозия нейтралитета, а не вторжение",
    securityModelRu: "Милиция: армия резерва при малом кадре",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MDA",
    capitalRu: "Кишинёв",
    populationRu: "Около 2,5 млн без Приднестровья",
    terrainRu: "Равнина между Прутом и Днестром",
    bordersRu: "Румыния и Украина; Приднестровье контролирует восточный берег Днестра",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "Гибридное давление и приднестровский фактор",
    securityModelRu: "Нейтралитет при армии меньше приднестровской группировки",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MCO",
    capitalRu: "Монако",
    populationRu: "Около 0,04 млн",
    terrainRu: "2 км² скалистого берега Лазурного берега",
    bordersRu: "Только Франция и море",
    naturalRiskRu: "Отсутствуют значимые",
    primaryThreatRu: "Отсутствует",
    securityModelRu: "Карабинеры князя и французский договор",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SMR",
    capitalRu: "Сан-Марино",
    populationRu: "Около 0,034 млн",
    terrainRu: "Гора Титано внутри Италии",
    bordersRu: "Только Италия",
    naturalRiskRu: "Отсутствуют значимые",
    primaryThreatRu: "Отсутствует",
    securityModelRu: "Церемониальные корпуса и итальянский зонтик",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MLT",
    capitalRu: "Валлетта",
    populationRu: "Около 0,54 млн",
    terrainRu: "Известняковые острова Сицилийского пролива",
    bordersRu: "Только море: Италия, Ливия, Тунис",
    naturalRiskRu: "Засуха и нехватка воды",
    primaryThreatRu: "Миграционные потоки и контрабанда",
    securityModelRu: "Нейтральные силы уровня береговой охраны",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "XKX",
    capitalRu: "Приштина",
    populationRu: "Около 1,7 млн",
    terrainRu: "Косовская и Метохийская котловины между хребтами",
    bordersRu: "Сербия (не признаёт), Северная Македония, Албания, Черногория",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Инциденты на сербском севере",
    securityModelRu: "Лёгкие силы под фактическим зонтиком KFOR",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "PSE",
    capitalRu: "Рамалла / Иерусалим (провозглашённая)",
    populationRu: "Около 5,5 млн (Западный берег и Газа)",
    terrainRu: "Холмы Западного берега и прибрежная полоса Газы",
    bordersRu: "Израиль со всех сторон, Египет у Газы, Иордания через Иордан",
    naturalRiskRu: "Нехватка воды",
    primaryThreatRu: "Война и оккупационный контроль",
    securityModelRu: "Силы безопасности ПА без суверенной армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
];

/** Паспорта стран волны data5: Америки и Океания. */
export const COUNTRY_PASSPORTS_AMERICAS_OCEANIA: readonly CountryRegionalPassport[] = [
  {
    iso3: "ATG",
    capitalRu: "Сент-Джонс",
    populationRu: "Около 0,1 млн",
    terrainRu: "Два низких острова, Антигуа и Барбуда",
    bordersRu: "Только море",
    naturalRiskRu: "Ураганы (Барбуда разрушена «Ирмой» в 2017 году)",
    primaryThreatRu: "Наркотранзит и стихия",
    securityModelRu: "Малые силы обороны в системе RSS",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BHS",
    capitalRu: "Нассау",
    populationRu: "Около 0,41 млн",
    terrainRu: "700 низких островов на 13 тыс. км² суши и огромном мелководье",
    bordersRu: "США (Флорида), Куба, Гаити по морю",
    naturalRiskRu: "Ураганы высшей категории",
    primaryThreatRu: "Миграция с Гаити и наркотрафик",
    securityModelRu: "Морские силы обороны — образец для Карибов",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BRB",
    capitalRu: "Бриджтаун",
    populationRu: "Около 0,28 млн",
    terrainRu: "Коралловый остров, самый восточный в Карибах",
    bordersRu: "Только море",
    naturalRiskRu: "Ураганы",
    primaryThreatRu: "Транзитная преступность",
    securityModelRu: "Штаб RSS и малые силы обороны",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BLZ",
    capitalRu: "Бельмопан",
    populationRu: "Около 0,41 млн",
    terrainRu: "Джунгли и болота побережья, горы Майя внутри",
    bordersRu: "Мексика и Гватемала (спорная граница)",
    naturalRiskRu: "Ураганы",
    primaryThreatRu: "Территориальный спор и наркотранзит",
    securityModelRu: "Малые силы обороны плюс британское учебное присутствие",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CRI",
    capitalRu: "Сан-Хосе",
    populationRu: "Около 5,2 млн",
    terrainRu: "Вулканическая центральная долина между двумя океанами",
    bordersRu: "Никарагуа и Панама",
    naturalRiskRu: "Землетрясения и вулканы",
    primaryThreatRu: "Наркокартелизация портов",
    securityModelRu: "Демилитаризация 1948 года: полиция вместо армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "DMA",
    capitalRu: "Розо",
    populationRu: "Около 0,07 млн",
    terrainRu: "Вулканический остров с девятью кратерами",
    bordersRu: "Только море",
    naturalRiskRu: "Ураганы и извержения",
    primaryThreatRu: "Стихия",
    securityModelRu: "Полиция и членство в RSS без армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "DOM",
    capitalRu: "Санто-Доминго",
    populationRu: "Около 11,2 млн",
    terrainRu: "Восточные две трети острова Гаити, хребет Кордильера-Сентраль",
    bordersRu: "Гаити — единственная сухопутная граница",
    naturalRiskRu: "Ураганы и землетрясения",
    primaryThreatRu: "Перенос гаитянского распада",
    securityModelRu: "Крупнейшая армия Карибов с пограничной миссией",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SLV",
    capitalRu: "Сан-Сальвадор",
    populationRu: "Около 6,3 млн",
    terrainRu: "Вулканическая цепь вдоль Тихого океана",
    bordersRu: "Гватемала и Гондурас",
    naturalRiskRu: "Землетрясения и вулканы",
    primaryThreatRu: "Рецидив банд после чрезвычайной модели",
    securityModelRu: "Милитаризованная внутренняя безопасность",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GRD",
    capitalRu: "Сент-Джорджес",
    populationRu: "Около 0,12 млн",
    terrainRu: "Вулканический остров и южные Гренадины",
    bordersRu: "Только море; Венесуэла и Тринидад рядом",
    naturalRiskRu: "Ураганы («Иван» 2004, «Берил» 2024)",
    primaryThreatRu: "Стихия и транзит",
    securityModelRu: "Полиция и RSS без армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GTM",
    capitalRu: "Гватемала",
    populationRu: "Около 18 млн",
    terrainRu: "Высокогорья запада и джунгли Петена",
    bordersRu: "Мексика, Белиз, Гондурас, Сальвадор",
    naturalRiskRu: "Вулканы и землетрясения",
    primaryThreatRu: "Наркосети внутри институтов",
    securityModelRu: "Армия с контрповстанческим наследием",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "HTI",
    capitalRu: "Порт-о-Пренс",
    populationRu: "Около 11,8 млн",
    terrainRu: "Западная треть острова Гаити, гористая",
    bordersRu: "Доминиканская Республика",
    naturalRiskRu: "Землетрясения и ураганы",
    primaryThreatRu: "Банды как квазигосударство в столице",
    securityModelRu: "Распавшееся государство: полиция и международная миссия",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "HND",
    capitalRu: "Тегусигальпа",
    populationRu: "Около 10,6 млн",
    terrainRu: "Горы внутри, карибское побережье Москития",
    bordersRu: "Гватемала, Сальвадор, Никарагуа",
    naturalRiskRu: "Ураганы («Митч» 1998 года)",
    primaryThreatRu: "Банды и наркотрафик Москитии",
    securityModelRu: "Армия плюс американская база Сото-Кано",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "NIC",
    capitalRu: "Манагуа",
    populationRu: "Около 6,9 млн",
    terrainRu: "Озёра Никарагуа и Манагуа, карибская низменность Москития",
    bordersRu: "Гондурас и Коста-Рика",
    naturalRiskRu: "Вулканы и землетрясения",
    primaryThreatRu: "Политический кризис режима",
    securityModelRu: "Партийная армия при западной изоляции",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "PAN",
    capitalRu: "Панама",
    populationRu: "Около 4,5 млн",
    terrainRu: "Перешеек с каналом и непроходимым Дарьенским пробелом",
    bordersRu: "Коста-Рика и Колумбия (Дарьен)",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Миграционный поток и споры вокруг канала",
    securityModelRu: "Без армии с 1990 года: полиция канала",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "JAM",
    capitalRu: "Кингстон",
    populationRu: "Около 2,8 млн",
    terrainRu: "Гористый остров к югу от Кубы",
    bordersRu: "Только море",
    naturalRiskRu: "Ураганы",
    primaryThreatRu: "Банды и оружейный поток из США",
    securityModelRu: "Силы обороны с полицейской нагрузкой",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "KNA",
    capitalRu: "Бастер",
    populationRu: "Около 0,05 млн",
    terrainRu: "Два вулканических острова",
    bordersRu: "Только море",
    naturalRiskRu: "Ураганы",
    primaryThreatRu: "Уличная преступность",
    securityModelRu: "Микросилы обороны в RSS",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "LCA",
    capitalRu: "Кастри",
    populationRu: "Около 0,18 млн",
    terrainRu: "Вулканический остров с Питонами",
    bordersRu: "Только море",
    naturalRiskRu: "Ураганы и оползни",
    primaryThreatRu: "Ганг-насилие",
    securityModelRu: "Полиция и RSS без армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "VCT",
    capitalRu: "Кингстаун",
    populationRu: "Около 0,1 млн",
    terrainRu: "Остров Сент-Винсент и цепь Гренадин",
    bordersRu: "Только море",
    naturalRiskRu: "Вулкан Ла-Суфриер и ураганы",
    primaryThreatRu: "Наркотранзит по Гренадинам",
    securityModelRu: "Полиция и RSS без армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TTO",
    capitalRu: "Порт-оф-Спейн",
    populationRu: "Около 1,5 млн",
    terrainRu: "Два острова у дельты Ориноко",
    bordersRu: "Венесуэла через узкий пролив",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Банды и венесуэльский транзит",
    securityModelRu: "Сильнейшие силы обороны южных Карибов",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GUY",
    capitalRu: "Джорджтаун",
    populationRu: "Около 0,82 млн",
    terrainRu: "Прибрежная полоса ниже уровня моря и саванны Рупунуни",
    bordersRu: "Венесуэла (спор об Эссекибо), Бразилия, Суринам",
    naturalRiskRu: "Наводнения побережья",
    primaryThreatRu: "Венесуэльские притязания",
    securityModelRu: "Малая армия на нефтяной диете роста",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SUR",
    capitalRu: "Парамарибо",
    populationRu: "Около 0,62 млн",
    terrainRu: "Прибрежная полоса и необжитые джунгли внутри",
    bordersRu: "Гайана, Бразилия, Французская Гвиана",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Наркотранзит через джунгли",
    securityModelRu: "Символическая армия, полиция решает задачи безопасности",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "FJI",
    capitalRu: "Сува",
    populationRu: "Около 0,93 млн",
    terrainRu: "Вулканические острова Вити-Леву и Вануа-Леву",
    bordersRu: "Только море",
    naturalRiskRu: "Циклоны («Уинстон» 2016 года)",
    primaryThreatRu: "Армия в политике и наркотранзит",
    securityModelRu: "Региональный военный донор с переворотной историей",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "PNG",
    capitalRu: "Порт-Морсби",
    populationRu: "Около 10,5 млн",
    terrainRu: "Хребты Новой Гвинеи, нагорья с изолированными долинами",
    bordersRu: "Индонезия (Папуа) — единственная сухопутная граница",
    naturalRiskRu: "Землетрясения и вулканы",
    primaryThreatRu: "Племенные войны нагорий",
    securityModelRu: "Слабая армия при австралийском партнёрстве",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "KIR",
    capitalRu: "Тарава (Южная Тарава)",
    populationRu: "Около 0,13 млн",
    terrainRu: "33 атолла на 3,5 млн км² океана",
    bordersRu: "Только море",
    naturalRiskRu: "Подъём океана",
    primaryThreatRu: "Климат и внешняя конкуренция за полицию",
    securityModelRu: "Полиция вместо армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MHL",
    capitalRu: "Маджуро",
    populationRu: "Около 0,04 млн",
    terrainRu: "Атоллы Ралик и Ратак, включая Кваджалейн",
    bordersRu: "Только море",
    naturalRiskRu: "Подъём океана и засухи",
    primaryThreatRu: "Ядерное наследие и климат",
    securityModelRu: "Оборона — США по COFA, полиция внутри",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "FSM",
    capitalRu: "Паликир",
    populationRu: "Около 0,11 млн",
    terrainRu: "607 островов четырёх штатов от Япа до Косраэ",
    bordersRu: "Только море",
    naturalRiskRu: "Тайфуны",
    primaryThreatRu: "Китайский интерес к Чууку",
    securityModelRu: "Оборона — США по COFA",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "PLW",
    capitalRu: "Нгерулмуд",
    populationRu: "Около 0,018 млн",
    terrainRu: "Скальные острова и лагуна мирового наследия",
    bordersRu: "Только море; Индонезия и Филиппины рядом",
    naturalRiskRu: "Тайфуны",
    primaryThreatRu: "Давление Китая из-за Тайваня",
    securityModelRu: "Морская полиция и американские сенсоры",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "WSM",
    capitalRu: "Апиа",
    populationRu: "Около 0,22 млн",
    terrainRu: "Вулканические острова Уполу и Савайи",
    bordersRu: "Только море",
    naturalRiskRu: "Циклоны и цунами (2009 год)",
    primaryThreatRu: "Наркотранзит",
    securityModelRu: "Полиция и договор с Новой Зеландией",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SLB",
    capitalRu: "Хониара",
    populationRu: "Около 0,74 млн",
    terrainRu: "Вулканический архипелаг, Гуадалканал — центр",
    bordersRu: "Только море; Папуа рядом",
    naturalRiskRu: "Циклоны и цунами",
    primaryThreatRu: "Внутренние беспорядки и двойное внешнее зонтичное давление",
    securityModelRu: "Полиция между Австралией и Китаем",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TON",
    capitalRu: "Нукуалофа",
    populationRu: "Около 0,105 млн",
    terrainRu: "170 островов, Тонгатапу — главный",
    bordersRu: "Только море",
    naturalRiskRu: "Вулканы (извержение 2022 года) и циклоны",
    primaryThreatRu: "Стихия",
    securityModelRu: "Микроармия монарха как спасательная служба",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TUV",
    capitalRu: "Фунафути",
    populationRu: "Около 0,011 млн",
    terrainRu: "Девять атоллов, средняя высота около 2 м",
    bordersRu: "Только море",
    naturalRiskRu: "Физическое затопление страны",
    primaryThreatRu: "Подъём океана",
    securityModelRu: "Полиция и климатический союз с Австралией",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "VUT",
    capitalRu: "Порт-Вила",
    populationRu: "Около 0,33 млн",
    terrainRu: "Вулканический архипелаг из 83 островов",
    bordersRu: "Только море; Новая Каледония рядом",
    naturalRiskRu: "Циклоны и землетрясения (Порт-Вила, 2024)",
    primaryThreatRu: "Стихия",
    securityModelRu: "Военизированная полиция VMF вместо армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
];

/** Паспорта стран волны data5: Африка (Западная и Центральная). */
export const COUNTRY_PASSPORTS_AFRICA_WEST_CENTRAL: readonly CountryRegionalPassport[] = [
  {
    iso3: "BEN",
    capitalRu: "Порто-Ново (правительство — в Котону)",
    populationRu: "Около 13,7 млн",
    terrainRu: "Равнины юга и саванны севера у парков W и Пенджари",
    bordersRu: "Того, Буркина-Фасо, Нигер, Нигерия",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Джихадистские вылазки на севере",
    securityModelRu: "Прибрежная армия, усиливающая северный фланг",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BFA",
    capitalRu: "Уагадугу",
    populationRu: "Около 23 млн",
    terrainRu: "Сахельские равнины без выхода к морю",
    bordersRu: "Шесть соседей, фронт — Мали и Нигер",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "JNIM контролирует или блокирует значительную часть территории",
    securityModelRu: "Военная хунта и массовые добровольческие формирования",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CPV",
    capitalRu: "Прая",
    populationRu: "Около 0,56 млн",
    terrainRu: "Вулканический архипелаг в 570 км от Сенегала",
    bordersRu: "Только море",
    naturalRiskRu: "Засуха",
    primaryThreatRu: "Кокаиновый транзит",
    securityModelRu: "Морская модель малых сил при поддержке ЕС",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CMR",
    capitalRu: "Яунде",
    populationRu: "Около 28 млн",
    terrainRu: "От саванн севера до экваториальных лесов юга",
    bordersRu: "Шесть соседей; полуостров Бакасси у Нигерии",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Англоязычный сепаратизм и «Боко Харам» одновременно",
    securityModelRu: "Президентская армия с элитным BIR",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CAF",
    capitalRu: "Банги",
    populationRu: "Около 5,5 млн",
    terrainRu: "Саванны и леса центра континента без выхода к морю",
    bordersRu: "Шесть соседей — все нестабильные",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Повстанческие коалиции на периферии",
    securityModelRu: "Столица под внешним гарантом, периферия — никому",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TCD",
    capitalRu: "Нджамена",
    populationRu: "Около 18 млн",
    terrainRu: "Сахара севера, сахель центра, озеро Чад на западе",
    bordersRu: "Шесть соседей, включая воюющий Судан",
    naturalRiskRu: "Засухи и высыхание озера Чад",
    primaryThreatRu: "Суданская война и клановая динамика армии",
    securityModelRu: "Армия как главный институт и экспортный товар",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "COG",
    capitalRu: "Браззавиль",
    populationRu: "Около 6 млн",
    terrainRu: "Леса бассейна Конго и атлантический порт Пуэнт-Нуар",
    bordersRu: "Габон, Камерун, ЦАР, ДРК через реку Конго, Ангола (Кабинда)",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Нефтяная зависимость и преемственность",
    securityModelRu: "Стабильная президентская армия",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "COD",
    capitalRu: "Киншаса",
    populationRu: "Около 105 млн",
    terrainRu: "Вторая страна Африки по площади: леса бассейна и горы востока",
    bordersRu: "Девять соседей; фронт — восток у Руанды, Уганды и Бурунди",
    naturalRiskRu: "Вулкан Ньирагонго и эпидемии",
    primaryThreatRu: "Война M23 и десятки группировок востока",
    securityModelRu: "Огромная территория при армии, не контролирующей восток",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "CIV",
    capitalRu: "Ямусукро (экономическая столица — Абиджан)",
    populationRu: "Около 29 млн",
    terrainRu: "Лагуны юга и саванны севера",
    bordersRu: "Либерия, Гвинея, Мали, Буркина-Фасо, Гана",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Джихадизм северной границы",
    securityModelRu: "Растущая армия экономического локомотива WAEMU",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GAB",
    capitalRu: "Либревиль",
    populationRu: "Около 2,4 млн",
    terrainRu: "Экваториальные леса, 90% территории",
    bordersRu: "Экваториальная Гвинея, Камерун, Республика Конго",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Неопределённость постпереворотного перехода",
    securityModelRu: "Нефтяная малая армия в переходном периоде",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GMB",
    capitalRu: "Банжул",
    populationRu: "Около 2,7 млн",
    terrainRu: "Узкая полоса вдоль реки Гамбия внутри Сенегала",
    bordersRu: "Только Сенегал и море",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Армейская политика",
    securityModelRu: "Малая армия под зонтиком миссии ЭКОВАС",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GHA",
    capitalRu: "Аккра",
    populationRu: "Около 34 млн",
    terrainRu: "Побережье Гвинейского залива и озеро Вольта",
    bordersRu: "Кот-д’Ивуар, Буркина-Фасо, Того",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Северный джихадистский фон при фискальном кризисе",
    securityModelRu: "Профессиональная армия демократии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GIN",
    capitalRu: "Конакри",
    populationRu: "Около 14 млн",
    terrainRu: "Фута-Джаллон — «водонапорная башня» Западной Африки",
    bordersRu: "Шесть соседей",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Затяжной военный переход",
    securityModelRu: "Хунта на бокситовой ренте",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GNB",
    capitalRu: "Бисау",
    populationRu: "Около 2,2 млн",
    terrainRu: "Приливные болота и архипелаг Бижагош",
    bordersRu: "Сенегал и Гвинея",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Слияние наркотрафика и армии",
    securityModelRu: "Армия как главный политический игрок слабого государства",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "LBR",
    capitalRu: "Монровия",
    populationRu: "Около 5,4 млн",
    terrainRu: "Дождевые леса и атлантическое побережье",
    bordersRu: "Сьерра-Леоне, Гвинея, Кот-д’Ивуар",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Бедность, а не война",
    securityModelRu: "Пересобранная под США малая армия",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MLI",
    capitalRu: "Бамако",
    populationRu: "Около 23 млн",
    terrainRu: "Сахара севера, сахель и дельта Нигера в центре",
    bordersRu: "Семь соседей — рекорд региона",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "JNIM и ИГ-Сахель на большей части территории",
    securityModelRu: "Хунта AES с российским контингентом",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MRT",
    capitalRu: "Нуакшот",
    populationRu: "Около 5 млн",
    terrainRu: "Сахара — 90% территории, берег Атлантики",
    bordersRu: "Западная Сахара, Мали, Алжир, Сенегал",
    naturalRiskRu: "Засухи и наступление песков",
    primaryThreatRu: "Малийский джихадистский сосед",
    securityModelRu: "Дипломатия племён плюс армия: успешный сахельский кейс",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "NER",
    capitalRu: "Ниамей",
    populationRu: "Около 27 млн",
    terrainRu: "Сахара и сахель без выхода к морю",
    bordersRu: "Семь соседей; фронты — Мали/Буркина и озеро Чад",
    naturalRiskRu: "Засухи и голод",
    primaryThreatRu: "Два джихадистских фронта при изоляции",
    securityModelRu: "Хунта AES после изгнания западных сил",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SEN",
    capitalRu: "Дакар",
    populationRu: "Около 18 млн",
    terrainRu: "Саванны и полуостров Кап-Вер — западная точка Африки",
    bordersRu: "Пять соседей; Гамбия — анклав внутри",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "Казамансский сепаратизм (тлеющий)",
    securityModelRu: "Армия без переворотов как институт республики",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SLE",
    capitalRu: "Фритаун",
    populationRu: "Около 8,8 млн",
    terrainRu: "Холмы полуострова Фритаун и алмазные районы востока",
    bordersRu: "Гвинея и Либерия",
    naturalRiskRu: "Оползни и наводнения",
    primaryThreatRu: "Политизация армии в кризисах",
    securityModelRu: "Постконфликтная армия под британским менторством",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "TGO",
    capitalRu: "Ломе",
    populationRu: "Около 9 млн",
    terrainRu: "Узкая полоса от залива на 600 км к северу",
    bordersRu: "Гана, Бенин, Буркина-Фасо",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Атаки джихадистов на севере",
    securityModelRu: "Президентская армия и портовый хаб",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "GNQ",
    capitalRu: "Малабо (новая столица — Сьюдад-де-ла-Пас)",
    populationRu: "Около 1,7 млн по официальным данным",
    terrainRu: "Вулканический остров Биоко и континентальный Рио-Муни",
    bordersRu: "Камерун и Габон; море",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Непрозрачность режима",
    securityModelRu: "Закрытая президентская гвардия нефтяной автократии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "STP",
    capitalRu: "Сан-Томе",
    populationRu: "Около 0,23 млн",
    terrainRu: "Два вулканических острова почти на экваторе",
    bordersRu: "Только море",
    naturalRiskRu: "Наводнения",
    primaryThreatRu: "Пиратство Гвинейского залива",
    securityModelRu: "Полиция и береговая охрана вместо армии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
];

/** Паспорта стран волны data5: Африка (Восточная и Южная). */
export const COUNTRY_PASSPORTS_AFRICA_EAST_SOUTH: readonly CountryRegionalPassport[] = [
  {
    iso3: "BDI",
    capitalRu: "Гитега (экономическая — Бужумбура)",
    populationRu: "Около 13 млн",
    terrainRu: "Холмистое плато у озера Танганьика",
    bordersRu: "Руанда, Танзания, ДРК через озеро",
    naturalRiskRu: "Наводнения и оползни",
    primaryThreatRu: "Трения с Руандой",
    securityModelRu: "Армия как экспортёр контингентов",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "COM",
    capitalRu: "Морони",
    populationRu: "Около 0,87 млн",
    terrainRu: "Вулканические острова Мозамбикского пролива",
    bordersRu: "Только море; Майотта — спор с Францией",
    naturalRiskRu: "Вулкан Картала и циклоны",
    primaryThreatRu: "Переворотность и бедность институтов",
    securityModelRu: "Символические силы при французском фоне Майотты",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "DJI",
    capitalRu: "Джибути",
    populationRu: "Около 1,1 млн",
    terrainRu: "Вулканическая пустыня у Баб-эль-Мандеба, озеро Ассаль — низшая точка Африки",
    bordersRu: "Эритрея, Эфиопия, Сомали",
    naturalRiskRu: "Засуха и жара",
    primaryThreatRu: "Долг и конкуренция арендаторов баз",
    securityModelRu: "Продажа географии всем державам сразу",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "ERI",
    capitalRu: "Асмэра",
    populationRu: "Оценочно 3,7 млн; переписи нет",
    terrainRu: "Высокогорье и красноморское побережье",
    bordersRu: "Судан, Эфиопия, Джибути",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "Собственный режим как источник региональной войны",
    securityModelRu: "Тотальная милитаризация без публикации данных",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SWZ",
    capitalRu: "Мбабане (королевская — Лобамба)",
    populationRu: "Около 1,2 млн",
    terrainRu: "Горы запада и низменность востока без выхода к морю",
    bordersRu: "ЮАР и Мозамбик",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "Социальный протест против монархии",
    securityModelRu: "Армия как опора абсолютной монархии",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "LSO",
    capitalRu: "Масеру",
    populationRu: "Около 2,3 млн",
    terrainRu: "Единственная страна мира целиком выше 1 000 м",
    bordersRu: "Только ЮАР со всех сторон",
    naturalRiskRu: "Засухи и морозы",
    primaryThreatRu: "Армия как политический игрок",
    securityModelRu: "Анклавная армия под давлением реформ SADC",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MDG",
    capitalRu: "Антананариву",
    populationRu: "Около 30 млн",
    terrainRu: "Четвёртый остров мира: высокогорье центра, засушливый юг",
    bordersRu: "Только море",
    naturalRiskRu: "Циклоны и засухи юга",
    primaryThreatRu: "Сельские банды дахало и бедность",
    securityModelRu: "Армия и жандармерия против внутренней небезопасности",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MWI",
    capitalRu: "Лилонгве",
    populationRu: "Около 21 млн",
    terrainRu: "Рифтовая долина и озеро Ньяса",
    bordersRu: "Танзания, Мозамбик, Замбия",
    naturalRiskRu: "Циклоны («Фредди» 2023 года)",
    primaryThreatRu: "Климат и продовольствие",
    securityModelRu: "Миротворческая армия без внешних врагов",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "MUS",
    capitalRu: "Порт-Луи",
    populationRu: "Около 1,26 млн",
    terrainRu: "Вулканический остров и архипелаг Чагос (спор завершён)",
    bordersRu: "Только море",
    naturalRiskRu: "Циклоны",
    primaryThreatRu: "Наркотранзит",
    securityModelRu: "Без армии: специальная мобильная полиция",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "RWA",
    capitalRu: "Кигали",
    populationRu: "Около 14 млн",
    terrainRu: "«Страна тысячи холмов» у Великих озёр",
    bordersRu: "Уганда, Танзания, Бурунди, ДРК",
    naturalRiskRu: "Оползни и наводнения",
    primaryThreatRu: "Война в восточной ДРК и её ответные риски",
    securityModelRu: "Самая дисциплинированная армия малых стран Африки",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SYC",
    capitalRu: "Виктория",
    populationRu: "Около 0,12 млн",
    terrainRu: "115 островов на 1,4 млн км² ИЭЗ",
    bordersRu: "Только море",
    naturalRiskRu: "Циклоны редки; эрозия берегов",
    primaryThreatRu: "Наркотрафик в ИЭЗ",
    securityModelRu: "Малые силы обороны с антипиратским опытом",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SOM",
    capitalRu: "Могадишо",
    populationRu: "Около 18 млн",
    terrainRu: "Длиннейшее побережье материковой Африки, засушливый север",
    bordersRu: "Эфиопия, Кения, Джибути",
    naturalRiskRu: "Засухи и голод",
    primaryThreatRu: "Аш-Шабааб как параллельное государство",
    securityModelRu: "Армия, собираемая внешними донорами по частям",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "SSD",
    capitalRu: "Джуба",
    populationRu: "Около 11 млн",
    terrainRu: "Нильские болота Судд и саванны без выхода к морю",
    bordersRu: "Шесть соседей, включая воюющий Судан",
    naturalRiskRu: "Наводнения Судда",
    primaryThreatRu: "Возобновление гражданской войны",
    securityModelRu: "Две армии одного соглашения о мире",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "UGA",
    capitalRu: "Кампала",
    populationRu: "Около 48 млн",
    terrainRu: "Плато Великих озёр, горы Рувензори",
    bordersRu: "Пять соседей; фронты — ДРК и Южный Судан рядом",
    naturalRiskRu: "Наводнения и оползни",
    primaryThreatRu: "ADF и восточноконголезский комплекс",
    securityModelRu: "Армия-предприниматель региональной безопасности",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "BWA",
    capitalRu: "Габороне",
    populationRu: "Около 2,7 млн",
    terrainRu: "Калахари — 70% территории, дельта Окаванго",
    bordersRu: "ЮАР, Намибия, Зимбабве, Замбия",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "Отсутствует военная; риск — алмазный рынок",
    securityModelRu: "Образцовые силы обороны на алмазной ренте",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "NAM",
    capitalRu: "Виндхук",
    populationRu: "Около 3 млн",
    terrainRu: "Пустыни Намиб и Калахари, плато центра",
    bordersRu: "Ангола, Замбия, Ботсвана, ЮАР",
    naturalRiskRu: "Экстремальные засухи",
    primaryThreatRu: "Безработица и засуха",
    securityModelRu: "Стабильная пост-освободительная армия",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "ZMB",
    capitalRu: "Лусака",
    populationRu: "Около 20 млн",
    terrainRu: "Плато Медного пояса, долины Замбези и Луангвы",
    bordersRu: "Восемь соседей — транзитный рекорд региона",
    naturalRiskRu: "Засухи (энергокризис 2024 года)",
    primaryThreatRu: "Долг и климат",
    securityModelRu: "Мирная армия транзитного государства",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
  {
    iso3: "ZWE",
    capitalRu: "Хараре",
    populationRu: "Около 16 млн",
    terrainRu: "Высокое плато между Замбези и Лимпопо",
    bordersRu: "Пять соседей",
    naturalRiskRu: "Засухи",
    primaryThreatRu: "Преемственность власти и экономика",
    securityModelRu: "Армия как арбитр политики",
    provenance: { source: "CIA World Factbook", year: 2024, estimated: true },
  },
];

/** Все паспорта стран волны data5 одним списком. */
export const ALL_COUNTRY_PASSPORTS: readonly CountryRegionalPassport[] = [
  ...COUNTRY_PASSPORTS_EURASIA,
  ...COUNTRY_PASSPORTS_AMERICAS_OCEANIA,
  ...COUNTRY_PASSPORTS_AFRICA_WEST_CENTRAL,
  ...COUNTRY_PASSPORTS_AFRICA_EAST_SOUTH,
];

/** Паспорт страны по коду ISO3; undefined, если записи нет. */
export function countryPassport(iso3: string): CountryRegionalPassport | undefined {
  return ALL_COUNTRY_PASSPORTS.find((entry) => entry.iso3 === iso3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Реестры: организации, миротворчество, эмбарго, оборонные договоры
// ─────────────────────────────────────────────────────────────────────────────

/** Региональная организация безопасности, значимая для стран волны data5. */
export interface RegionalOrganizationEntry {
  /** Название (рус.). */
  nameRu: string;
  /** Тип организации (рус.). */
  typeRu: string;
  /** Роль в безопасности региона (рус.). */
  roleRu: string;
  /** Члены из волны data5 (коды ISO3). */
  data5MembersIso3: readonly string[];
  /** Ограничение организации (рус.). */
  limitationRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Реестр региональных организаций безопасности стран волны data5. */
export const REGIONAL_ORGANIZATIONS: readonly RegionalOrganizationEntry[] = [
  {
    nameRu: "ЭКОВАС",
    typeRu: "Экономическое сообщество и механизм коллективной безопасности Западной Африки",
    roleRu: "Резервные силы, миссии (Гамбия), угрозы интервенций (Нигер, 2023)",
    data5MembersIso3: ["BEN", "BFA", "CPV", "CIV", "GMB", "GHA", "GIN", "GNB", "LBR", "MLI", "NER", "SEN", "SLE", "TGO"],
    limitationRu: "Выход Мали, Буркина-Фасо и Нигера (AES) расколол организацию",
    provenance: { source: "ЭКОВАС", year: 2024, estimated: false },
  },
  {
    nameRu: "Альянс государств Сахеля (AES)",
    typeRu: "Конфедерация военных режимов Мали, Буркина-Фасо и Нигера (2023–2024)",
    roleRu: "Совместные силы против джихадизма, координация с российским Африканским корпусом",
    data5MembersIso3: ["MLI", "BFA", "NER"],
    limitationRu: "Нет признанных успехов против JNIM; изоляция от побережья",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "SADC",
    typeRu: "Сообщество развития Юга Африки",
    roleRu: "Миссии в Мозамбике и ДРК, давление реформ на Лесото",
    data5MembersIso3: ["BWA", "LSO", "MWI", "NAM", "SWZ", "ZMB", "ZWE", "MDG", "COD"],
    limitationRu: "Решения медленны, гегемон ЮАР перегружен собственными проблемами",
    provenance: { source: "SADC", year: 2024, estimated: false },
  },
  {
    nameRu: "Восточноафриканское сообщество (EAC)",
    typeRu: "Интеграционный блок с оборонным протоколом",
    roleRu: "Региональные силы в ДРК (2022–2023), координация армий Великих озёр",
    data5MembersIso3: ["BDI", "RWA", "SSD", "UGA", "SOM", "COD"],
    limitationRu: "Члены блока воюют друг с другом прокси в ДРК",
    provenance: { source: "EAC", year: 2024, estimated: false },
  },
  {
    nameRu: "CEEAC",
    typeRu: "Экономическое сообщество Центральной Африки",
    roleRu: "Слабый безопасностный механизм при сильных президентах",
    data5MembersIso3: ["CMR", "CAF", "TCD", "COG", "COD", "GAB", "GNQ", "STP"],
    limitationRu: "Фактическую безопасность региона производят билатеральные сделки",
    provenance: { source: "CEEAC", year: 2024, estimated: false },
  },
  {
    nameRu: "Региональная система безопасности (RSS)",
    typeRu: "Договор коллективной безопасности восточных Карибов (1982)",
    roleRu: "Совместные операции, реагирование на кризисы и стихии малых островов",
    data5MembersIso3: ["ATG", "BRB", "DMA", "GRD", "KNA", "LCA", "VCT"],
    limitationRu: "Нет морских сил уровня наркотранзита; зависимость от США и Великобритании",
    provenance: { source: "RSS", year: 2024, estimated: false },
  },
  {
    nameRu: "КАРИКОМ (IMPACS)",
    typeRu: "Карибское сообщество и его агентство безопасности",
    roleRu: "Координация против банд и трафика, поддержка миссии на Гаити",
    data5MembersIso3: ["BHS", "BRB", "BLZ", "DOM", "GRD", "GUY", "HTI", "JAM", "SUR", "TTO", "ATG", "DMA", "KNA", "LCA", "VCT"],
    limitationRu: "Ресурсы несопоставимы с масштабом гаитянского кризиса",
    provenance: { source: "КАРИКОМ", year: 2024, estimated: false },
  },
  {
    nameRu: "ОДКБ",
    typeRu: "Организация Договора о коллективной безопасности",
    roleRu: "Российские базы в Кыргызстане и Таджикистане, КСОР",
    data5MembersIso3: ["KGZ", "TJK"],
    limitationRu: "Не вмешалась в кыргызско-таджикские войны своих же членов",
    provenance: { source: "ОДКБ", year: 2024, estimated: false },
  },
  {
    nameRu: "НАТО (для малых членов волны)",
    typeRu: "Североатлантический альянс",
    roleRu: "Заменяет национальные армии Албании, Исландии, Люксембурга, Черногории, Северной Македонии и Словении",
    data5MembersIso3: ["ALB", "ISL", "LUX", "MNE", "MKD", "SVN"],
    limitationRu: "Малые члены вносят нишевой, а не массовый вклад",
    provenance: { source: "НАТО", year: 2024, estimated: false },
  },
  {
    nameRu: "Тихоокеанский форум (PIF) и Божский процесс",
    typeRu: "Региональная архитектура безопасности Океании",
    roleRu: "Декларации Бикетава и Боэ: коллективные ответы на кризисы и климат",
    data5MembersIso3: ["FJI", "PNG", "KIR", "MHL", "FSM", "PLW", "WSM", "SLB", "TON", "TUV", "VUT"],
    limitationRu: "Нет собственных сил: реализация — Австралия и Новая Зеландия",
    provenance: { source: "PIF", year: 2024, estimated: false },
  },
  {
    nameRu: "УЭМОА / WAEMU",
    typeRu: "Западноафриканский экономический и валютный союз",
    roleRu: "Финансовая рамка оборонных расходов франкоязычного побережья",
    data5MembersIso3: ["BEN", "BFA", "CIV", "MLI", "NER", "SEN", "TGO"],
    limitationRu: "Безопасностной компетенции почти нет",
    provenance: { source: "WAEMU", year: 2024, estimated: false },
  },
  {
    nameRu: "Африканский союз (Архитектура мира и безопасности)",
    typeRu: "Континентальная система с Советом мира и безопасности",
    roleRu: "Миссии в Сомали (ATMIS/AUSSOM), санкции за перевороты",
    data5MembersIso3: ["BFA", "MLI", "NER", "GIN", "GAB", "SOM", "SSD"],
    limitationRu: "Финансирование миссий зависит от ООН и ЕС",
    provenance: { source: "Африканский союз", year: 2024, estimated: false },
  },
];

/** Миротворческая или стабилизационная операция в стране волны data5. */
export interface PeaceOperationEntry {
  /** Название операции (рус.). */
  nameRu: string;
  /** Страна проведения (название, рус.). */
  hostRu: string;
  /** Код ISO3 страны проведения. */
  hostIso3: string;
  /** Мандат и оператор (рус.). */
  mandateRu: string;
  /** Статус на 2024 год (рус.). */
  statusRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Реестр миротворческих и стабилизационных операций в странах волны data5. */
export const PEACE_OPERATIONS: readonly PeaceOperationEntry[] = [
  {
    nameRu: "ATMIS → AUSSOM",
    hostRu: "Сомали",
    hostIso3: "SOM",
    mandateRu: "Африканский союз при поддержке ООН: война с Аш-Шабааб и передача функций сомалийской армии",
    statusRu: "Переформатирование с 2025 года при недофинансировании",
    provenance: { source: "Африканский союз; ООН", year: 2024, estimated: false },
  },
  {
    nameRu: "МООНСДРК (MONUSCO)",
    hostRu: "Демократическая Республика Конго",
    hostIso3: "COD",
    mandateRu: "Крупнейшая миссия ООН: защита гражданских на востоке",
    statusRu: "Поэтапный вывод по требованию Киншасы на фоне наступления M23",
    provenance: { source: "ООН", year: 2024, estimated: false },
  },
  {
    nameRu: "МИНУСКА (MINUSCA)",
    hostRu: "Центральноафриканская Республика",
    hostIso3: "CAF",
    mandateRu: "ООН: стабилизация и защита гражданских",
    statusRu: "Действует; сосуществует с российским присутствием",
    provenance: { source: "ООН", year: 2024, estimated: false },
  },
  {
    nameRu: "МООНЮС (UNMISS)",
    hostRu: "Южный Судан",
    hostIso3: "SSD",
    mandateRu: "ООН: защита гражданских и поддержка мирного соглашения",
    statusRu: "Действует; мандат под давлением эрозии соглашения",
    provenance: { source: "ООН", year: 2024, estimated: false },
  },
  {
    nameRu: "EUFOR Althea",
    hostRu: "Босния и Герцеговина",
    hostIso3: "BIH",
    mandateRu: "ЕС при поддержке НАТО: исполнительный мандат Дейтона",
    statusRu: "Действует; усилена резервом после 2022 года",
    provenance: { source: "EUFOR", year: 2024, estimated: false },
  },
  {
    nameRu: "KFOR",
    hostRu: "Косово",
    hostIso3: "XKX",
    mandateRu: "НАТО: безопасная среда и свобода передвижения",
    statusRu: "Действует; усилена после инцидентов 2023 года",
    provenance: { source: "НАТО", year: 2024, estimated: false },
  },
  {
    nameRu: "UNFICYP",
    hostRu: "Кипр",
    hostIso3: "CYP",
    mandateRu: "ООН: буферная зона с 1964/1974 годов",
    statusRu: "Одна из старейших миссий мира; статус-кво",
    provenance: { source: "ООН", year: 2024, estimated: false },
  },
  {
    nameRu: "MSS (Гаити)",
    hostRu: "Гаити",
    hostIso3: "HTI",
    mandateRu: "Многонациональная миссия под руководством Кении, уполномочена СБ ООН",
    statusRu: "Развёртывание с 2024 года при нехватке финансирования",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
  {
    nameRu: "ECOMIG",
    hostRu: "Гамбия",
    hostIso3: "GMB",
    mandateRu: "ЭКОВАС: гарантия перехода власти 2017 года",
    statusRu: "Сокращённый контингент сохраняется",
    provenance: { source: "ЭКОВАС", year: 2024, estimated: false },
  },
  {
    nameRu: "Многонациональные силы бассейна озера Чад (MNJTF)",
    hostRu: "Чад и соседи",
    hostIso3: "TCD",
    mandateRu: "Нигерия, Нигер, Чад, Камерун, Бенин против «Боко Харам» и ИГ-ЗА",
    statusRu: "Действует с переменным успехом",
    provenance: { source: "Комиссия бассейна озера Чад", year: 2024, estimated: false },
  },
  {
    nameRu: "Региональные силы EAC в ДРК (завершена)",
    hostRu: "Демократическая Республика Конго",
    hostIso3: "COD",
    mandateRu: "Восточноафриканское сообщество: буфер против M23",
    statusRu: "Выведена в 2023 году по требованию Киншасы, заменена силами SADC",
    provenance: { source: "EAC", year: 2024, estimated: false },
  },
  {
    nameRu: "Силы SADC в ДРК (SAMIDRC)",
    hostRu: "Демократическая Республика Конго",
    hostIso3: "COD",
    mandateRu: "ЮАР, Танзания, Малави на стороне FARDC против M23",
    statusRu: "Развёрнута с конца 2023 года; тяжёлые потери в 2025 году",
    provenance: { source: "SADC", year: 2024, estimated: false },
  },
];

/** Оружейное эмбарго или режим ограничений, затрагивающий страну волны. */
export interface ArmsEmbargoEntry {
  /** Страна (название, рус.). */
  countryRu: string;
  /** Код ISO3. */
  iso3: string;
  /** Источник эмбарго (рус.). */
  authorityRu: string;
  /** Характер ограничений (рус.). */
  scopeRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Реестр оружейных эмбарго и ограничений по странам волны data5. */
export const ARMS_EMBARGOES: readonly ArmsEmbargoEntry[] = [
  {
    countryRu: "Сомали",
    iso3: "SOM",
    authorityRu: "Совет Безопасности ООН",
    scopeRu: "Эмбарго 1992 года частично снято в 2023 году: правительство может закупать с уведомлениями, Аш-Шабааб — под полным запретом",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
  {
    countryRu: "Южный Судан",
    iso3: "SSD",
    authorityRu: "Совет Безопасности ООН",
    scopeRu: "Оружейное эмбарго с 2018 года, продлевается ежегодно при спорах о бенчмарках",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
  {
    countryRu: "Центральноафриканская Республика",
    iso3: "CAF",
    authorityRu: "Совет Безопасности ООН",
    scopeRu: "Эмбарго с 2013 года смягчено до режима уведомлений для правительства к 2024 году",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
  {
    countryRu: "Демократическая Республика Конго",
    iso3: "COD",
    authorityRu: "Совет Безопасности ООН",
    scopeRu: "Эмбарго на негосударственные группы востока; правительственные закупки — по уведомлениям",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
  {
    countryRu: "Мали",
    iso3: "MLI",
    authorityRu: "ЭКОВАС (исторически) и санкционные режимы ЕС/США",
    scopeRu: "Санкции за перевороты 2020–2021 годов сняты после графика перехода; персональные меры Запада частично действуют",
    provenance: { source: "ЭКОВАС; ЕС", year: 2024, estimated: false },
  },
  {
    countryRu: "Буркина-Фасо и Нигер",
    iso3: "BFA",
    authorityRu: "ЭКОВАС",
    scopeRu: "Санкции за перевороты 2022–2023 годов; Нигер — жёсткий пакет до выхода страны из сообщества",
    provenance: { source: "ЭКОВАС", year: 2024, estimated: false },
  },
  {
    countryRu: "Гвинея-Бисау и Гвинея",
    iso3: "GNB",
    authorityRu: "ЕС и Африканский союз",
    scopeRu: "Периодические персональные санкции за перевороты; системного оружейного эмбарго нет",
    provenance: { source: "ЕС; АС", year: 2024, estimated: false },
  },
  {
    countryRu: "Афганистан",
    iso3: "AFG",
    authorityRu: "Совет Безопасности ООН (режим 1988)",
    scopeRu: "Персональные и финансовые санкции против талибов; оружейные поставки режиму политически заблокированы непризнанием",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
  {
    countryRu: "Эритрея",
    iso3: "ERI",
    authorityRu: "Совет Безопасности ООН (исторически)",
    scopeRu: "Эмбарго 2009 года снято в 2018 году; ограничения де-факто сохраняются через экспортный контроль поставщиков",
    provenance: { source: "СБ ООН", year: 2024, estimated: false },
  },
];

/** Оборонный договор или соглашение, определяющее безопасность страны волны. */
export interface DefenseTreatyEntry {
  /** Страна волны data5 (название, рус.). */
  countryRu: string;
  /** Код ISO3. */
  iso3: string;
  /** Партнёр по договору (рус.). */
  partnerRu: string;
  /** Суть обязательства (рус.). */
  essenceRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Реестр ключевых оборонных договоров стран волны data5. */
export const DEFENSE_TREATIES: readonly DefenseTreatyEntry[] = [
  {
    countryRu: "Маршалловы Острова",
    iso3: "MHL",
    partnerRu: "США",
    essenceRu: "COFA: оборона — США, стратегический отказ третьим странам, полигон Кваджалейн",
    provenance: { source: "Текст COFA", year: 2024, estimated: false },
  },
  {
    countryRu: "Микронезия",
    iso3: "FSM",
    partnerRu: "США",
    essenceRu: "COFA: оборона — США, обновлённое финансирование 2023–2024 годов",
    provenance: { source: "Текст COFA", year: 2024, estimated: false },
  },
  {
    countryRu: "Палау",
    iso3: "PLW",
    partnerRu: "США",
    essenceRu: "COFA: оборона — США, право на объекты типа РЛС TACMOR",
    provenance: { source: "Текст COFA", year: 2024, estimated: false },
  },
  {
    countryRu: "Тувалу",
    iso3: "TUV",
    partnerRu: "Австралия",
    essenceRu: "Союз Фалепили (2023): безопасность, климатическая мобильность, вето на чужие безопасностные сделки",
    provenance: { source: "Текст союза Фалепили", year: 2023, estimated: false },
  },
  {
    countryRu: "Самоа",
    iso3: "WSM",
    partnerRu: "Новая Зеландия",
    essenceRu: "Договор о дружбе 1962 года: консультации и помощь в безопасности",
    provenance: { source: "Правительство Новой Зеландии", year: 2024, estimated: false },
  },
  {
    countryRu: "Бутан",
    iso3: "BTN",
    partnerRu: "Индия",
    essenceRu: "Договор 2007 года: тесная координация безопасности, IMTRAT, оборона де-факто совместно",
    provenance: { source: "Правительство Индии", year: 2024, estimated: false },
  },
  {
    countryRu: "Мальдивы",
    iso3: "MDV",
    partnerRu: "Индия (с пересмотрами)",
    essenceRu: "Гидрография, патрулирование и обучение при политической ревизии присутствия после 2023 года",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    countryRu: "Исландия",
    iso3: "ISL",
    partnerRu: "США и НАТО",
    essenceRu: "Договор 1951 года и членство в НАТО: противовоздушная оборона — союзники",
    provenance: { source: "НАТО", year: 2024, estimated: false },
  },
  {
    countryRu: "Монако",
    iso3: "MCO",
    partnerRu: "Франция",
    essenceRu: "Договор 2002 года: Франция гарантирует целостность княжества",
    provenance: { source: "Правительство Франции", year: 2024, estimated: false },
  },
  {
    countryRu: "Андорра",
    iso3: "AND",
    partnerRu: "Франция и Испания",
    essenceRu: "Институт соправителей: президент Франции и епископ Урхельский — гаранты устройства",
    provenance: { source: "Конституция Андорры", year: 2024, estimated: false },
  },
  {
    countryRu: "Восточный Тимор",
    iso3: "TLS",
    partnerRu: "Австралия",
    essenceRu: "Программа оборонного сотрудничества и морская граница 2018 года",
    provenance: { source: "Правительство Австралии", year: 2024, estimated: false },
  },
  {
    countryRu: "Папуа — Новая Гвинея",
    iso3: "PNG",
    partnerRu: "Австралия и США",
    essenceRu: "Оборонные соглашения 2023 года: сотрудничество и доступ к объектам, включая Ломбрум",
    provenance: { source: "Правительства Австралии и США", year: 2023, estimated: false },
  },
  {
    countryRu: "Фиджи",
    iso3: "FJI",
    partnerRu: "Австралия",
    essenceRu: "Партнёрство Vuvale и оборонное сотрудничество, включая миротворческую подготовку",
    provenance: { source: "Правительство Австралии", year: 2024, estimated: false },
  },
  {
    countryRu: "Соломоновы Острова",
    iso3: "SLB",
    partnerRu: "Китай",
    essenceRu: "Соглашение о безопасности 2022 года: полицейское сотрудничество, возможность визитов кораблей",
    provenance: { source: "Открытые источники (утечка текста)", year: 2022, estimated: false },
  },
  {
    countryRu: "Кирибати",
    iso3: "KIR",
    partnerRu: "Китай",
    essenceRu: "Полицейское сотрудничество после восстановления дипотношений в 2019 году",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    countryRu: "Таджикистан",
    iso3: "TJK",
    partnerRu: "Россия и ОДКБ",
    essenceRu: "201-я база до 2042 года, коллективная оборона по ОДКБ",
    provenance: { source: "ОДКБ", year: 2024, estimated: false },
  },
  {
    countryRu: "Кыргызстан",
    iso3: "KGZ",
    partnerRu: "Россия и ОДКБ",
    essenceRu: "Объединённая база с авиабазой Кант; помощь при угрозах по линии ОДКБ",
    provenance: { source: "ОДКБ", year: 2024, estimated: false },
  },
  {
    countryRu: "Кыргызстан и Таджикистан",
    iso3: "KGZ",
    partnerRu: "Двусторонний процесс",
    essenceRu: "Договор о границе 2025 года: первая попытка закрыть главный конфликт региона юридически",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    countryRu: "Бахрейн",
    iso3: "BHR",
    partnerRu: "США и Саудовская Аравия",
    essenceRu: "Базирование 5-го флота и фактический саудовский зонтик с 2011 года",
    provenance: { source: "ВМС США", year: 2024, estimated: false },
  },
  {
    countryRu: "Гайана",
    iso3: "GUY",
    partnerRu: "США",
    essenceRu: "Соглашения о сотрудничестве в безопасности и учения на фоне спора об Эссекибо",
    provenance: { source: "SOUTHCOM", year: 2024, estimated: false },
  },
];

/** Организации, в которых состоит страна волны (по реестру организаций). */
export function organizationsForCountry(iso3: string): readonly RegionalOrganizationEntry[] {
  return REGIONAL_ORGANIZATIONS.filter((entry) =>
    entry.data5MembersIso3.includes(iso3),
  );
}

/** Миротворческие операции в стране волны по коду. */
export function peaceOperationsForHost(iso3: string): readonly PeaceOperationEntry[] {
  return PEACE_OPERATIONS.filter((entry) => entry.hostIso3 === iso3);
}

/** Оборонные договоры страны волны по коду. */
export function defenseTreatiesForCountry(iso3: string): readonly DefenseTreatyEntry[] {
  return DEFENSE_TREATIES.filter((entry) => entry.iso3 === iso3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Реестр исторических конфликтов стран волны data5
// ─────────────────────────────────────────────────────────────────────────────

/** Исторический конфликт, сформировавший современный профиль страны. */
export interface HistoricalConflictEntry {
  /** Название конфликта (рус.). */
  nameRu: string;
  /** Годы (рус.). */
  yearsRu: string;
  /** Главная страна волны data5 (код ISO3). */
  hostIso3: string;
  /** Стороны (рус.). */
  partiesRu: string;
  /** Исход и последствия (рус.). */
  outcomeRu: string;
  /** Почему конфликт важен для сегодняшнего профиля (рус.). */
  relevanceRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Исторические конфликты стран волны: Евразия, Америки, Океания. */
export const HISTORICAL_CONFLICTS_EURASIA_AMERICAS_OCEANIA: readonly HistoricalConflictEntry[] = [
  {
    nameRu: "Афганские войны и приход талибов",
    yearsRu: "1979–2021 (советская, гражданская, американская кампании)",
    hostIso3: "AFG",
    partiesRu: "СССР, США и НАТО, Талибан, Северный альянс",
    outcomeRu: "Возврат талибов к власти в 2021 году",
    relevanceRu: "Определяет закрытый военный профиль страны и региональный риск терроризма",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Кипрский кризис и турецкая операция",
    yearsRu: "1974",
    hostIso3: "CYP",
    partiesRu: "Греция (хунта и переворот), Турция, греки- и турки-киприоты",
    outcomeRu: "Раздел острова, буферная зона ООН",
    relevanceRu: "Структурная основа всех кипрских военных расчётов до сих пор",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Боснийская война",
    yearsRu: "1992–1995",
    hostIso3: "BIH",
    partiesRu: "Боснийцы, боснийские сербы, боснийские хорваты, НАТО",
    outcomeRu: "Дейтонские соглашения, единые ВС с 2006 года, EUFOR",
    relevanceRu: "Объясняет и устройство армии, и внешнее присутствие в стране",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Косовская война",
    yearsRu: "1998–1999",
    hostIso3: "XKX",
    partiesRu: "Югославия, АОК, НАТО",
    outcomeRu: "Администрация ООН, независимость 2008 года (частичное признание), KFOR",
    relevanceRu: "Основа статуса KSF и присутствия НАТО",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Приднестровский конфликт",
    yearsRu: "1992",
    hostIso3: "MDA",
    partiesRu: "Молдова, приднестровские формирования, 14-я армия России",
    outcomeRu: "Замороженный анклав, ОГРВ и склад в Колбасне",
    relevanceRu: "Главный военный факт Молдовы три десятилетия спустя",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Кыргызско-таджикские пограничные войны",
    yearsRu: "2021–2022",
    hostIso3: "KGZ",
    partiesRu: "Кыргызстан и Таджикистан (пограничники и армии, БПЛА)",
    outcomeRu: "Десятки погибших, делимитация и договор 2024–2025 годов",
    relevanceRu: "Запустила гонку БПЛА в Центральной Азии",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Докламский кризис",
    yearsRu: "2017",
    hostIso3: "BTN",
    partiesRu: "Китай и Индия на территории, заявляемой Бутаном",
    outcomeRu: "Отвод войск без войны; Бутан начал собственные контакты с Пекином",
    relevanceRu: "Ключ к бутанской дипломатии границы",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Индонезийская оккупация Восточного Тимора",
    yearsRu: "1975–1999",
    hostIso3: "TLS",
    partiesRu: "Индонезия, ФРЕТИЛИН, миссии ООН и INTERFET",
    outcomeRu: "Референдум и независимость 2002 года",
    relevanceRu: "Источник австралийской роли гаранта и травмы, формирующей F-FDTL",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Волнения на Мальдивах и операция «Кактус»",
    yearsRu: "1988",
    hostIso3: "MDV",
    partiesRu: "Наёмники PLOTE, индийские десантники",
    outcomeRu: "Индия спасла правительство за сутки",
    relevanceRu: "Историческая основа индийской военной роли на атоллах",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданская война в Лаосе и наследие бомбардировок",
    yearsRu: "1960–1973 и последствия",
    hostIso3: "LAO",
    partiesRu: "Патет Лао, королевское правительство, США, Вьетнам",
    outcomeRu: "Коммунистическая победа 1975 года; миллионы неразорвавшихся боеприпасов",
    relevanceRu: "UXO до сих пор определяет экономику и работу армии",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Футбольная война",
    yearsRu: "1969",
    hostIso3: "HND",
    partiesRu: "Гондурас и Сальвадор",
    outcomeRu: "Сто часов боёв, тысячи погибших, мир 1980 года",
    relevanceRu: "Последняя межгосударственная война региона — мера его демилитаризации",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданские войны северного треугольника",
    yearsRu: "1960–1996 (Гватемала), 1979–1992 (Сальвадор)",
    hostIso3: "GTM",
    partiesRu: "Армии и повстанческие фронты Гватемалы и Сальвадора",
    outcomeRu: "Мирные соглашения, сокращение армий, вакуум, занятый бандами и картелями",
    relevanceRu: "Прямая генеалогия сегодняшнего бандитского насилия региона",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Американское вторжение в Панаму",
    yearsRu: "1989",
    hostIso3: "PAN",
    partiesRu: "США и режим Норьеги",
    outcomeRu: "Роспуск армии; Панама без вооружённых сил с 1990 года",
    relevanceRu: "Причина полицейской модели безопасности канала",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Американское вторжение на Гренаду",
    yearsRu: "1983",
    hostIso3: "GRD",
    partiesRu: "США и карибские союзники против революционного правительства",
    outcomeRu: "Восстановление конституционного строя, укрепление RSS",
    relevanceRu: "Прецедент коллективной безопасности восточных Карибов",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гаитянские кризисы и миссии ООН",
    yearsRu: "1994, 2004–2017 (MINUSTAH), 2024 — MSS",
    hostIso3: "HTI",
    partiesRu: "Гаитянские режимы и банды, США, ООН, Кения",
    outcomeRu: "Цикл интервенций без устойчивого государства; армия распущена в 1995 году",
    relevanceRu: "Объясняет отсутствие армии и сегодняшний распад",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Война за Эссекибо (фон)",
    yearsRu: "1899 (арбитраж) — 2023 (референдум Венесуэлы)",
    hostIso3: "GUY",
    partiesRu: "Венесуэла и Гайана при посредничестве МС ООН",
    outcomeRu: "Спор не решён; нефть подняла ставки",
    relevanceRu: "Единственный активный межгосударственный спор континента",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданская война в Суринаме",
    yearsRu: "1986–1992",
    hostIso3: "SUR",
    partiesRu: "Режим Баутерсе и «коммандос джунглей» Брунсвейка",
    outcomeRu: "Мир при армии, надолго ставшей политическим игроком",
    relevanceRu: "Фон слабости суринамских институтов",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Бугенвильский конфликт",
    yearsRu: "1988–1998",
    hostIso3: "PNG",
    partiesRu: "Папуа — Новая Гвинея и Бугенвильская революционная армия",
    outcomeRu: "Автономия и референдум 2019 года за независимость",
    relevanceRu: "Главный внутренний конфликт страны и урок пределов PNGDF",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Этническая напряжённость на Соломоновых Островах (Tension)",
    yearsRu: "1998–2003",
    hostIso3: "SLB",
    partiesRu: "Группировки Гуадалканала и Малаиты",
    outcomeRu: "Австралийская миссия RAMSI 2003–2017 годов",
    relevanceRu: "Причина, по которой безопасность страны до сих пор импортируется",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Перевороты на Фиджи",
    yearsRu: "1987, 2000, 2006",
    hostIso3: "FJI",
    partiesRu: "Армия Фиджи и гражданские правительства",
    outcomeRu: "Армия — верховный арбитр политики на десятилетия",
    relevanceRu: "Ключ к пониманию роли RFMF в регионе",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Советско-финская и холодная война в GIUK (фон Исландии)",
    yearsRu: "1949–1991 (архитектура)",
    hostIso3: "ISL",
    partiesRu: "НАТО и СССР в Северной Атлантике",
    outcomeRu: "Исландия в НАТО без армии; база Кеблавик",
    relevanceRu: "Историческая причина исландской модели безопасности",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Война в Газе и кризис палестинской государственности",
    yearsRu: "2023 — продолжается",
    hostIso3: "PSE",
    partiesRu: "Израиль, ХАМАС и другие группировки, региональные акторы",
    outcomeRu: "Не завершена; профиль ПНА переформатирован войной",
    relevanceRu: "Любые числа по Палестине устаревают быстрее винтажа проекта",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
];

/** Исторические конфликты стран волны: Африка. */
export const HISTORICAL_CONFLICTS_AFRICA: readonly HistoricalConflictEntry[] = [
  {
    nameRu: "Малийские перевороты и крах севера",
    yearsRu: "2012 — настоящее время",
    hostIso3: "MLI",
    partiesRu: "Хунты, туареги, JNIM, ИГ-Сахель, Франция, ООН, Россия",
    outcomeRu: "Выход Франции и ООН, приход Африканского корпуса, выход из ЭКОВАС",
    relevanceRu: "Точка отсчёта всего сахельского распада",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Война Буркина-Фасо с JNIM",
    yearsRu: "2015 — настоящее время",
    hostIso3: "BFA",
    partiesRu: "Армия и VDP против JNIM и ИГ-Сахель",
    outcomeRu: "Два переворота 2022 года, блокады городов, массовые жертвы",
    relevanceRu: "Крупнейший джихадистский театр мира по числу жертв",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Кризис Нигера",
    yearsRu: "2023 — настоящее время",
    hostIso3: "NER",
    partiesRu: "Хунта CNSP, ЭКОВАС, Франция, США, Россия",
    outcomeRu: "Вывод западных сил, приход российских инструкторов, выход из ЭКОВАС",
    relevanceRu: "Переломная точка западного присутствия в Сахеле",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданская война в Сомали и Аш-Шабааб",
    yearsRu: "1991 — настоящее время",
    hostIso3: "SOM",
    partiesRu: "Федеральное правительство, АС, США, Турция против Аш-Шабааб",
    outcomeRu: "Государство строится при незавершённой войне",
    relevanceRu: "Определяет весь сомалийский профиль и миссии АС",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданская война в Южном Судане",
    yearsRu: "2013–2018, тлеет",
    hostIso3: "SSD",
    partiesRu: "Силы Киира и оппозиция Машара, этнические милиции",
    outcomeRu: "Соглашение 2018 года при 400 тыс. жертв по оценкам",
    relevanceRu: "Источник эмбарго ООН и структуры «двух армий»",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Войны в Конго и конфликт M23",
    yearsRu: "1996–2003, 2012–2013, 2021 — настоящее время",
    hostIso3: "COD",
    partiesRu: "ДРК, Руанда (по обвинениям ООН), M23, Уганда, миссии ООН и SADC",
    outcomeRu: "Крупнейший конфликт Африки продолжается на востоке",
    relevanceRu: "Центр тяжести региональной безопасности Великих озёр",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Эритрейско-эфиопская война и Тыграй",
    yearsRu: "1998–2000, 2020–2022 (участие в Тыграе)",
    hostIso3: "ERI",
    partiesRu: "Эритрея и Эфиопия",
    outcomeRu: "Миллионная мобилизация Эритреи, изоляция и милитаризация общества",
    relevanceRu: "Причина бессрочной службы и закрытости данных",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданские войны ЦАР",
    yearsRu: "2012 — настоящее время",
    hostIso3: "CAF",
    partiesRu: "Правительство, коалиции повстанцев, Франция, ООН, Россия",
    outcomeRu: "Столица удерживается внешними силами, периферия оспаривается",
    relevanceRu: "Основа центафриканской модели импортированной безопасности",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Кризис «Боко Харам» в бассейне озера Чад",
    yearsRu: "2009 — настоящее время",
    hostIso3: "TCD",
    partiesRu: "Нигерия, Чад, Нигер, Камерун против «Боко Харам» и ИГ-ЗА",
    outcomeRu: "MNJTF сдерживает, но не уничтожает угрозу",
    relevanceRu: "Формирует армии Чада и Камеруна и север Нигера",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Англоязычный кризис Камеруна",
    yearsRu: "2016 — настоящее время",
    hostIso3: "CMR",
    partiesRu: "Правительство и амбазонские сепаратисты",
    outcomeRu: "Тысячи погибших, сотни тысяч перемещённых",
    relevanceRu: "Второй фронт страны наряду с севером",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Ивуарийские гражданские войны",
    yearsRu: "2002–2007, 2010–2011",
    hostIso3: "CIV",
    partiesRu: "Север и юг, Франция, ООН",
    outcomeRu: "Реинтеграция армии при сохраняющемся северном вопросе",
    relevanceRu: "Фон нынешней северной военной политики Абиджана",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гражданские войны Либерии и Сьерра-Леоне",
    yearsRu: "1989–2003, 1991–2002",
    hostIso3: "LBR",
    partiesRu: "Режимы, RUF, ЭКОВАС, ООН, Великобритания",
    outcomeRu: "Полное разоружение и пересборка армий под внешним контролем",
    relevanceRu: "Эталон постконфликтной реформы сектора безопасности",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Казамансский конфликт",
    yearsRu: "1982 — тлеет",
    hostIso3: "SEN",
    partiesRu: "Сенегал и MFDC",
    outcomeRu: "Частичные соглашения, низкая интенсивность",
    relevanceRu: "Единственный сепаратистский фронт страны-образца",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Бурундийские кризисы и война в ДРК (фон)",
    yearsRu: "1993–2005, 2015",
    hostIso3: "BDI",
    partiesRu: "Хуту и тутси группировки, региональные армии",
    outcomeRu: "Армия как интегрированная постконфликтная структура и экспортёр войск",
    relevanceRu: "Объясняет и состав армии, и её внешнюю активность",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Геноцид в Руанде и его войны-последствия",
    yearsRu: "1994 и далее",
    hostIso3: "RWA",
    partiesRu: "RPF, режим Хабьяриманы, региональные акторы Конго",
    outcomeRu: "Военизированное государство развития с экспедиционной армией",
    relevanceRu: "Ключ ко всей руандийской военной модели",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Операция Уганды против ADF и ЛРА (фон)",
    yearsRu: "1996 — настоящее время",
    hostIso3: "UGA",
    partiesRu: "UPDF против «Господней армии сопротивления» и ADF",
    outcomeRu: "Экспедиционная культура армии и операция «Шуджа» в ДРК",
    relevanceRu: "Источник угандийского военного предпринимательства",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Переворот в Габоне",
    yearsRu: "2023",
    hostIso3: "GAB",
    partiesRu: "Республиканская гвардия против династии Бонго",
    outcomeRu: "Переходный режим и выборы при ревизии связей с Францией",
    relevanceRu: "Текущий политический статус армии страны",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Кризис в Гамбии",
    yearsRu: "2016–2017",
    hostIso3: "GMB",
    partiesRu: "Режим Джамме, ЭКОВАС",
    outcomeRu: "Военная демонстрация ЭКОВАС без боёв, ECOMIG в стране",
    relevanceRu: "Прецедент коллективного принуждения в Западной Африке",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Война Мозамбика в Кабу-Делгаду (региональный фон)",
    yearsRu: "2017 — настоящее время",
    hostIso3: "MWI",
    partiesRu: "Мозамбик, Руанда, SADC против ИГ-Мозамбик",
    outcomeRu: "Соседние страны юга Африки втянуты контингентами",
    relevanceRu: "Единственный джихадистский фронт южного региона",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Пиратство у берегов Сомали (пик)",
    yearsRu: "2008–2012",
    hostIso3: "SYC",
    partiesRu: "Сомалийские пираты против коалиций ЕС, НАТО и национальных ВМС",
    outcomeRu: "Подавлено патрулями; Сейшелы получили опыт и инфраструктуру",
    relevanceRu: "Источник сейшельской морской компетенции",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
];

/** Все исторические конфликты волны data5 одним списком. */
export const ALL_HISTORICAL_CONFLICTS: readonly HistoricalConflictEntry[] = [
  ...HISTORICAL_CONFLICTS_EURASIA_AMERICAS_OCEANIA,
  ...HISTORICAL_CONFLICTS_AFRICA,
];

/** Конфликты, связанные с конкретной страной волны. */
export function historicalConflictsForCountry(
  iso3: string,
): readonly HistoricalConflictEntry[] {
  return ALL_HISTORICAL_CONFLICTS.filter((entry) => entry.hostIso3 === iso3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Реестр качества данных по странам волны data5
// ─────────────────────────────────────────────────────────────────────────────

/** Оценка качества данных одного профиля волны. */
export interface CountryDataQualityEntry {
  /** Код ISO3. */
  iso3: string;
  /** Уровень доверия данным (рус.): высокое / среднее / низкое. */
  confidenceRu: string;
  /** Главный пробел или оговорка данных (рус.). */
  gapRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Качество данных: Азия, Европа, Ближний Восток. */
export const DATA_QUALITY_EURASIA: readonly CountryDataQualityEntry[] = [
  { iso3: "AFG", confidenceRu: "низкое", gapRu: "Режим не публикует бюджет; состав армии — оценки по открытым источникам", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BHR", confidenceRu: "высокое", gapRu: "SIPRI публикует ряд; скрыты детали закупок у США", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BTN", confidenceRu: "среднее", gapRu: "Бюджет частично закрыт; состав — оценки IISS", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BRN", confidenceRu: "среднее", gapRu: "Расходы публикуются агрегированно, детализация слабая", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "LAO", confidenceRu: "низкое", gapRu: "Официальной разбивки нет; китайские поставки не раскрываются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MDV", confidenceRu: "среднее", gapRu: "Малые числа, но публикации нерегулярны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TLS", confidenceRu: "среднее", gapRu: "Бюджет открыт, исполнение и внебюджетные потоки непрозрачны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "PHI", confidenceRu: "высокое", gapRu: "Алиас: качество данных определяется профилем PHL волны data3", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "KGZ", confidenceRu: "среднее", gapRu: "Бюджет публикуется, закупки БПЛА раскрыты частично", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TJK", confidenceRu: "низкое", gapRu: "Внебюджетная помощь доноров не сводится в открытую картину", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TKM", confidenceRu: "низкое", gapRu: "Полная закрытость: все числа — внешние оценки и парадная аналитика", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "ALB", confidenceRu: "высокое", gapRu: "Отчётность НАТО открыта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "AND", confidenceRu: "высокое", gapRu: "Данных мало, потому что армии нет: пробел — факт, а не дефект", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "BIH", confidenceRu: "высокое", gapRu: "Отчётность открыта; расходятся оценки минной обстановки", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CYP", confidenceRu: "среднее", gapRu: "Север острова не отчитывается; состав турецкого контингента — оценки", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "ISL", confidenceRu: "высокое", gapRu: "Береговая охрана публикует данные; армии нет", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "IRL", confidenceRu: "высокое", gapRu: "Полная парламентская отчётность", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "LIE", confidenceRu: "высокое", gapRu: "Армии нет с 1868 года: профиль — юридический факт", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "LUX", confidenceRu: "высокое", gapRu: "Отчётность НАТО открыта, включая космические программы", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "MNE", confidenceRu: "высокое", gapRu: "Отчётность НАТО открыта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MKD", confidenceRu: "высокое", gapRu: "Отчётность НАТО открыта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SVN", confidenceRu: "высокое", gapRu: "Отчётность НАТО открыта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CHE", confidenceRu: "высокое", gapRu: "Детальная публичная отчётность милиционной системы", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "MDA", confidenceRu: "среднее", gapRu: "Приднестровская группировка и склады оцениваются только извне", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MCO", confidenceRu: "высокое", gapRu: "Армии нет: данные о карабинерах открыты", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "SMR", confidenceRu: "высокое", gapRu: "Церемониальные корпуса: данные символичны и открыты", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "MLT", confidenceRu: "высокое", gapRu: "Отчётность ЕС открыта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "XKX", confidenceRu: "среднее", gapRu: "Статус территории влияет на отчётность; данные сербских муниципалитетов недоступны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "PSE", confidenceRu: "низкое", gapRu: "Война в Газе: любые числа быстро устаревают, отчётности единого государства нет", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
];

/** Качество данных: Америки и Океания. */
export const DATA_QUALITY_AMERICAS_OCEANIA: readonly CountryDataQualityEntry[] = [
  { iso3: "ATG", confidenceRu: "среднее", gapRu: "Публикации эпизодичны, опираемся на RSS и IISS", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BHS", confidenceRu: "среднее", gapRu: "RBDF отчитывается, детализация закупок слабая", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BRB", confidenceRu: "среднее", gapRu: "Малые числа при нерегулярной отчётности", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BLZ", confidenceRu: "среднее", gapRu: "Оценки IISS при скудной национальной статистике", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CRI", confidenceRu: "высокое", gapRu: "Полицейские бюджеты открыты, армии нет", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "DMA", confidenceRu: "среднее", gapRu: "Микроданные полиции публикуются нерегулярно", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "DOM", confidenceRu: "среднее", gapRu: "Бюджет открыт агрегированно; внебюджетные фонды армии непрозрачны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SLV", confidenceRu: "среднее", gapRu: "Чрезвычайное положение ограничило доступ к данным о силах", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GRD", confidenceRu: "среднее", gapRu: "Армии нет; данные полиции фрагментарны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GTM", confidenceRu: "среднее", gapRu: "Военные фонды и предприятия армии исторически непрозрачны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "HTI", confidenceRu: "низкое", gapRu: "Государство распалось: статистика полиции условна, банды не учитываются никем", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "HND", confidenceRu: "среднее", gapRu: "Бюджет публикуется; операции в Москитии не детализируются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "NIC", confidenceRu: "низкое", gapRu: "Режим закрыл независимую статистику; российские поставки не раскрываются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "PAN", confidenceRu: "высокое", gapRu: "Полицейские силы отчитываются публично, армии нет", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "JAM", confidenceRu: "среднее", gapRu: "JDF публикует данные; оружейные потоки оцениваются по изъятиям", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "KNA", confidenceRu: "среднее", gapRu: "Микроданные RSS покрывают пробелы национальной статистики", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "LCA", confidenceRu: "среднее", gapRu: "Армии нет; полицейские данные фрагментарны", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "VCT", confidenceRu: "среднее", gapRu: "Армии нет; данные — RSS и открытые источники", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TTO", confidenceRu: "среднее", gapRu: "Бюджет открыт; детализация сил обороны частична", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GUY", confidenceRu: "среднее", gapRu: "Быстрый рост GDF опережает отчётность", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SUR", confidenceRu: "низкое", gapRu: "Статистика слабая; наркотрафик искажает картину безопасности", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "FJI", confidenceRu: "среднее", gapRu: "RFMF публикует состав; миротворческие финансы ООН прозрачнее национальных", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "PNG", confidenceRu: "низкое", gapRu: "Отчётность PNGDF нерегулярна; нагорья вне статистики", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "KIR", confidenceRu: "среднее", gapRu: "Армии нет; полицейские данные малы и публикуются донорами", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MHL", confidenceRu: "высокое", gapRu: "Армии нет по COFA; данные полиции открыты", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "FSM", confidenceRu: "высокое", gapRu: "Армии нет по COFA", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "PLW", confidenceRu: "высокое", gapRu: "Армии нет по COFA; данные морской безопасности открыты", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "WSM", confidenceRu: "среднее", gapRu: "Армии нет; данные полиции публикуются эпизодически", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SLB", confidenceRu: "среднее", gapRu: "Армии нет; условия китайских соглашений не публикуются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TON", confidenceRu: "среднее", gapRu: "Малые числа при редких публикациях HMAF", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TUV", confidenceRu: "высокое", gapRu: "Армии нет; данные полиции минимальны и открыты", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "VUT", confidenceRu: "среднее", gapRu: "Армии нет; данные VMF — оценки IISS и доноров", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
];

/** Качество данных: Африка. */
export const DATA_QUALITY_AFRICA: readonly CountryDataQualityEntry[] = [
  { iso3: "BEN", confidenceRu: "среднее", gapRu: "Бюджет публикуется; северные операции не детализируются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BFA", confidenceRu: "низкое", gapRu: "Хунта закрыла статистику; потери и контроль территории — оценки ACLED и ООН", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BDI", confidenceRu: "среднее", gapRu: "Миротворческие потоки прозрачнее национального бюджета", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CPV", confidenceRu: "среднее", gapRu: "Малые силы при открытой, но редкой отчётности", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CMR", confidenceRu: "среднее", gapRu: "Два конфликта ограничивают доступ к данным по северу и западу", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CAF", confidenceRu: "низкое", gapRu: "Государство контролирует часть территории; данные периферии — миссии ООН", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TCD", confidenceRu: "среднее", gapRu: "Нефтяная рента и армия частично вне бюджета", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "COM", confidenceRu: "низкое", gapRu: "Статистика минимальна; перевороты обрывают ряды данных", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "COG", confidenceRu: "среднее", gapRu: "Нефтяные потоки непрозрачны, армия отчитывается агрегированно", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "COD", confidenceRu: "низкое", gapRu: "Война на востоке: состав FARDC и потери — оценки, вооружённые группы вне учёта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "CIV", confidenceRu: "среднее", gapRu: "Бюджет публикуется; северные операции детализируются слабо", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "DJI", confidenceRu: "среднее", gapRu: "Арендные платежи баз не сводятся в открытую картину доходов", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "ERI", confidenceRu: "низкое", gapRu: "Эталон закрытости: ни бюджета, ни состава, ни сроков службы", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SWZ", confidenceRu: "низкое", gapRu: "Монархия не публикует военную статистику системно", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GAB", confidenceRu: "среднее", gapRu: "Переходный период: ряды данных прерваны переворотом", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GMB", confidenceRu: "низкое", gapRu: "Статистика слабая; данные ECOMIG полнее национальных", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GHA", confidenceRu: "высокое", gapRu: "Открытая бюджетная дискуссия; пробелы — по северным операциям", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GIN", confidenceRu: "низкое", gapRu: "Хунта ограничила статистику; китайские контракты не раскрываются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GNB", confidenceRu: "низкое", gapRu: "Наркотрафик и перевороты: данные — в основном внешние оценки", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "LBR", confidenceRu: "среднее", gapRu: "Малые силы при донорской отчётности", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "LSO", confidenceRu: "среднее", gapRu: "Отчётность есть; армейская политика искажает картину реформ", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MDG", confidenceRu: "низкое", gapRu: "Сельская небезопасность вне статистики; бюджет агрегирован", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MWI", confidenceRu: "среднее", gapRu: "Миротворческая отчётность ООН полнее национальной", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MLI", confidenceRu: "низкое", gapRu: "Война и хунта: контроль территории и потери — внешние оценки", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MRT", confidenceRu: "среднее", gapRu: "Бюджет публикуется частично; племенные договорённости не измеряются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "MUS", confidenceRu: "высокое", gapRu: "Армии нет; данные специальной мобильной полиции открыты", provenance: { source: "Оценка проекта", year: 2024, estimated: false } },
  { iso3: "NAM", confidenceRu: "высокое", gapRu: "Открытая парламентская отчётность", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "NER", confidenceRu: "низкое", gapRu: "Хунта и разрыв с Западом закрыли прежние каналы данных", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "RWA", confidenceRu: "среднее", gapRu: "Дисциплинированная, но закрытая система: операции в ДРК официально отрицаются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SEN", confidenceRu: "высокое", gapRu: "Открытая отчётность армии без переворотов", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SYC", confidenceRu: "среднее", gapRu: "Малые силы при открытой, но редкой статистике", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SLE", confidenceRu: "среднее", gapRu: "Британское менторство даёт данные; политика искажает ряды", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SOM", confidenceRu: "низкое", gapRu: "Армия собирается донорами; Аш-Шабааб собирает налоги вне учёта", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "SSD", confidenceRu: "низкое", gapRu: "Две армии соглашения; эмбарго ООН и война делают данные условными", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "TGO", confidenceRu: "среднее", gapRu: "Бюджет агрегирован; северные атаки освещаются скупо", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "UGA", confidenceRu: "среднее", gapRu: "Экспедиционные операции детализируются слабо", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "BWA", confidenceRu: "высокое", gapRu: "Образцовая открытость для региона", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "GNQ", confidenceRu: "низкое", gapRu: "Полная закрытость нефтяной автократии: бюджет сознательно null", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "STP", confidenceRu: "среднее", gapRu: "Микроданные при редкой публикации", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "ZMB", confidenceRu: "среднее", gapRu: "Бюджет публикуется; детализация по родам войск слабая", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
  { iso3: "ZWE", confidenceRu: "низкое", gapRu: "Санкции и закрытость: закупки у Китая не детализируются", provenance: { source: "Оценка проекта", year: 2024, estimated: true } },
];

/** Все записи качества данных волны data5. */
export const ALL_DATA_QUALITY: readonly CountryDataQualityEntry[] = [
  ...DATA_QUALITY_EURASIA,
  ...DATA_QUALITY_AMERICAS_OCEANIA,
  ...DATA_QUALITY_AFRICA,
];

/** Качество данных страны по коду; undefined, если записи нет. */
export function dataQualityForCountry(iso3: string): CountryDataQualityEntry | undefined {
  return ALL_DATA_QUALITY.find((entry) => entry.iso3 === iso3);
}

/** Коды стран с низким доверием данным (для пометок в интерфейсе). */
export function lowConfidenceCodes(): readonly string[] {
  return ALL_DATA_QUALITY.filter((entry) => entry.confidenceRu === "низкое").map(
    (entry) => entry.iso3,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Бенчмарки стран волны: качественные ярусы внутри своей лиги
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Качественный бенчмарк страны волны data5.
 * Ярусы — внутриволновые (сравнение со странами волны, а не с державами
 * топ-30): расходы, масса сил, готовность, устойчивость, мобилизация.
 */
export interface CountryBenchmarkEntry {
  /** Код ISO3. */
  iso3: string;
  /** Ярус расходов внутри волны (рус.). */
  spendingTierRu: string;
  /** Ярус массы сил внутри волны (рус.). */
  forceTierRu: string;
  /** Боеготовность по оценке проекта (рус.). */
  readinessRu: string;
  /** Устойчивость к длительному конфликту (рус.). */
  sustainabilityRu: string;
  /** Мобилизационный потенциал (рус.). */
  mobilizationRu: string;
  /** Итоговая пометка бенчмарка (рус.). */
  noteRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Бенчмарки: Азия, Ближний Восток, Центральная Азия. */
export const COUNTRY_BENCHMARKS_ASIA: readonly CountryBenchmarkEntry[] = [
  {
    iso3: "AFG",
    spendingTierRu: "непрозрачный",
    forceTierRu: "крупный для волны (армия режима)",
    readinessRu: "Низкая против ИГ-Хорасан вне городов",
    sustainabilityRu: "Низкая: нет признанных финансов и логистики",
    mobilizationRu: "Высокий человеческий, нулевой институциональный",
    noteRu: "Численность без государства: бенчмарк условен",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BHR",
    spendingTierRu: "высокий для волны",
    forceTierRu: "малый",
    readinessRu: "Средняя: техника США при малой массе",
    sustainabilityRu: "Высокая за счёт зонтика США и Саудовской Аравии",
    mobilizationRu: "Низкий: население мало",
    noteRu: "Защищённость на порядок выше собственных сил",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BTN",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Средняя для горных задач с Индией",
    sustainabilityRu: "Средняя: индийская логистика",
    mobilizationRu: "Низкий",
    noteRu: "Бенчмарк имеет смысл только в связке с Индией",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BRN",
    spendingTierRu: "средний для волны",
    forceTierRu: "малый",
    readinessRu: "Средняя морская, низкая сухопутная",
    sustainabilityRu: "Высокая при стабильной ренте",
    mobilizationRu: "Низкий",
    noteRu: "Рента покупает качество без массы",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LAO",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Низкая: техника возрастная, бюджет сжат долгом",
    sustainabilityRu: "Низкая",
    mobilizationRu: "Средний по населению, низкий по институтам",
    noteRu: "Армия больше, чем её бюджет позволяет содержать",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MDV",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Средняя морская для атолловых задач",
    sustainabilityRu: "Низкая без внешнего партнёра",
    mobilizationRu: "Низкий",
    noteRu: "Флот вместо армии: бенчмарк морской",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TLS",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая",
    sustainabilityRu: "Низкая: фискальный горизонт важнее военного",
    mobilizationRu: "Низкий",
    noteRu: "Армия как институт государственности, а не войны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PHI",
    spendingTierRu: "не применимо (алиас)",
    forceTierRu: "не применимо (алиас)",
    readinessRu: "См. PHL в волне data3",
    sustainabilityRu: "См. PHL в волне data3",
    mobilizationRu: "См. PHL в волне data3",
    noteRu: "Алиас не бенчмаркируется, чтобы не двоить страну",
    provenance: { source: "Методологическая пометка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "KGZ",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя после закупок БПЛА",
    sustainabilityRu: "Низкая: короткая война — предел",
    mobilizationRu: "Средний",
    noteRu: "БПЛА подняли готовность быстрее, чем реформы",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TJK",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Низкая-средняя: граница держится донорской помощью",
    sustainabilityRu: "Низкая без российской базы",
    mobilizationRu: "Средний по населению",
    noteRu: "Фронтир, оплаченный извне",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TKM",
    spendingTierRu: "непрозрачный",
    forceTierRu: "средний (оценка по парадам)",
    readinessRu: "Неизвестна: учений с наблюдателями нет",
    sustainabilityRu: "Неизвестна",
    mobilizationRu: "Неизвестен",
    noteRu: "Бенчмарк — сама непрозрачность",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Бенчмарки: Европа и Молдова. */
export const COUNTRY_BENCHMARKS_EUROPE: readonly CountryBenchmarkEntry[] = [
  {
    iso3: "ALB",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый",
    readinessRu: "Средняя по стандартам НАТО",
    sustainabilityRu: "Высокая внутри альянса",
    mobilizationRu: "Средний",
    noteRu: "НАТО компенсирует масштаб",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "AND",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Не применимо: гарантия соседей",
    mobilizationRu: "Отсутствует",
    noteRu: "Эталон нулевого бенчмарка",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "BIH",
    spendingTierRu: "низкий",
    forceTierRu: "малый",
    readinessRu: "Низкая-средняя",
    sustainabilityRu: "Средняя при EUFOR",
    mobilizationRu: "Средний по населению, заблокирован политикой",
    noteRu: "Политика слабее армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CYP",
    spendingTierRu: "средний для волны",
    forceTierRu: "малый-средний",
    readinessRu: "Средняя: призыв и современное ПВО",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Высокий для размера страны (призыв)",
    noteRu: "Сильнейший бенчмарк малых стран Европы волны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ISL",
    spendingTierRu: "отсутствует (береговая охрана)",
    forceTierRu: "отсутствует",
    readinessRu: "Морская — средняя, военная — не применимо",
    sustainabilityRu: "Высокая внутри НАТО",
    mobilizationRu: "Отсутствует",
    noteRu: "Без армии с 1868 года в современном виде государства",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "IRL",
    spendingTierRu: "низкий",
    forceTierRu: "малый",
    readinessRu: "Низкая для заявленной морской зоны",
    sustainabilityRu: "Средняя политически, низкая военно",
    mobilizationRu: "Низкий",
    noteRu: "Главный разрыв волны между зоной ответственности и силами",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LIE",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Не применимо",
    mobilizationRu: "Отсутствует",
    noteRu: "Нулевой бенчмарк с 1868 года",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "LUX",
    spendingTierRu: "средний на душу населения",
    forceTierRu: "микро",
    readinessRu: "Нишевая высокая (связь, космос)",
    sustainabilityRu: "Высокая внутри НАТО",
    mobilizationRu: "Низкий",
    noteRu: "Деньги вместо массы: модель нишевого союзника",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MNE",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая-средняя",
    sustainabilityRu: "Высокая внутри НАТО",
    mobilizationRu: "Низкий",
    noteRu: "Членство важнее численности",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MKD",
    spendingTierRu: "низкий",
    forceTierRu: "малый",
    readinessRu: "Средняя по стандартам НАТО",
    sustainabilityRu: "Высокая внутри альянса",
    mobilizationRu: "Средний",
    noteRu: "Сбалансированный малый союзник",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SVN",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый",
    readinessRu: "Средняя",
    sustainabilityRu: "Высокая внутри НАТО и ЕС",
    mobilizationRu: "Средний",
    noteRu: "Тыловая надёжность вместо амбиций",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CHE",
    spendingTierRu: "высокий для волны",
    forceTierRu: "крупный резервный",
    readinessRu: "Высокая для обороны своей территории",
    sustainabilityRu: "Высокая: милиция и запасы",
    mobilizationRu: "Высокий: сотни тысяч резерва",
    noteRu: "Сильнейшая военная машина волны data5",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MDA",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая",
    sustainabilityRu: "Низкая",
    mobilizationRu: "Средний по населению, не реализован",
    noteRu: "Армия меньше приднестровской группировки соседа",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MCO",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Не применимо: договор с Францией",
    mobilizationRu: "Отсутствует",
    noteRu: "Карабинеры — не армия",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "SMR",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Не применимо",
    mobilizationRu: "Отсутствует",
    noteRu: "Церемониальный бенчмарк",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "MLT",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Средняя морская",
    sustainabilityRu: "Средняя при нейтралитете и связях с ЕС",
    mobilizationRu: "Низкий",
    noteRu: "Береговая охрана островного нейтрала",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "XKX",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая как армия, средняя как лёгкие силы",
    sustainabilityRu: "Высокая при KFOR, низкая без него",
    mobilizationRu: "Средний",
    noteRu: "Бенчмарк определяется присутствием НАТО",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PSE",
    spendingTierRu: "непрозрачный",
    forceTierRu: "средний (силы безопасности)",
    readinessRu: "Не применимо в условиях войны",
    sustainabilityRu: "Отсутствует без суверенитета",
    mobilizationRu: "Высокий человеческий при отсутствии государства",
    noteRu: "Бенчмарк военных действий, а не армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Бенчмарки: Америки и Океания. */
export const COUNTRY_BENCHMARKS_AMERICAS_OCEANIA: readonly CountryBenchmarkEntry[] = [
  {
    iso3: "ATG",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая-средняя внутри RSS",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Низкий",
    noteRu: "Коллективная модель вместо национальной",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BHS",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый морской",
    readinessRu: "Средняя морская — лучшая в Карибах волны",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Низкий",
    noteRu: "Эталон малых морских сил региона",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BRB",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Средняя внутри RSS",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Низкий",
    noteRu: "Штабная роль важнее численности",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BLZ",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая-средняя для джунглей",
    sustainabilityRu: "Низкая без британского фактора",
    mobilizationRu: "Низкий",
    noteRu: "Сдерживание спором, а не силой",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CRI",
    spendingTierRu: "отсутствует (полиция)",
    forceTierRu: "отсутствует",
    readinessRu: "Полицейская средняя, растёт наркодавление",
    sustainabilityRu: "Высокая политически при отсутствии армии",
    mobilizationRu: "Отсутствует",
    noteRu: "Мировой эталон демилитаризации под стресс-тестом картелей",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "DMA",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Отсутствует",
    noteRu: "Безопасность — членство в RSS",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "DOM",
    spendingTierRu: "средний для волны",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя пограничная",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Средний",
    noteRu: "Крупнейший военный бенчмарк Карибов волны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SLV",
    spendingTierRu: "средний для волны",
    forceTierRu: "средний для волны",
    readinessRu: "Высокая внутренняя (тюремно-полицейская модель)",
    sustainabilityRu: "Спорная: модель держится на чрезвычайном положении",
    mobilizationRu: "Средний",
    noteRu: "Эффективность внутренней войны ценой институтов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GRD",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Отсутствует",
    noteRu: "Исторический прецедент RSS и интервенции 1983 года",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GTM",
    spendingTierRu: "средний для волны",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя при институциональной эрозии",
    sustainabilityRu: "Низкая-средняя",
    mobilizationRu: "Высокий по населению",
    noteRu: "Масса есть, государства не хватает",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "HTI",
    spendingTierRu: "фиктивный",
    forceTierRu: "распавшийся",
    readinessRu: "Отсутствует как государственная функция",
    sustainabilityRu: "Отсутствует",
    mobilizationRu: "Банды мобилизуют быстрее государства",
    noteRu: "Отрицательный эталон волны: анти-бенчмарк",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "HND",
    spendingTierRu: "низкий-средний",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя при поддержке США",
    sustainabilityRu: "Низкая-средняя",
    mobilizationRu: "Средний",
    noteRu: "База США весит больше собственной авиации",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "NIC",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя внутренняя, неизвестная внешняя",
    sustainabilityRu: "Средняя за счёт контроля, низкая экономически",
    mobilizationRu: "Средний",
    noteRu: "Армия режима, а не страны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PAN",
    spendingTierRu: "отсутствует (полиция)",
    forceTierRu: "отсутствует",
    readinessRu: "Полицейская средняя для охраны канала",
    sustainabilityRu: "Высокая: канал защищён его мировой ролью",
    mobilizationRu: "Отсутствует",
    noteRu: "Инфраструктура как армия",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "JAM",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый-средний",
    readinessRu: "Средняя внутренняя",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Средний",
    noteRu: "Сильнейшие англоязычные силы Карибов после Багам по морю",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "KNA",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая вне RSS",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Низкий",
    noteRu: "Самая малая армия полушария",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LCA",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Отсутствует",
    noteRu: "Полицейская модель RSS",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "VCT",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Средняя внутри RSS",
    mobilizationRu: "Отсутствует",
    noteRu: "Полицейская модель RSS",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TTO",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый-средний",
    readinessRu: "Средняя при росте банд",
    sustainabilityRu: "Средняя на газовой ренте",
    mobilizationRu: "Низкий-средний",
    noteRu: "Энергетика оплачивает сильнейшие силы юга Карибов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GUY",
    spendingTierRu: "растущий низкий",
    forceTierRu: "микро-малый",
    readinessRu: "Низкая, строится на ходу",
    sustainabilityRu: "Растёт с нефтяными доходами",
    mobilizationRu: "Низкий по населению",
    noteRu: "Самый быстрый рост бенчмарка волны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SUR",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая",
    sustainabilityRu: "Низкая до нефтяных доходов",
    mobilizationRu: "Низкий",
    noteRu: "Бенчмарк ожидания нефти",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "FJI",
    spendingTierRu: "низкий-средний",
    forceTierRu: "средний для Океании",
    readinessRu: "Высокая миротворческая",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Средний для региона",
    noteRu: "Военный центр тяжести Тихоокеанских островов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "PNG",
    spendingTierRu: "низкий",
    forceTierRu: "малый для населения страны",
    readinessRu: "Низкая в нагорьях",
    sustainabilityRu: "Низкая",
    mobilizationRu: "Высокий человеческий, не организован",
    noteRu: "Разрыв между населением и армией — крупнейший в Океании",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "KIR",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Не применимо: внешняя конкуренция за полицию",
    mobilizationRu: "Отсутствует",
    noteRu: "Гигантская ИЭЗ при полиции в 200 человек",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MHL",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Высокая по договору COFA",
    mobilizationRu: "Отсутствует",
    noteRu: "Полигон ПРО вместо армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "FSM",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Высокая по договору COFA",
    mobilizationRu: "Отсутствует",
    noteRu: "Оборона как статья американского договора",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "PLW",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Высокая по договору COFA",
    mobilizationRu: "Отсутствует",
    noteRu: "Сенсоры вместо солдат",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "WSM",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Средняя по договору с Новой Зеландией",
    mobilizationRu: "Отсутствует",
    noteRu: "Тихая полицейская модель",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SLB",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Спорная: два внешних зонтика конкурируют",
    mobilizationRu: "Отсутствует",
    noteRu: "Бенчмарк геополитической цены безоружности",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TON",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Спасательная высокая, военная символическая",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Низкий",
    noteRu: "Армия-спасатель монархии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TUV",
    spendingTierRu: "отсутствует",
    forceTierRu: "отсутствует",
    readinessRu: "Не применимо",
    sustainabilityRu: "Определяется климатом, а не войной",
    mobilizationRu: "Отсутствует",
    noteRu: "Бенчмарк климатической эры",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: false },
  },
  {
    iso3: "VUT",
    spendingTierRu: "отсутствует (VMF в полиции)",
    forceTierRu: "военизированная полиция",
    readinessRu: "Спасательная средняя",
    sustainabilityRu: "Средняя при помощи FRANZ",
    mobilizationRu: "Низкий",
    noteRu: "VMF — армия по функциям, полиция по закону",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Бенчмарки: Африка (Западная и Центральная). */
export const COUNTRY_BENCHMARKS_AFRICA_WEST_CENTRAL: readonly CountryBenchmarkEntry[] = [
  {
    iso3: "BEN",
    spendingTierRu: "низкий",
    forceTierRu: "малый-средний",
    readinessRu: "Растущая на северном направлении",
    sustainabilityRu: "Средняя при поддержке партнёров",
    mobilizationRu: "Средний",
    noteRu: "Прибрежный рубеж учится воевать на севере",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BFA",
    spendingTierRu: "средний военный (военная экономика)",
    forceTierRu: "средний плюс добровольцы",
    readinessRu: "Низкая против JNIM при высокой интенсивности войны",
    sustainabilityRu: "Низкая: блокады городов и потери",
    mobilizationRu: "Высокий вынужденный (VDP)",
    noteRu: "Война ведётся, но не выигрывается",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CPV",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Средняя морская",
    sustainabilityRu: "Средняя при поддержке ЕС",
    mobilizationRu: "Низкий",
    noteRu: "Островная морская модель",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CMR",
    spendingTierRu: "низкий-средний",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя у BIR, низкая у линейных частей",
    sustainabilityRu: "Средняя на двух фронтах низкой интенсивности",
    mobilizationRu: "Средний",
    noteRu: "Элита сильнее армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CAF",
    spendingTierRu: "микро",
    forceTierRu: "малый номинальный",
    readinessRu: "Низкая вне столицы",
    sustainabilityRu: "Отсутствует без внешних сил",
    mobilizationRu: "Низкий институциональный",
    noteRu: "Армия существует в пределах столичного кольца",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TCD",
    spendingTierRu: "средний для волны",
    forceTierRu: "средний для волны",
    readinessRu: "Высокая для региона: опыт Сахеля и Судана",
    sustainabilityRu: "Средняя-высокая на нефтяной ренте",
    mobilizationRu: "Высокий",
    noteRu: "Сильнейшая армия Центральной Африки волны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "COG",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый-средний",
    readinessRu: "Средняя парадная, боевого опыта мало",
    sustainabilityRu: "Средняя на нефти",
    mobilizationRu: "Средний",
    noteRu: "Стабильность без войн как главный актив",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "COD",
    spendingTierRu: "средний для волны",
    forceTierRu: "крупный номинальный",
    readinessRu: "Низкая на востоке при огромной территории",
    sustainabilityRu: "Низкая: фронт держится партнёрами",
    mobilizationRu: "Огромный человеческий, слабый институционально",
    noteRu: "Масштаб страны против возможностей армии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "CIV",
    spendingTierRu: "средний для волны",
    forceTierRu: "средний для волны",
    readinessRu: "Растущая, особенно на севере",
    sustainabilityRu: "Средняя-высокая на экономическом росте",
    mobilizationRu: "Средний",
    noteRu: "Экономика позволяет армии расти без надрыва",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GAB",
    spendingTierRu: "низкий",
    forceTierRu: "малый",
    readinessRu: "Низкая-средняя",
    sustainabilityRu: "Средняя на нефти",
    mobilizationRu: "Низкий",
    noteRu: "Бенчмарк заморожен переходным периодом",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GMB",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая",
    sustainabilityRu: "Средняя при ECOMIG",
    mobilizationRu: "Низкий",
    noteRu: "Армия под внешним присмотром",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GHA",
    spendingTierRu: "низкий-средний",
    forceTierRu: "средний для волны",
    readinessRu: "Высокая миротворческая, средняя боевая",
    sustainabilityRu: "Средняя, давит фискальный кризис",
    mobilizationRu: "Средний",
    noteRu: "Профессионализм выше бюджета",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GIN",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Низкая-средняя",
    sustainabilityRu: "Средняя на бокситах",
    mobilizationRu: "Средний",
    noteRu: "Рента держит хунту, а не реформу",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GNB",
    spendingTierRu: "микро",
    forceTierRu: "малый",
    readinessRu: "Низкая",
    sustainabilityRu: "Отсутствует",
    mobilizationRu: "Низкий",
    noteRu: "Армия — главный риск собственной страны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LBR",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая-средняя для размера",
    sustainabilityRu: "Средняя при донорской поддержке",
    mobilizationRu: "Низкий",
    noteRu: "Успех пересборки важнее масштаба",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MLI",
    spendingTierRu: "средний военный",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя в наступлении, низкая в удержании",
    sustainabilityRu: "Низкая: война на истощение проигрывается медленно",
    mobilizationRu: "Высокий",
    noteRu: "Российский контингент не заменил стратегию",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MRT",
    spendingTierRu: "низкий",
    forceTierRu: "малый-средний",
    readinessRu: "Средняя пограничная",
    sustainabilityRu: "Средняя-высокая: джихадизм сдерживается моделью",
    mobilizationRu: "Средний",
    noteRu: "Лучший контртеррористический результат Сахеля на малые деньги",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "NER",
    spendingTierRu: "низкий-средний военный",
    forceTierRu: "средний для волны",
    readinessRu: "Падающая после потери западных партнёров",
    sustainabilityRu: "Низкая на двух фронтах",
    mobilizationRu: "Средний",
    noteRu: "Изоляция стоит дороже санкций",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SEN",
    spendingTierRu: "низкий-средний",
    forceTierRu: "средний для волны",
    readinessRu: "Высокая для региона",
    sustainabilityRu: "Высокая: институты и новая рента",
    mobilizationRu: "Средний",
    noteRu: "Армия как институт республики — редкость региона",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SLE",
    spendingTierRu: "микро",
    forceTierRu: "малый",
    readinessRu: "Средняя миротворческая",
    sustainabilityRu: "Средняя при британском менторстве",
    mobilizationRu: "Средний",
    noteRu: "Постконфликтная норма при политической хрупкости",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "TGO",
    spendingTierRu: "микро-низкий",
    forceTierRu: "малый",
    readinessRu: "Растущая на севере вынужденно",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Средний",
    noteRu: "Порт платит, север воюет",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "GNQ",
    spendingTierRu: "непрозрачный",
    forceTierRu: "неизвестный",
    readinessRu: "Неизвестна",
    sustainabilityRu: "Неизвестна",
    mobilizationRu: "Неизвестен",
    noteRu: "Бенчмарк невозможен честно — и это зафиксировано",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "STP",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Морская низкая",
    sustainabilityRu: "Средняя при португальских связях",
    mobilizationRu: "Низкий",
    noteRu: "Островной микробенчмарк залива",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Бенчмарки: Африка (Восточная и Южная). */
export const COUNTRY_BENCHMARKS_AFRICA_EAST_SOUTH: readonly CountryBenchmarkEntry[] = [
  {
    iso3: "BDI",
    spendingTierRu: "микро-низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя миротворческая",
    sustainabilityRu: "Средняя за счёт внешних контингентов",
    mobilizationRu: "Средний",
    noteRu: "Армия зарабатывает стране валюту миссиями",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "COM",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая",
    sustainabilityRu: "Низкая",
    mobilizationRu: "Низкий",
    noteRu: "Силы символичны даже для островов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "DJI",
    spendingTierRu: "низкий",
    forceTierRu: "малый",
    readinessRu: "Средняя для размера",
    sustainabilityRu: "Высокая: аренда баз финансирует государство",
    mobilizationRu: "Низкий",
    noteRu: "Собственная армия — младший партнёр иностранных баз",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ERI",
    spendingTierRu: "непрозрачный",
    forceTierRu: "крупный (оценка, бессрочная служба)",
    readinessRu: "Средняя-высокая по опыту войн, не подтверждена открыто",
    sustainabilityRu: "Высокая ценой общества",
    mobilizationRu: "Тотальный",
    noteRu: "Самая милитаризованная страна волны при нуле данных",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SWZ",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Внутренняя средняя",
    sustainabilityRu: "Средняя внутри южноафриканского пространства",
    mobilizationRu: "Низкий",
    noteRu: "Армия охраны монархии",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "LSO",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Низкая, политизирована",
    sustainabilityRu: "Средняя внутри пространства ЮАР",
    mobilizationRu: "Низкий",
    noteRu: "Армия как риск, а не актив",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MDG",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Низкая в сельской местности",
    sustainabilityRu: "Низкая",
    mobilizationRu: "Средний по населению",
    noteRu: "Остров большой, контроль малый",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MWI",
    spendingTierRu: "микро-низкий",
    forceTierRu: "малый",
    readinessRu: "Средняя миротворческая",
    sustainabilityRu: "Средняя",
    mobilizationRu: "Средний",
    noteRu: "Мирная армия миротворцев",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "MUS",
    spendingTierRu: "отсутствует (полиция)",
    forceTierRu: "отсутствует",
    readinessRu: "Полицейская средняя, морская растущая",
    sustainabilityRu: "Высокая экономически",
    mobilizationRu: "Отсутствует",
    noteRu: "Богатая страна без армии — бенчмарк выбора, а не бедности",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "RWA",
    spendingTierRu: "средний для волны",
    forceTierRu: "средний для волны",
    readinessRu: "Высокая: лучшая в своей лиге",
    sustainabilityRu: "Высокая: дисциплина и экспедиционный опыт",
    mobilizationRu: "Высокий",
    noteRu: "Эталон эффективности малых армий Африки",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SYC",
    spendingTierRu: "микро",
    forceTierRu: "микро",
    readinessRu: "Морская средняя с боевым антипиратским опытом",
    sustainabilityRu: "Средняя при партнёрствах",
    mobilizationRu: "Низкий",
    noteRu: "Опыт важнее численности",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SOM",
    spendingTierRu: "донорский",
    forceTierRu: "средний номинальный",
    readinessRu: "Неравномерная: элитные части против слабого среднего",
    sustainabilityRu: "Отсутствует без доноров и миссии АС",
    mobilizationRu: "Клановый, не государственный",
    noteRu: "Армия как международный проект",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "SSD",
    spendingTierRu: "непрозрачный нефтяной",
    forceTierRu: "крупный номинальный",
    readinessRu: "Низкая: две армии одного соглашения",
    sustainabilityRu: "Отсутствует при возобновлении войны",
    mobilizationRu: "Высокий этнический",
    noteRu: "Численность без единого командования",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "UGA",
    spendingTierRu: "средний для волны",
    forceTierRu: "крупный для волны",
    readinessRu: "Высокая экспедиционная",
    sustainabilityRu: "Средняя-высокая на внешних театрах",
    mobilizationRu: "Высокий",
    noteRu: "Вторая военная машина волны после Швейцарии по опыту",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "BWA",
    spendingTierRu: "средний для волны",
    forceTierRu: "малый-средний",
    readinessRu: "Высокая для мирной страны",
    sustainabilityRu: "Высокая на алмазной ренте и институтах",
    mobilizationRu: "Средний",
    noteRu: "Лучший баланс денег и профессионализма на континенте",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "NAM",
    spendingTierRu: "низкий-средний",
    forceTierRu: "малый-средний",
    readinessRu: "Средняя мирная",
    sustainabilityRu: "Высокая политически",
    mobilizationRu: "Средний",
    noteRu: "Стабильность как бенчмарк",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ZMB",
    spendingTierRu: "низкий-средний",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя мирная",
    sustainabilityRu: "Средняя, зависит от меди и долга",
    mobilizationRu: "Средний",
    noteRu: "Транзитная армия без фронтов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    iso3: "ZWE",
    spendingTierRu: "низкий",
    forceTierRu: "средний для волны",
    readinessRu: "Средняя внутренняя, техника стареет",
    sustainabilityRu: "Низкая экономически",
    mobilizationRu: "Средний",
    noteRu: "Армия сильнее экономики, которая её кормит",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Все бенчмарки стран волны data5. */
export const ALL_COUNTRY_BENCHMARKS: readonly CountryBenchmarkEntry[] = [
  ...COUNTRY_BENCHMARKS_ASIA,
  ...COUNTRY_BENCHMARKS_EUROPE,
  ...COUNTRY_BENCHMARKS_AMERICAS_OCEANIA,
  ...COUNTRY_BENCHMARKS_AFRICA_WEST_CENTRAL,
  ...COUNTRY_BENCHMARKS_AFRICA_EAST_SOUTH,
];

/** Бенчмарк страны по коду; undefined, если записи нет. */
export function countryBenchmark(iso3: string): CountryBenchmarkEntry | undefined {
  return ALL_COUNTRY_BENCHMARKS.find((entry) => entry.iso3 === iso3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Субрегиональные анализы и рейтинги внутри регионов
// ─────────────────────────────────────────────────────────────────────────────

/** Анализ субрегиона внутри больших регионов волны. */
export interface SubregionAnalysisEntry {
  /** Название субрегиона (рус.). */
  nameRu: string;
  /** Родительский регион волны (рус.). */
  region: string;
  /** Страны волны в субрегионе (коды ISO3). */
  iso3: readonly string[];
  /** Главная динамика субрегиона (рус.). */
  dynamicRu: string;
  /** Ключевой риск субрегиона (рус.). */
  riskRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Субрегиональные срезы: где регион волны неоднороден. */
export const SUBREGION_ANALYSES: readonly SubregionAnalysisEntry[] = [
  {
    nameRu: "Сахель",
    region: "Западная Африка",
    iso3: ["MLI", "BFA", "NER", "MRT"],
    dynamicRu: "Конфедерация AES против джихадизма при российском присутствии; Мавритания — успешное исключение",
    riskRu: "Распад государственности по малийской траектории",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Прибрежная Западная Африка",
    region: "Западная Африка",
    iso3: ["BEN", "CIV", "GHA", "SEN", "TGO", "CPV", "GMB", "GIN", "GNB", "LBR", "SLE"],
    dynamicRu: "Экономический рост побережья при джихадистском давлении на северные границы",
    riskRu: "Северные фронты Бенина, Того и Кот-д’Ивуара станут постоянными",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Великие озёра",
    region: "Восточная Африка",
    iso3: ["RWA", "UGA", "BDI", "SSD"],
    dynamicRu: "Руандийско-угандийское соперничество и экспорт армий в соседние войны",
    riskRu: "Прямое столкновение Кигали и Киншасы через прокси",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Африканский Рог",
    region: "Восточная Африка",
    iso3: ["SOM", "DJI", "ERI"],
    dynamicRu: "Базовая рента Джибути, сомалийское строительство государства, эритрейская закрытость",
    riskRu: "Красноморский кризис втянет берега пролива",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Островная Восточная и Южная Африка",
    region: "Восточная Африка",
    iso3: ["MDG", "MUS", "SYC", "COM"],
    dynamicRu: "Морские риски вместо войн: наркотрафик, климат, рыболовство",
    riskRu: "Героиновый маршрут и циклоны",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Конголезский бассейн",
    region: "Центральная Африка",
    iso3: ["COD", "COG", "CAF", "CMR"],
    dynamicRu: "Война востока ДРК задаёт повестку всем соседям",
    riskRu: "Регионализация войны M23",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Нефтяное побережье Гвинейского залива",
    region: "Центральная Африка",
    iso3: ["GAB", "GNQ", "STP", "TCD"],
    dynamicRu: "Рентные режимы при падающей добыче и переходах власти",
    riskRu: "Преемственность в Малабо и Нджамене",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Северный треугольник",
    region: "Центральная Америка и Карибы",
    iso3: ["GTM", "HND", "SLV", "NIC"],
    dynamicRu: "Три модели ответа на банды и наркотрафик: чрезвычайная, институциональная, авторитарная",
    riskRu: "Миграционные волны как политическое оружие",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Восточные Карибы (RSS)",
    region: "Центральная Америка и Карибы",
    iso3: ["ATG", "BRB", "DMA", "GRD", "KNA", "LCA", "VCT"],
    dynamicRu: "Коллективная безопасность микрогосударств работает, пока угроза — преступность, а не война",
    riskRu: "Ураганы разрушают быстрее, чем RSS успевает реагировать",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Большие Антильские острова волны",
    region: "Центральная Америка и Карибы",
    iso3: ["HTI", "DOM", "JAM", "BHS", "TTO"],
    dynamicRu: "Гаитянский распад как системообразующий фактор соседей",
    riskRu: "Миграционно-криминальный перенос на Доминикану и Багамы",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Балканское кольцо НАТО",
    region: "Европа",
    iso3: ["ALB", "MNE", "MKD", "SVN", "BIH", "XKX"],
    dynamicRu: "Членство в НАТО закрыло военные вопросы, но не сербско-албанский и боснийский политические узлы",
    riskRu: "Инциденты на севере Косово и сецессионизм Республики Сербской",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Европейские нейтралы волны",
    region: "Европа",
    iso3: ["CHE", "IRL", "MLT", "AUT"],
    dynamicRu: "Швейцария вооружается, Ирландия дебатирует, Мальта патрулирует: нейтралитет дорожает (Австрия — волна data3, включена для полноты картины)",
    riskRu: "Инфраструктурные инциденты быстрее политических решений",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Европейские микрогосударства",
    region: "Европа",
    iso3: ["AND", "LIE", "MCO", "SMR", "LUX", "ISL"],
    dynamicRu: "Безопасность как договор и география: от пиренейских соправителей до GIUK-прохода",
    riskRu: "Военных рисков нет; финансовые и климатические — есть",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Меланезия",
    region: "Океания",
    iso3: ["PNG", "SLB", "VUT", "FJI"],
    dynamicRu: "Единственный субрегион Океании с армиями и внутренними конфликтами",
    riskRu: "Племенные войны нагорий и соломоновский прецедент китайских сделок",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Микронезия (COFA-государства)",
    region: "Океания",
    iso3: ["FSM", "MHL", "PLW"],
    dynamicRu: "Американская оборона по договору при китайском инфраструктурном интересе",
    riskRu: "Конкуренция за атоллы второй цепи островов",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Полинезия",
    region: "Океания",
    iso3: ["WSM", "TON", "TUV", "KIR"],
    dynamicRu: "Климат как главный театр: от договора Фалепили до катеров Guardian-class",
    riskRu: "Физическая утрата территории Тувалу и Кирибати",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Ферганская долина",
    region: "Центральная Азия",
    iso3: ["KGZ", "TJK"],
    dynamicRu: "Делимитация 2024–2025 годов впервые за десятилетия снижает главный риск региона",
    riskRu: "Водные споры переживут пограничный договор",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
  {
    nameRu: "Гималайско-индийский фланг",
    region: "Южная Азия",
    iso3: ["BTN", "MDV", "AFG"],
    dynamicRu: "Три разных типа зависимости: индийское менторство, индийско-китайский маятник, талибская изоляция",
    riskRu: "Афганский терроризм задаёт фон всем троим",
    provenance: { source: "Аналитическая оценка проекта", year: 2024, estimated: true },
  },
];

/** Запись рейтинга стран внутри одного региона волны. */
export interface RegionRankingEntry {
  /** Регион (рус.). */
  region: string;
  /** Код ISO3. */
  iso3: string;
  /** Место в регионе по совокупности военной значимости (1 — первое). */
  rank: number;
  /** Основание ранга (рус.). */
  basisRu: string;
}

/** Рейтинги военной значимости внутри регионов (топ стран каждого региона). */
export const REGION_RANKINGS: readonly RegionRankingEntry[] = [
  { region: "Южная Азия", iso3: "AFG", rank: 1, basisRu: "Крупнейшая армия волны региона, пусть и режима без признания" },
  { region: "Южная Азия", iso3: "BTN", rank: 2, basisRu: "Малая армия, усиленная индийским фактором" },
  { region: "Южная Азия", iso3: "MDV", rank: 3, basisRu: "Морские силы атоллового масштаба" },
  { region: "Ближний Восток", iso3: "BHR", rank: 1, basisRu: "Собственные силы плюс 5-й флот США на его территории" },
  { region: "Ближний Восток", iso3: "PSE", rank: 2, basisRu: "Силы безопасности и вооружённые группировки военного времени" },
  { region: "Юго-Восточная Азия", iso3: "BRN", rank: 1, basisRu: "Рентный бюджет и британский гарнизон" },
  { region: "Юго-Восточная Азия", iso3: "LAO", rank: 2, basisRu: "Крупнейшая армия тройки при слабом бюджете" },
  { region: "Юго-Восточная Азия", iso3: "TLS", rank: 3, basisRu: "Малая армия под австралийским зонтиком" },
  { region: "Центральная Азия", iso3: "TJK", rank: 1, basisRu: "Фронтирная армия плюс 201-я база России" },
  { region: "Центральная Азия", iso3: "TKM", rank: 2, basisRu: "Парадная масса при неизвестной готовности" },
  { region: "Центральная Азия", iso3: "KGZ", rank: 3, basisRu: "Меньшая армия, но единственная с боевым опытом БПЛА-войны 2022 года" },
  { region: "Европа", iso3: "CHE", rank: 1, basisRu: "Милиция, F-35 в закупке и крупнейший бюджет волны региона" },
  { region: "Европа", iso3: "CYP", rank: 2, basisRu: "Призывная гвардия и современное ПВО" },
  { region: "Европа", iso3: "ALB", rank: 3, basisRu: "НАТО и растущие закупки БПЛА" },
  { region: "Европа", iso3: "SVN", rank: 4, basisRu: "Сбалансированные силы тылового союзника" },
  { region: "Европа", iso3: "MKD", rank: 5, basisRu: "Профессиональная малая армия НАТО" },
  { region: "Восточная Европа", iso3: "MDA", rank: 1, basisRu: "Единственная страна региона в волне" },
  { region: "Центральная Америка и Карибы", iso3: "DOM", rank: 1, basisRu: "Крупнейшие силы Карибов волны" },
  { region: "Центральная Америка и Карибы", iso3: "GTM", rank: 2, basisRu: "Масса северного треугольника" },
  { region: "Центральная Америка и Карибы", iso3: "SLV", rank: 3, basisRu: "Самая милитаризованная внутренняя модель региона" },
  { region: "Центральная Америка и Карибы", iso3: "NIC", rank: 4, basisRu: "Партийная армия при изоляции" },
  { region: "Центральная Америка и Карибы", iso3: "HND", rank: 5, basisRu: "Армия плюс американская база" },
  { region: "Южная Америка", iso3: "GUY", rank: 1, basisRu: "Растущая нефтяная армия" },
  { region: "Южная Америка", iso3: "SUR", rank: 2, basisRu: "Символические силы до нефтяной эры" },
  { region: "Западная Африка", iso3: "MLI", rank: 1, basisRu: "Крупнейший театр войны региона и российский фактор" },
  { region: "Западная Африка", iso3: "CIV", rank: 2, basisRu: "Армия экономического локомотива" },
  { region: "Западная Африка", iso3: "BFA", rank: 3, basisRu: "Мобилизационная война против JNIM" },
  { region: "Западная Африка", iso3: "GHA", rank: 4, basisRu: "Профессиональный якорь побережья" },
  { region: "Западная Африка", iso3: "SEN", rank: 5, basisRu: "Институциональная армия республики" },
  { region: "Восточная Африка", iso3: "UGA", rank: 1, basisRu: "Крупнейшая экспедиционная армия региона волны" },
  { region: "Восточная Африка", iso3: "RWA", rank: 2, basisRu: "Самая эффективная армия на единицу размера" },
  { region: "Восточная Африка", iso3: "ERI", rank: 3, basisRu: "Тотальная мобилизация при нуле данных" },
  { region: "Восточная Африка", iso3: "SOM", rank: 4, basisRu: "Война с Аш-Шабааб и миссия АС" },
  { region: "Восточная Африка", iso3: "SSD", rank: 5, basisRu: "Крупная номинальная численность двух армий" },
  { region: "Центральная Африка", iso3: "TCD", rank: 1, basisRu: "Единственная боеспособная армия региона" },
  { region: "Центральная Африка", iso3: "COD", rank: 2, basisRu: "Масштаб страны и война востока" },
  { region: "Центральная Африка", iso3: "CMR", rank: 3, basisRu: "Двуфронтовая армия с элитным BIR" },
  { region: "Южная Африка", iso3: "BWA", rank: 1, basisRu: "Профессионализм и алмазный бюджет" },
  { region: "Южная Африка", iso3: "ZMB", rank: 2, basisRu: "Вторая масса региона" },
  { region: "Южная Африка", iso3: "ZWE", rank: 3, basisRu: "Армия-арбитр с китайской техникой" },
  { region: "Южная Африка", iso3: "NAM", rank: 4, basisRu: "Стабильные силы западного фланга" },
  { region: "Океания", iso3: "FJI", rank: 1, basisRu: "Единственная значимая армия островного Тихого океана" },
  { region: "Океания", iso3: "PNG", rank: 2, basisRu: "Крупнейшее население при слабой армии" },
  { region: "Океания", iso3: "TON", rank: 3, basisRu: "Единственная вторая армия региона — микроскопическая" },
  { region: "Океания", iso3: "SLB", rank: 4, basisRu: "Армии нет, но геополитический вес — первый в регионе" },
];

/** Рейтинг региона как список записей по возрастанию ранга. */
export function regionRanking(region: string): readonly RegionRankingEntry[] {
  return REGION_RANKINGS.filter((entry) => entry.region === region).sort(
    (a, b) => a.rank - b.rank,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Дополнения реестров: конфликты, присутствия, коридоры, глоссарий
// ─────────────────────────────────────────────────────────────────────────────

/** Дополнительные исторические конфликты стран волны. */
export const HISTORICAL_CONFLICTS_MORE: readonly HistoricalConflictEntry[] = [
  {
    nameRu: "Восстание Мау-Мау и колониальные войны (фон региона)",
    yearsRu: "1952–1960",
    hostIso3: "UGA",
    partiesRu: "Великобритания и колониальные общества Восточной Африки",
    outcomeRu: "Путь к независимости стран региона",
    relevanceRu: "Историческая память армий Великих озёр",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Португальские колониальные войны (фон Гвинеи-Бисау)",
    yearsRu: "1963–1974",
    hostIso3: "GNB",
    partiesRu: "Португалия и ПАИГК",
    outcomeRu: "Независимость и армия-партия у власти",
    relevanceRu: "Источник переворотной традиции Бисау",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Нигерийско-камерунский спор о Бакасси",
    yearsRu: "1994–2008",
    hostIso3: "CMR",
    partiesRu: "Камерун и Нигерия",
    outcomeRu: "Решение МС ООН в пользу Камеруна, мирная передача",
    relevanceRu: "Редкий успешный правовой исход территориального спора Африки",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Чадско-ливийская война и полоса Аузу",
    yearsRu: "1978–1987",
    hostIso3: "TCD",
    partiesRu: "Чад, Франция, Ливия",
    outcomeRu: "Победа Чада («война Тойот»), решение МС ООН 1994 года",
    relevanceRu: "Источник боевой репутации чадской армии",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Мадагаскарские кризисы и роль армии",
    yearsRu: "2002, 2009",
    hostIso3: "MDG",
    partiesRu: "Соперничающие президенты и армейские фракции",
    outcomeRu: "Армия дважды решала исход политических кризисов",
    relevanceRu: "Фон политической роли вооружённых сил острова",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Коморские перевороты и наёмники Боба Денара",
    yearsRu: "1975–1995",
    hostIso3: "COM",
    partiesRu: "Наёмники и коморские режимы, Франция",
    outcomeRu: "Десятки переворотов; французское пресечение попытки 1995 года",
    relevanceRu: "Исторический рекорд переворотности объясняет слабость институтов",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Сомалийская операция «Возрождение надежды»",
    yearsRu: "1992–1993",
    hostIso3: "SOM",
    partiesRu: "ООН, США и сомалийские фракции",
    outcomeRu: "Провал интервенции после «Чёрного ястреба»",
    relevanceRu: "Травма, определившая осторожность Запада в Африке на десятилетие",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Замбийская освободительная география (фон)",
    yearsRu: "1964–1991",
    hostIso3: "ZMB",
    partiesRu: "Замбия как тыл освободительных движений Юга Африки",
    outcomeRu: "Репутация мирного транзитного государства",
    relevanceRu: "Историческая основа нейтральной военной культуры Замбии",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Военный переворот в Зимбабве",
    yearsRu: "2017",
    hostIso3: "ZWE",
    partiesRu: "Армия и режим Мугабе",
    outcomeRu: "«Непереворот»: Мугабе ушёл, система сохранилась",
    relevanceRu: "Прецедент армии-арбитра для всего региона",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Кризисы армии Лесото",
    yearsRu: "1998, 2014, 2017",
    hostIso3: "LSO",
    partiesRu: "Фракции LDF, SADC",
    outcomeRu: "Интервенция SADC 1998 года, реформы под внешним давлением",
    relevanceRu: "Причина программы реформы сектора безопасности",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Протесты и армия Эсватини",
    yearsRu: "2021",
    hostIso3: "SWZ",
    partiesRu: "Протестующие и силы безопасности монархии",
    outcomeRu: "Подавление протестов, десятки погибших по оценкам правозащитников",
    relevanceRu: "Главный тест лояльности армии монарху",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Гвинейские перевороты",
    yearsRu: "2008, 2021",
    hostIso3: "GIN",
    partiesRu: "Армейские хунты и гражданские правительства",
    outcomeRu: "Хунта Думбуя обещает переход без даты",
    relevanceRu: "Паттерн: армия приходит при смерти или кризисе президента",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Попытка переворота в Сьерра-Леоне",
    yearsRu: "2023",
    hostIso3: "SLE",
    partiesRu: "Группа военных и правительство",
    outcomeRu: "Атака на арсеналы подавлена, трибунал и аресты",
    relevanceRu: "Предупреждение о политизации постконфликтной армии",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Война в Кабу-Делгаду (участие соседей волны)",
    yearsRu: "2017 — настоящее время",
    hostIso3: "ZMB",
    partiesRu: "Мозамбик, Руанда, SADC (включая контингенты региона) против ИГ-Мозамбик",
    outcomeRu: "Газовые проекты защищены, повстанчество не уничтожено",
    relevanceRu: "Единственный экспедиционный опыт южного региона за десятилетия",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Операция «Линда Нчи» и кенийско-сомалийский фон",
    yearsRu: "2011 — настоящее время",
    hostIso3: "SOM",
    partiesRu: "Кения и Аш-Шабааб",
    outcomeRu: "Кенийский контингент вошёл в миссию АС; атаки мести внутри Кении",
    relevanceRu: "Сомалийская война регионализирована окончательно",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Тайваньско-китайское перетягивание Тихого океана",
    yearsRu: "2019 — настоящее время",
    hostIso3: "KIR",
    partiesRu: "Китай, Тайвань, островные государства",
    outcomeRu: "Кирибати и Соломоновы Острова сменили признание; Палау и Маршалловы Острова держатся за Тайбэй и Вашингтон",
    relevanceRu: "Дипломатические войны предшествуют безопасностным сделкам",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Ядерные испытания на Маршалловых Островах",
    yearsRu: "1946–1958",
    hostIso3: "MHL",
    partiesRu: "США и население атоллов Бикини и Эниветок",
    outcomeRu: "67 испытаний, переселения и компенсации — предмет переговоров COFA до сих пор",
    relevanceRu: "Историческое ядро отношений Маджуро и Вашингтона",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Беспорядки в Хониаре",
    yearsRu: "2021",
    hostIso3: "SLB",
    partiesRu: "Протестующие с Малаиты и полиция; австралийский контингент по запросу",
    outcomeRu: "Чайнатаун сожжён, порядок восстановлен внешней помощью",
    relevanceRu: "Тест, показавший цену отсутствия армии и скорость австралийской реакции",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Никарагуанский кризис",
    yearsRu: "2018",
    hostIso3: "NIC",
    partiesRu: "Режим Ортеги и протестующие",
    outcomeRu: "Сотни погибших по оценкам правозащитников, консолидация режима",
    relevanceRu: "Точка невозврата авторитарной модели страны",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    nameRu: "Боливарианский фон Тринидада: венесуэльский кризис",
    yearsRu: "2014 — настоящее время",
    hostIso3: "TTO",
    partiesRu: "Венесуэла и её исход населения",
    outcomeRu: "Миграция и наркотрафик через пролив стали главной повесткой Порт-оф-Спейна",
    relevanceRu: "Внешний кризис как внутренний фактор безопасности",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
];

/** Дополнительные внешние присутствия. */
export const EXTERNAL_PRESENCES_MORE: readonly ExternalPresenceEntry[] = [
  {
    holder: "Франция",
    hostRu: "Габон",
    hostIso3: "GAB",
    formatRu: "Французские элементы в Габоне (исторически — 6-й БИМа)",
    scaleRu: "Сотни военнослужащих; статус пересматривается после переворота 2023 года",
    significanceRu: "Последний опорный пункт Франции в Центральной Африке под вопросом",
    provenance: { source: "Минобороны Франции", year: 2024, estimated: true },
  },
  {
    holder: "США",
    hostRu: "Нигер (завершено)",
    hostIso3: "NER",
    formatRu: "Авиабаза 201 в Агадесе — выведена в 2024 году",
    scaleRu: "Крупнейшая база БПЛА США в Африке была оставлена по требованию хунты",
    significanceRu: "Символ конца американского Сахеля в прежнем виде",
    provenance: { source: "АФРИКОМ", year: 2024, estimated: false },
  },
  {
    holder: "Турция",
    hostRu: "Страны Сахеля и Западной Африки (поставки)",
    hostIso3: null,
    formatRu: "Продажи БПЛА Bayraktar и бронетехники",
    scaleRu: "Мали, Буркина-Фасо, Нигер, Того и другие покупатели региона",
    significanceRu: "Турция стала главным бенефициаром ухода Франции",
    provenance: { source: "SIPRI Arms Transfers Database", year: 2024, estimated: true },
  },
  {
    holder: "ОАЭ",
    hostRu: "Чад и Рог Африки (логистика и финансирование)",
    hostIso3: "TCD",
    formatRu: "Авиабаза и гуманитарно-военная логистика в Амджарасе",
    scaleRu: "Поддержка, связанная с суданской войной, по открытым оценкам",
    significanceRu: "Эмираты — теневой логист чадского направления",
    provenance: { source: "Открытые аналитические оценки", year: 2024, estimated: true },
  },
  {
    holder: "Великобритания",
    hostRu: "Сьерра-Леоне",
    hostIso3: "SLE",
    formatRu: "Международная военная консультативная команда (IMATT)",
    scaleRu: "Небольшая постоянная учебная миссия с 2000 года",
    significanceRu: "Скелет постконфликтной реформы армии",
    provenance: { source: "Минобороны Великобритании", year: 2024, estimated: false },
  },
  {
    holder: "США и Великобритания",
    hostRu: "Ямайка и Карибы (программы)",
    hostIso3: "JAM",
    formatRu: "Инициатива безопасности Карибского бассейна (CBSI)",
    scaleRu: "Обучение, катера и разведка против наркотрафика",
    significanceRu: "Основная внешняя рамка карибской безопасности",
    provenance: { source: "Госдепартамент США", year: 2024, estimated: false },
  },
  {
    holder: "Китай",
    hostRu: "Кирибати",
    hostIso3: "KIR",
    formatRu: "Полицейские советники и программы подготовки (с 2024 года публично)",
    scaleRu: "Небольшие группы при гигантской ИЭЗ страны",
    significanceRu: "Проверка реакции США и Австралии в центральной Полинезии",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    holder: "Новая Зеландия",
    hostRu: "Тонга и Самоа (программы)",
    hostIso3: "TON",
    formatRu: "Программа взаимной помощи в обороне и полицейские советники",
    scaleRu: "Инструкторы и совместные учения малых масштабов",
    significanceRu: "Веллингтон — второй донор безопасности Полинезии",
    provenance: { source: "Минобороны Новой Зеландии", year: 2024, estimated: false },
  },
];

/** Дополнительные записи глоссария агрегации. */
export const AGGREGATION_GLOSSARY_MORE: readonly AggregationGlossaryEntry[] = [
  {
    termRu: "Экспорт безопасности",
    definitionRu: "Модель, при которой армия зарабатывает стране валюту и влияние миссиями: Руанда, Уганда, Фиджи, Бурунди",
    caveatRu: "Экспортные контингенты могут быть боеспособнее домашних гарнизонов",
  },
  {
    termRu: "Армия режима",
    definitionRu: "Силы, чья главная функция — удержание власти, а не оборона границ: Никарагуа, Эсватини, Зимбабве",
    caveatRu: "Боевой потенциал такой армии против внешнего врага систематически ниже номинального",
  },
  {
    termRu: "Фронтирное государство",
    definitionRu: "Страна, чья армия существует ради одной границы: Таджикистан (Афганистан), Доминикана (Гаити)",
    caveatRu: "Оценка такой армии вне её фронтира бессмысленна",
  },
  {
    termRu: "Донорская армия",
    definitionRu: "Силы, собранные и содержимые внешними партнёрами: Сомали, Либерия, ЦАР",
    caveatRu: "Устойчивость такой армии равна устойчивости донорского финансирования",
  },
  {
    termRu: "Полицейская модель безопасности",
    definitionRu: "Замена армии полицией и береговой охраной: Коста-Рика, Панама, большинство Океании",
    caveatRu: "Модель работает против преступности и не рассчитана на войну",
  },
  {
    termRu: "Двойной зонтик",
    definitionRu: "Одновременные безопасностные связи с конкурирующими державами: Соломоновы Острова, Джибути",
    caveatRu: "В кризис зонтики могут не раскрыться одновременно",
  },
  {
    termRu: "Непрозрачный профиль",
    definitionRu: "Профиль, где ключевые числа сознательно оставлены null: Эритрея, Туркменистан, Экваториальная Гвинея, КНДР в других волнах",
    caveatRu: "Null — это данные о режиме, а не отсутствие работы аналитика",
  },
  {
    termRu: "Винтаж волны",
    definitionRu: "Срез источников около 2024 года, единый для сопоставимости профилей",
    caveatRu: "События 2025 года отражены точечно и помечены в текстах",
  },
];

/** Все записи глоссария агрегации одним списком. */
export const ALL_AGGREGATION_GLOSSARY: readonly AggregationGlossaryEntry[] = [
  ...AGGREGATION_GLOSSARY,
  ...AGGREGATION_GLOSSARY_MORE,
];

/** Все исторические конфликты, включая дополнения. */
export const ALL_HISTORICAL_CONFLICTS_FULL: readonly HistoricalConflictEntry[] = [
  ...ALL_HISTORICAL_CONFLICTS,
  ...HISTORICAL_CONFLICTS_MORE,
];

/** Все внешние присутствия, включая дополнения. */
export const ALL_EXTERNAL_PRESENCES: readonly ExternalPresenceEntry[] = [
  ...EXTERNAL_PRESENCES,
  ...EXTERNAL_PRESENCES_MORE,
];

// ─────────────────────────────────────────────────────────────────────────────
// Хроника событий безопасности 2024–2025 по странам волны data5
// ─────────────────────────────────────────────────────────────────────────────

/** Событие безопасности 2024–2025 годов, меняющее чтение профиля страны. */
export interface SecurityChronicleEntry {
  /** Код ISO3. */
  iso3: string;
  /** Период события (рус.). */
  periodRu: string;
  /** Событие (рус.). */
  eventRu: string;
  /** Значение для профиля страны (рус.). */
  significanceRu: string;
  /** Провенанс записи. */
  provenance: RestProvenance;
}

/** Хроника 2024–2025: Африка и Ближний Восток. */
export const SECURITY_CHRONICLE_AFRICA: readonly SecurityChronicleEntry[] = [
  {
    iso3: "MLI",
    periodRu: "2024–2025",
    eventRu: "Атака на Бамако (сентябрь 2024) и осада топливных маршрутов JNIM (2025)",
    significanceRu: "Война пришла в столицу: профиль «фронт далеко» устарел",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "BFA",
    periodRu: "2024–2025",
    eventRu: "Резня в Барсалого и наступление JNIM на города",
    significanceRu: "Модель массовой мобилизации VDP под вопросом",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "NER",
    periodRu: "2024",
    eventRu: "Вывод сил США из Агадеса и разрыв соглашений с Западом завершён",
    significanceRu: "Страна окончательно в орбите AES и России",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "COD",
    periodRu: "2025",
    eventRu: "Взятие Гомы и Букаву силами M23",
    significanceRu: "Крупнейшая эскалация войны востока за десятилетие",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "RWA",
    periodRu: "2025",
    eventRu: "Санкции и разрывы помощи ряда стран Запада из-за ДРК",
    significanceRu: "Цена восточноконголезской политики впервые стала финансовой",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "SOM",
    periodRu: "2025",
    eventRu: "Наступление Аш-Шабааб в Средней Шабелле и запуск AUSSOM",
    significanceRu: "Завоевания 2022–2023 годов частично отыграны боевиками",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "SSD",
    periodRu: "2025",
    eventRu: "Столкновения в Насире и арест Машара",
    significanceRu: "Мирное соглашение 2018 года на грани срыва",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "TCD",
    periodRu: "2024–2025",
    eventRu: "Выборы Махамата Деби и вывод французских сил",
    significanceRu: "Чад переформатирует внешние связи, оставаясь опорой региона",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "GAB",
    periodRu: "2025",
    eventRu: "Президентские выборы переходного периода выиграл Олиги Нгема",
    significanceRu: "Переворот институционализирован выборами",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "SEN",
    periodRu: "2024",
    eventRu: "Победа оппозиции на выборах и старт нефтедобычи",
    significanceRu: "Рента впервые распределяется новой властью",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "GHA",
    periodRu: "2024–2025",
    eventRu: "Смена власти выборами и золотой бум на фоне фискального кризиса",
    significanceRu: "Оборонные планы зависят от долговой сделки",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "MUS",
    periodRu: "2024–2025",
    eventRu: "Соглашение с Великобританией о Чагосе",
    significanceRu: "Спор закрыт: суверенитет Маврикия при сохранении базы Диего-Гарсия",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "BWA",
    periodRu: "2024",
    eventRu: "Первая смена правящей партии за 58 лет по итогам выборов",
    significanceRu: "Институциональный тест пройден: армия вне политики",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "MDG",
    periodRu: "2025",
    eventRu: "Протесты поколения Z и смена власти при участии военных",
    significanceRu: "Армия снова арбитр малагасийской политики",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "ERI",
    periodRu: "2024–2025",
    eventRu: "Мобилизационные меры на фоне эфиопских заявлений о выходе к морю",
    significanceRu: "Красноморский вектор — главный риск региона",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "DJI",
    periodRu: "2024–2025",
    eventRu: "Кризис судоходства Красного моря повысил трафик и цену баз",
    significanceRu: "Рентная модель получила премию за риск",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "UGA",
    periodRu: "2025",
    eventRu: "UPDF в Джубе: поддержка Южного Судана против оппозиции",
    significanceRu: "Уганда — пожарная команда и заинтересованная сторона одновременно",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "ZWE",
    periodRu: "2024–2025",
    eventRu: "Дискуссия о продлении власти Мнангагвы и роль военных фракций",
    significanceRu: "Преемственность снова решается при участии армии",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "BEN",
    periodRu: "2025",
    eventRu: "Крупнейшая атака джихадистов на позиции армии у тройной границы",
    significanceRu: "Северный фронт Бенина стал полноценной войной малой интенсивности",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "TGO",
    periodRu: "2024–2025",
    eventRu: "Конституционный переход к парламентской системе династии Гнассингбе",
    significanceRu: "Политическая рамка армии не изменилась",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "CIV",
    periodRu: "2025",
    eventRu: "Выборный год и четвёртый срок Уаттары как фактор северной политики",
    significanceRu: "Стабильность локомотива — условие всего побережья",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "CAF",
    periodRu: "2024–2025",
    eventRu: "Переформатирование российского присутствия в Африканский корпус",
    significanceRu: "Гарант тот же, вывеска и подчинение — новые",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "CMR",
    periodRu: "2025",
    eventRu: "Выборы при президенте Бийя и вопрос преемственности",
    significanceRu: "Главный политический риск двуфронтовой страны",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "GIN",
    periodRu: "2024–2025",
    eventRu: "Запуск Симанду и конституционный референдум хунты",
    significanceRu: "Железная рента меняет масштаб гвинейского государства",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "SLE",
    periodRu: "2024",
    eventRu: "Суд над участниками попытки переворота 2023 года",
    significanceRu: "Постконфликтная армия проходит тест на лояльность процедурам",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "MRT",
    periodRu: "2024",
    eventRu: "Старт добычи газа Торту и переизбрание Газуани",
    significanceRu: "Газовая эра начинается при стабильной военной модели",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "PSE",
    periodRu: "2024–2025",
    eventRu: "Война в Газе и операции на Западном берегу",
    significanceRu: "Профиль страны определяется войной, а не институтами",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "BHR",
    periodRu: "2024–2025",
    eventRu: "Удары по хуситам с участием архитектуры 5-го флота региона",
    significanceRu: "Бахрейнская платформа задействована в красноморской кампании",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
];

/** Хроника 2024–2025: Евразия, Америки, Океания. */
export const SECURITY_CHRONICLE_REST: readonly SecurityChronicleEntry[] = [
  {
    iso3: "KGZ",
    periodRu: "2024–2025",
    eventRu: "Делимитация границы с Таджикистаном и договор о госгранице",
    significanceRu: "Главный конфликт региона впервые закрывается юридически",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "TJK",
    periodRu: "2024–2025",
    eventRu: "Трёхсторонний саммит Худжанда и обмен территориями с Кыргызстаном",
    significanceRu: "Душанбе получает выход из пограничной ловушки",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "TKM",
    periodRu: "2024–2025",
    eventRu: "Газовые свопы через Иран и визиты в рамках «тройного союза»",
    significanceRu: "Закрытость сохраняется при росте газовой дипломатии",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "MDA",
    periodRu: "2024–2025",
    eventRu: "Референдум о ЕС, переизбрание Санду и энергетический кризис Приднестровья",
    significanceRu: "Гибридное давление не сменило курс страны",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "CYP",
    periodRu: "2024–2025",
    eventRu: "Морской коридор помощи Газе из Ларнаки и сближение с США",
    significanceRu: "Никосия конвертирует географию в дипломатический вес",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "IRL",
    periodRu: "2024–2025",
    eventRu: "Инциденты с судами у кабельной инфраструктуры и дебаты о сонарах",
    significanceRu: "Нейтралитет впервые спорит с картой подводных кабелей",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "CHE",
    periodRu: "2024–2025",
    eventRu: "График платежей F-35 и споры о реэкспорте боеприпасов Украине",
    significanceRu: "Нейтралитет переопределяется через закупки, а не членство",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "BIH",
    periodRu: "2025",
    eventRu: "Приговор Додику и обострение сецессионистской линии Республики Сербской",
    significanceRu: "Дейтонская система проходит худший тест за годы",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "XKX",
    periodRu: "2024–2025",
    eventRu: "Инциденты на канале Ибар-Лепенац и споры о динаре на севере",
    significanceRu: "Север остаётся главным триггером Балкан",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    iso3: "HTI",
    periodRu: "2024–2025",
    eventRu: "Развёртывание MSS и атаки банд на государственные объекты",
    significanceRu: "Миссия не достигла переломного масштаба",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "SLV",
    periodRu: "2024–2025",
    eventRu: "Продление чрезвычайного положения и конституционная реформа сроков",
    significanceRu: "Модель безопасности становится постоянной, а не чрезвычайной",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "PAN",
    periodRu: "2025",
    eventRu: "Спор с США о «китайском контроле» портов канала и аудит концессий",
    significanceRu: "Канал снова в центре великодержавного спора",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "TTO",
    periodRu: "2024–2025",
    eventRu: "Чрезвычайное положение против банд",
    significanceRu: "Энергетическая стабильность не защищает от ганг-кризиса",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "GUY",
    periodRu: "2024–2025",
    eventRu: "Венесуэльские «выборы» губернатора Эссекибо и инциденты на границе",
    significanceRu: "Спор поддерживается в тлеющем виде при росте GDF",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "SUR",
    periodRu: "2024–2025",
    eventRu: "Инвестиционное решение по блоку 58 и выборы",
    significanceRu: "Нефтяная эра назначена на 2028 год",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "DOM",
    periodRu: "2024–2025",
    eventRu: "Массовые депортации гаитян и достройка пограничной стены",
    significanceRu: "Граница с Гаити — постоянный военный приоритет",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
  {
    iso3: "PNG",
    periodRu: "2024–2025",
    eventRu: "Резня в Энге и оборонное соглашение с Австралией о совместной базе",
    significanceRu: "Нагорья требуют армии, которой у страны нет",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    iso3: "SLB",
    periodRu: "2024–2025",
    eventRu: "Смена премьера выборами при сохранении китайской линии",
    significanceRu: "Соглашение 2022 года пережило смену власти",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "KIR",
    periodRu: "2024–2025",
    eventRu: "Публичное подтверждение китайской полицейской подготовки",
    significanceRu: "Центральная Полинезия — новый фронт конкуренции",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    iso3: "VUT",
    periodRu: "2024",
    eventRu: "Землетрясение в Порт-Виле магнитудой 7,3",
    significanceRu: "VMF и партнёры FRANZ — спасательная система страны",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    iso3: "FJI",
    periodRu: "2024–2025",
    eventRu: "Изъятия метамфетамина тоннами и австралийское патрульное сотрудничество",
    significanceRu: "Нарковойна — главный боевой опыт RFMF сегодня",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "AFG",
    periodRu: "2024–2025",
    eventRu: "Пограничные бои с Пакистаном и удары по ТТП",
    significanceRu: "Талибский Афганистан конфликтует уже как государство",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "MDV",
    periodRu: "2024–2025",
    eventRu: "Вывод индийских военных операторов и замена их техническим персоналом; китайский исследовательский флот у атоллов",
    significanceRu: "Маятник Мале качнулся, но не ушёл от Индии полностью",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    iso3: "BRN",
    periodRu: "2024–2025",
    eventRu: "Ввод патрульных кораблей новых классов и учения с партнёрами",
    significanceRu: "Тихая морская модернизация султаната продолжается",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "LAO",
    periodRu: "2024–2025",
    eventRu: "Рейды против мошеннических центров Золотого треугольника при участии Китая",
    significanceRu: "Преступные анклавы стали общей проблемой Вьентьяна и Пекина",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    iso3: "TLS",
    periodRu: "2024–2025",
    eventRu: "Переговоры о газе Greater Sunrise и заявка в АСЕАН на финишной прямой",
    significanceRu: "Фискальное будущее решается в Тиморском море",
    provenance: { source: "Открытые источники", year: 2025, estimated: true },
  },
  {
    iso3: "BTN",
    periodRu: "2024–2025",
    eventRu: "Переговоры с Китаем о границе и «дорожная карта» Тхимпху",
    significanceRu: "Бутан впервые ведёт свою игру между гигантами",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    iso3: "NIC",
    periodRu: "2024–2025",
    eventRu: "Конституционная реформа сопрезидентства Ортеги и Мурильо",
    significanceRu: "Династическая модель оформлена юридически",
    provenance: { source: "Открытые источники", year: 2025, estimated: false },
  },
];

/** Вся хроника событий 2024–2025 по странам волны. */
export const ALL_SECURITY_CHRONICLE: readonly SecurityChronicleEntry[] = [
  ...SECURITY_CHRONICLE_AFRICA,
  ...SECURITY_CHRONICLE_REST,
];

/** События хроники по стране волны. */
export function chronicleForCountry(iso3: string): readonly SecurityChronicleEntry[] {
  return ALL_SECURITY_CHRONICLE.filter((entry) => entry.iso3 === iso3);
}

/** Дополнительные оборонные договоры стран волны. */
export const DEFENSE_TREATIES_MORE: readonly DefenseTreatyEntry[] = [
  {
    countryRu: "Джибути",
    iso3: "DJI",
    partnerRu: "Франция",
    essenceRu: "Оборонный договор 2011 года и крупнейшая французская база в Африке",
    provenance: { source: "Правительство Франции", year: 2024, estimated: false },
  },
  {
    countryRu: "Сенегал",
    iso3: "SEN",
    partnerRu: "Франция",
    essenceRu: "Соглашения о военном сотрудничестве при сокращении французского присутствия в регионе",
    provenance: { source: "Правительство Франции", year: 2024, estimated: true },
  },
  {
    countryRu: "Косово",
    iso3: "XKX",
    partnerRu: "НАТО и США",
    essenceRu: "KFOR по резолюции 1244 и обязательства по трансформации KSF при консультациях с НАТО",
    provenance: { source: "НАТО", year: 2024, estimated: false },
  },
  {
    countryRu: "Молдова",
    iso3: "MDA",
    partnerRu: "Европейский союз",
    essenceRu: "Партнёрство в области безопасности и обороны с ЕС (2024) и поставки через Европейский фонд мира",
    provenance: { source: "ЕС", year: 2024, estimated: false },
  },
  {
    countryRu: "Гана",
    iso3: "GHA",
    partnerRu: "США",
    essenceRu: "Соглашение о статусе сил и оборонном сотрудничестве (2018) при спорах о «базе»",
    provenance: { source: "Госдепартамент США", year: 2024, estimated: false },
  },
  {
    countryRu: "Руанда",
    iso3: "RWA",
    partnerRu: "Мозамбик и ЦАР",
    essenceRu: "Двусторонние военные соглашения: контингенты в Кабу-Делгаду и охрана в Банги",
    provenance: { source: "Открытые источники", year: 2024, estimated: true },
  },
  {
    countryRu: "Белиз",
    iso3: "BLZ",
    partnerRu: "Великобритания",
    essenceRu: "Исторические гарантии и учебное присутствие BATSUB при споре с Гватемалой",
    provenance: { source: "Правительство Великобритании", year: 2024, estimated: true },
  },
  {
    countryRu: "Тринидад и Тобаго",
    iso3: "TTO",
    partnerRu: "США",
    essenceRu: "Соглашение о статусе сил (обновлено в 2024 году) и сотрудничество против трафика",
    provenance: { source: "Госдепартамент США", year: 2024, estimated: false },
  },
  {
    countryRu: "Вануату",
    iso3: "VUT",
    partnerRu: "Австралия",
    essenceRu: "Соглашение о безопасности и развитии (2022) при отказе Порт-Вилы ратифицировать в полном виде",
    provenance: { source: "Правительство Австралии", year: 2024, estimated: true },
  },
  {
    countryRu: "Тонга",
    iso3: "TON",
    partnerRu: "Австралия и Новая Зеландия",
    essenceRu: "Программы оборонного сотрудничества и подготовка HMAF",
    provenance: { source: "Правительство Австралии", year: 2024, estimated: true },
  },
  {
    countryRu: "Чад",
    iso3: "TCD",
    partnerRu: "Франция (пересмотр)",
    essenceRu: "Разрыв оборонных соглашений в конце 2024 года и вывод французских сил",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
  {
    countryRu: "Мали, Буркина-Фасо, Нигер",
    iso3: "MLI",
    partnerRu: "Друг с другом (AES)",
    essenceRu: "Хартия Липтако-Гурма и конфедеративный договор AES о совместной обороне",
    provenance: { source: "Открытые источники", year: 2024, estimated: false },
  },
];

/** Все оборонные договоры реестров волны одним списком. */
export const ALL_DEFENSE_TREATIES: readonly DefenseTreatyEntry[] = [
  ...DEFENSE_TREATIES,
  ...DEFENSE_TREATIES_MORE,
];
