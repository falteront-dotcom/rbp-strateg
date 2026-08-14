// ─────────────────────────────────────────────────────────────────────────────
// Data Source Quality Assessment
// Tracks quality, coverage, and freshness of all data sources
// Used for confidence ratings on country data
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import type { RawCountryRow } from "@/db/country-mapper";

export type DataSourceType = "gfp" | "worldbank" | "fas" | "sipri" | "iiss" | "cia" | "un" | "custom";

export interface DataSourceProfile {
  id: DataSourceType;
  name: string;
  nameRu: string;
  url: string;
  updateFrequency: string;
  coverageScore: number;       // 0-1: how many countries covered
  accuracyScore: number;       // 0-1: accuracy vs ground truth
  timelinessScore: number;     // 0-1: how recent the data is
  reliabilityScore: number;    // 0-1: source reliability
  fields: string[];            // Which fields this source provides
  limitations: string[];       // Known limitations
  lastUpdated: string;
}

export interface DataQualityReport {
  isoCode: string;
  overallQuality: number;      // 0-1
  sourceCount: number;
  sources: Array<{
    source: DataSourceType;
    coverage: number;           // 0-1
    freshness: string;
    confidence: number;         // 0-5 stars
  }>;
  missingFields: string[];
  warnings: string[];
  recommendations: string[];
}

// ─── Source Profiles ──────────────────────────────────────────────────────────
export const DATA_SOURCES: DataSourceProfile[] = [
  {
    id: "gfp",
    name: "Global Firepower Index",
    nameRu: "Индекс глобальной мощи (GFP)",
    url: "globalfirepower.com",
    updateFrequency: "Ежегодно (январь)",
    coverageScore: 0.55,       // 145/263 countries
    accuracyScore: 0.75,
    timelinessScore: 0.8,      // 2025 data
    reliabilityScore: 0.7,
    fields: ["activePersonnel", "totalTanks", "totalAircraft", "totalNavy", "defensePctGdp", "oilProduction", "airfields", "ports", "merchantFleet", "roadways", "railways"],
    limitations: [
      "Не публикует точные числа — только ранги и диапазоны",
      "Закрытая методология: веса компонентов не раскрыты",
      "Некоторые данные устарели (особенно после СВО)",
      "Ядерное оружие не включено в индекс",
    ],
    lastUpdated: "2025-01-01",
  },
  {
    id: "worldbank",
    name: "World Bank Open Data",
    nameRu: "Мировой банк (World Bank)",
    url: "data.worldbank.org",
    updateFrequency: "Ежегодно (июль)",
    coverageScore: 0.85,       // 217/263 countries
    accuracyScore: 0.9,
    timelinessScore: 0.7,      // 1-2 year lag
    reliabilityScore: 0.95,
    fields: ["gdpPppBn", "populationM", "militaryBudgetBn", "defensePctGdp", "roadways", "railways"],
    limitations: [
      "Военный бюджет — самоотчёт стран, не проверяется",
      "Некоторые страны не публикуют бюджет (КНДР, Эритрея)",
      "ВВП ППС — спорная метрика для военной мощи",
      "1-2 года задержка в публикации",
    ],
    lastUpdated: "2024-07-01",
  },
  {
    id: "fas",
    name: "FAS Nuclear Notebook",
    nameRu: "Ядерный блокнот FAS",
    url: "fas.org/nuclear-notebook",
    updateFrequency: "Ежеквартально",
    coverageScore: 0.03,       // 9 nuclear states
    accuracyScore: 0.85,
    timelinessScore: 0.9,
    reliabilityScore: 0.9,
    fields: ["nuclearWarheads"],
    limitations: [
      "Только ядерные державы",
      "Оценки — точные числа засекречены",
      "Израиль: неподтверждённые данные (амбигоность)",
      "КНДР: оценки разнятся от 30 до 100",
    ],
    lastUpdated: "2025-01-15",
  },
  {
    id: "sipri",
    name: "SIPRI Arms Transfers & Military Expenditure",
    nameRu: "СИПРИ (Стокгольмский институт исследований проблем мира)",
    url: "sipri.org",
    updateFrequency: "Ежегодно (апрель)",
    coverageScore: 0.65,
    accuracyScore: 0.85,
    timelinessScore: 0.8,
    reliabilityScore: 0.9,
    fields: ["militaryBudgetBn", "defensePctGdp", "armsExports", "armsImports"],
    limitations: [
      "Военный бюджет в текущих долларах (не ППС)",
      "Некоторые данные оценочные",
      "Задержка 1 год в публикации",
    ],
    lastUpdated: "2024-04-01",
  },
  {
    id: "iiss",
    name: "IISS Military Balance",
    nameRu: "Военный баланс IISS",
    url: "iiss.org/militarybalance",
    updateFrequency: "Ежегодно (февраль)",
    coverageScore: 0.7,
    accuracyScore: 0.9,
    timelinessScore: 0.85,
    reliabilityScore: 0.95,
    fields: ["activePersonnel", "reservePersonnel", "totalTanks", "totalAircraft", "totalNavy", "paramilitary"],
    limitations: [
      "Платная подписка ($500+)",
      "Некоторые страны не раскрывают данные",
      "Числа ОШК — могут быть номинальными (не боеготовыми)",
    ],
    lastUpdated: "2025-02-01",
  },
  {
    id: "cia",
    name: "CIA World Factbook",
    nameRu: "Справочник ЦРУ",
    url: "cia.gov/the-world-factbook",
    updateFrequency: "Еженедельно",
    coverageScore: 0.9,
    accuracyScore: 0.8,
    timelinessScore: 0.85,
    reliabilityScore: 0.75,
    fields: ["populationM", "gdpPppBn", "militaryBudgetBn", "defensePctGdp", "roadways", "railways", "airfields", "ports", "coastline"],
    limitations: [
      "Данные из разных источников — непоследовательность",
      "Военный бюджет может быть устаревшим",
      "Некоторые страны: преднамеренная дезинформация",
    ],
    lastUpdated: "2025-05-01",
  },
  {
    id: "un",
    name: "UN Demographic & Economic Data",
    nameRu: "Данные ООН",
    url: "data.un.org",
    updateFrequency: "Ежегодно",
    coverageScore: 0.95,
    accuracyScore: 0.85,
    timelinessScore: 0.7,
    reliabilityScore: 0.9,
    fields: ["populationM", "gdpPppBn", "fitForServiceM"],
    limitations: [
      "Нет военных данных напрямую",
      "Население — прогнозы, не перепись",
      "ВВП — проблемы с теневой экономикой",
    ],
    lastUpdated: "2024-07-01",
  },
];

// ─── Quality Assessment Functions ────────────────────────────────────────────

export function assessDataQuality(
  isoCode: string,
  availableSources: DataSourceType[],
  missingFields: string[],
): DataQualityReport {
  const sources = availableSources.map((s) => {
    const profile = DATA_SOURCES.find((p) => p.id === s);
    return {
      source: s,
      coverage: profile?.coverageScore ?? 0,
      freshness: profile?.lastUpdated ?? "unknown",
      confidence: Math.round((profile?.reliabilityScore ?? 0) * 5),
    };
  });

  const avgSourceScore = sources.reduce((s, src) => s + src.coverage, 0) / Math.max(sources.length, 1);
  const overallQuality = Math.min(1, (avgSourceScore * 0.4 + (sources.length / 7) * 0.3 + (missingFields.length === 0 ? 0.3 : 0.1)));

  const warnings: string[] = [];
  if (missingFields.includes("militaryBudgetBn")) warnings.push("Военный бюджет отсутствует — БП неточный");
  if (missingFields.includes("totalTanks")) warnings.push("Данные по танкам отсутствуют — оружейный балл занижен");
  if (sources.length < 2) warnings.push("Только 1 источник — высокий риск неточности");

  const recommendations: string[] = [];
  if (sources.length < 3) recommendations.push("Рекомендуется дополнить данные из IISS Military Balance");
  if (missingFields.includes("nuclearWarheads") && ["USA", "RUS", "CHN", "GBR", "FRA", "IND", "PAK", "PRK", "ISR"].includes(isoCode)) {
    recommendations.push("Ядерная держава без данных о боеголовках — добавить FAS Nuclear Notebook");
  }

  return {
    isoCode,
    overallQuality: Math.round(overallQuality * 100) / 100,
    sourceCount: sources.length,
    sources,
    missingFields,
    warnings,
    recommendations,
  };
}

export function getDataSourceProfile(id: DataSourceType): DataSourceProfile | undefined {
  return DATA_SOURCES.find((s) => s.id === id);
}

export function getAllDataSources(): DataSourceProfile[] {
  return DATA_SOURCES;
}

export function getSourcesForField(field: string): DataSourceProfile[] {
  return DATA_SOURCES.filter((s) => s.fields.includes(field));
}

// ─── Missing-field detection (zero is a valid value, not missing) ─────────────

/**
 * Per-field presence rule for the raw snake_case SQLite row.
 *
 * - `required-string`: a genuine required string, missing when empty/whitespace.
 * - `nullable-number`: a numeric column that may genuinely be NULL; `null` /
 *   `undefined` means the data is ABSENT (missing), while the numeric value
 *   `0` is a legitimate, present measurement.
 *
 * NOT-NULL numeric columns (area, personnel, tanks, aircraft, ships,
 * submarines, carriers, ports, airfields, ...) are intentionally absent from
 * this list: their schema guarantees a value and a `0` is a real measurement
 * (a country with 0 submarines/carriers is complete data, not a gap). The
 * optional `coalition` membership (`null` = non-aligned) is also never
 * reported as missing — being non-aligned is a valid state, not missing data.
 */
const FIELD_PRESENCE_RULES: ReadonlyArray<{
  raw: keyof RawCountryRow;
  camel: string;
  kind: "required-string" | "nullable-number";
}> = [
  { raw: "iso_code", camel: "isoCode", kind: "required-string" },
  { raw: "name", camel: "name", kind: "required-string" },
  { raw: "name_ru", camel: "nameRu", kind: "required-string" },
  { raw: "side", camel: "side", kind: "required-string" },
  { raw: "climate_zone", camel: "climateZone", kind: "required-string" },
  { raw: "updated_at", camel: "updatedAt", kind: "required-string" },
  // Nullable numeric: NULL = genuinely absent, 0 = present-and-zero.
  { raw: "nuclear_warheads", camel: "nuclearWarheads", kind: "nullable-number" },
  { raw: "bp_total", camel: "bpTotal", kind: "nullable-number" },
  { raw: "bp_weapon", camel: "bpWeapon", kind: "nullable-number" },
  { raw: "bp_manpower", camel: "bpManpower", kind: "nullable-number" },
  { raw: "bp_logistics", camel: "bpLogistics", kind: "nullable-number" },
  { raw: "bp_c2", camel: "bpC2", kind: "nullable-number" },
  { raw: "bp_economy", camel: "bpEconomy", kind: "nullable-number" },
  { raw: "bp_doctrine", camel: "bpDoctrine", kind: "nullable-number" },
  { raw: "bp_readiness", camel: "bpReadiness", kind: "nullable-number" },
  { raw: "bp_terrain", camel: "bpTerrain", kind: "nullable-number" },
];

/**
 * Compute the genuinely-missing data fields from a RAW snake_case country row.
 *
 * A numeric field is "missing" ONLY when it is `null`/`undefined` — a
 * legitimate `0` (0 nuclear warheads, 0 aircraft carriers, 0 submarines, or a
 * 0 BP component) is a valid, present value and is never reported missing.
 * Required strings are missing only when empty/whitespace. The optional
 * `coalition` membership is never missing. Returns the public camelCase field
 * names so callers keep the existing public contract.
 */
export function computeMissingFields(row: RawCountryRow): string[] {
  const missing: string[] = [];
  for (const rule of FIELD_PRESENCE_RULES) {
    const value = row[rule.raw];
    if (rule.kind === "required-string") {
      if (typeof value !== "string" || value.trim() === "") {
        missing.push(rule.camel);
      }
    } else {
      // nullable-number: missing only when absent; numeric zero is present.
      if (value === null || value === undefined) {
        missing.push(rule.camel);
      }
    }
  }
  return missing;
}
