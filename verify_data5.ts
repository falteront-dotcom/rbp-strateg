// ─────────────────────────────────────────────────────────────────────────────
// Самопроверки Волны 7 «Данные: полный охват стран» (data5)
// Запуск: собрать esbuild-бандл в память и выполнить node, либо npx tsx.
// Каждая проверка печатает PASS/FAIL; итоговая строка — сводка,
// код выхода 1 при любом FAIL.
// РБП-Стратег 3.0
//
// Проверяется:
// 1) покрытие: реестр COUNTRY_NAMES_RU (196 ключей, включая алиас PHI)
//    полностью равен объединению волн bp3 ∪ warfare3 ∪ data3 ∪ data5;
//    непокрытые страны перечисляются поименно;
// 2) статическая таблица ожиданий EXPECTED_REGISTRY_WAVES совпадает
//    с фактической принадлежностью кодов волнам по импортам;
// 3) уникальность iso3 внутри data5 и отсутствие пересечений с другими
//    волнами;
// 4) бюджеты и численность: значения либо null (честный пробел данных),
//    либо неотрицательные числа;
// 5) у каждого профиля заполнен провенанс всех ключевых секций;
// 6) ростер data5: регион и статус армии каждого профиля совпадают
//    с таблицей EXPECTED_DATA5_ROSTER;
// 7) агрегаты: алиас PHI исключён из сумм (101 страна при 102 профилях),
//    региональные счётчики совпадают с EXPECTED_REGION_COUNTS;
// 8) справочные реестры агрегатов (роли, паспорта) покрывают все 102 кода.
// ─────────────────────────────────────────────────────────────────────────────

import { COUNTRY_NAMES_RU } from "./src/lib/geo/country-names-ru.js";
import { TOP30_BP3_INPUTS } from "./src/lib/bp3/data/top30-uav-munitions.js";
import { TOP30_SUSTAINABILITY } from "./src/lib/warfare3/data/top30-sustainability.js";
import { COUNTRY_PROFILES_60 } from "./src/lib/data3/country-profiles-60.js";
import {
  REST_COUNTRY_PROFILES,
  REST_ISO3_CODES,
  type RestCountryProfile,
} from "./src/lib/data5/country-profiles-rest.js";
import {
  ALL_COUNTRY_BENCHMARKS,
  ALL_COUNTRY_PASSPORTS,
  ALL_COUNTRY_REGION_ROLES,
  ALL_DATA_QUALITY,
  ALL_SECURITY_CHRONICLE,
  REGION_ANALYTICAL_PROFILES,
  REGION_RANKINGS,
  REGION_SPENDING_SERIES,
  SUBREGION_ANALYSES,
  aggregateRegion,
  data5Regions,
  summarizeData5,
} from "./src/lib/data5/regional-aggregates.js";

// ─────────────────────────────────────────────────────────────────────────────
// Каркас проверок
// ─────────────────────────────────────────────────────────────────────────────

let totalChecks: number = 0;
let failedChecks: number = 0;

/** Одна именованная проверка с деталями при провале. */
function check(name: string, ok: boolean, details: string): void {
  totalChecks += 1;
  if (ok) {
    console.log(`PASS ${name}`);
  } else {
    failedChecks += 1;
    console.log(`FAIL ${name} :: ${details}`);
  }
}

/** Человекочитаемое имя страны по реестру. */
function registryName(iso3: string): string {
  const names: Record<string, string> = COUNTRY_NAMES_RU;
  return names[iso3] ?? iso3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Таблица ожиданий: волна каждого ключа реестра
// ─────────────────────────────────────────────────────────────────────────────

/** Волна проекта, которой принадлежит код реестра. */
export type ExpectedWave = "bp3" | "warfare3" | "data3" | "data5";

/** Ожидаемая принадлежность кода реестра одной из волн. */
export interface ExpectedRegistryEntry {
  /** Код ISO3 (или алиас PHI). */
  iso3: string;
  /** Русское имя по реестру. */
  nameRu: string;
  /** Волна, покрывающая код. */
  wave: ExpectedWave;
}

/** Ожидания по реестру, часть 1 (A–C). */
export const EXPECTED_REGISTRY_WAVES_A: readonly ExpectedRegistryEntry[] = [
  { iso3: "AFG", nameRu: "Афганистан", wave: "data5" },
  { iso3: "ALB", nameRu: "Албания", wave: "data5" },
  { iso3: "DZA", nameRu: "Алжир", wave: "warfare3" },
  { iso3: "AND", nameRu: "Андорра", wave: "data5" },
  { iso3: "AGO", nameRu: "Ангола", wave: "data3" },
  { iso3: "ATG", nameRu: "Антигуа и Барбуда", wave: "data5" },
  { iso3: "ARG", nameRu: "Аргентина", wave: "data3" },
  { iso3: "ARM", nameRu: "Армения", wave: "data3" },
  { iso3: "AUS", nameRu: "Австралия", wave: "bp3" },
  { iso3: "AUT", nameRu: "Австрия", wave: "data3" },
  { iso3: "AZE", nameRu: "Азербайджан", wave: "data3" },
  { iso3: "BHS", nameRu: "Багамские Острова", wave: "data5" },
  { iso3: "BHR", nameRu: "Бахрейн", wave: "data5" },
  { iso3: "BGD", nameRu: "Бангладеш", wave: "data3" },
  { iso3: "BRB", nameRu: "Барбадос", wave: "data5" },
  { iso3: "BLR", nameRu: "Беларусь", wave: "data3" },
  { iso3: "BEL", nameRu: "Бельгия", wave: "data3" },
  { iso3: "BLZ", nameRu: "Белиз", wave: "data5" },
  { iso3: "BEN", nameRu: "Бенин", wave: "data5" },
  { iso3: "BTN", nameRu: "Бутан", wave: "data5" },
  { iso3: "BOL", nameRu: "Боливия", wave: "data3" },
  { iso3: "BIH", nameRu: "Босния и Герцеговина", wave: "data5" },
  { iso3: "BWA", nameRu: "Ботсвана", wave: "data5" },
  { iso3: "BRA", nameRu: "Бразилия", wave: "bp3" },
  { iso3: "BRN", nameRu: "Бруней", wave: "data5" },
  { iso3: "BGR", nameRu: "Болгария", wave: "data3" },
  { iso3: "BFA", nameRu: "Буркина-Фасо", wave: "data5" },
  { iso3: "BDI", nameRu: "Бурунди", wave: "data5" },
  { iso3: "CPV", nameRu: "Кабо-Верде", wave: "data5" },
  { iso3: "KHM", nameRu: "Камбоджа", wave: "data3" },
  { iso3: "CMR", nameRu: "Камерун", wave: "data5" },
  { iso3: "CAN", nameRu: "Канада", wave: "bp3" },
  { iso3: "CAF", nameRu: "ЦАР", wave: "data5" },
  { iso3: "TCD", nameRu: "Чад", wave: "data5" },
  { iso3: "CHL", nameRu: "Чили", wave: "data3" },
  { iso3: "CHN", nameRu: "Китай", wave: "bp3" },
  { iso3: "COL", nameRu: "Колумбия", wave: "data3" },
  { iso3: "COM", nameRu: "Коморы", wave: "data5" },
  { iso3: "COG", nameRu: "Республика Конго", wave: "data5" },
  { iso3: "COD", nameRu: "ДР Конго", wave: "data5" },
  { iso3: "CRI", nameRu: "Коста-Рика", wave: "data5" },
  { iso3: "CIV", nameRu: "Кот-д'Ивуар", wave: "data5" },
  { iso3: "HRV", nameRu: "Хорватия", wave: "data3" },
  { iso3: "CUB", nameRu: "Куба", wave: "data3" },
  { iso3: "CYP", nameRu: "Кипр", wave: "data5" },
  { iso3: "CZE", nameRu: "Чехия", wave: "data3" },
];

/** Ожидания по реестру, часть 2 (D–K). */
export const EXPECTED_REGISTRY_WAVES_B: readonly ExpectedRegistryEntry[] = [
  { iso3: "DNK", nameRu: "Дания", wave: "data3" },
  { iso3: "DJI", nameRu: "Джибути", wave: "data5" },
  { iso3: "DMA", nameRu: "Доминика", wave: "data5" },
  { iso3: "DOM", nameRu: "Доминиканская Республика", wave: "data5" },
  { iso3: "ECU", nameRu: "Эквадор", wave: "data3" },
  { iso3: "EGY", nameRu: "Египет", wave: "bp3" },
  { iso3: "SLV", nameRu: "Сальвадор", wave: "data5" },
  { iso3: "GNQ", nameRu: "Экваториальная Гвинея", wave: "data5" },
  { iso3: "ERI", nameRu: "Эритрея", wave: "data5" },
  { iso3: "EST", nameRu: "Эстония", wave: "data3" },
  { iso3: "SWZ", nameRu: "Эсватини", wave: "data5" },
  { iso3: "ETH", nameRu: "Эфиопия", wave: "data3" },
  { iso3: "FJI", nameRu: "Фиджи", wave: "data5" },
  { iso3: "FIN", nameRu: "Финляндия", wave: "bp3" },
  { iso3: "FRA", nameRu: "Франция", wave: "bp3" },
  { iso3: "GAB", nameRu: "Габон", wave: "data5" },
  { iso3: "GMB", nameRu: "Гамбия", wave: "data5" },
  { iso3: "GEO", nameRu: "Грузия", wave: "data3" },
  { iso3: "DEU", nameRu: "Германия", wave: "bp3" },
  { iso3: "GHA", nameRu: "Гана", wave: "data5" },
  { iso3: "GRC", nameRu: "Греция", wave: "bp3" },
  { iso3: "GRD", nameRu: "Гренада", wave: "data5" },
  { iso3: "GTM", nameRu: "Гватемала", wave: "data5" },
  { iso3: "GIN", nameRu: "Гвинея", wave: "data5" },
  { iso3: "GNB", nameRu: "Гвинея-Бисау", wave: "data5" },
  { iso3: "GUY", nameRu: "Гайана", wave: "data5" },
  { iso3: "HTI", nameRu: "Гаити", wave: "data5" },
  { iso3: "HND", nameRu: "Гондурас", wave: "data5" },
  { iso3: "HUN", nameRu: "Венгрия", wave: "data3" },
  { iso3: "ISL", nameRu: "Исландия", wave: "data5" },
  { iso3: "IND", nameRu: "Индия", wave: "bp3" },
  { iso3: "IDN", nameRu: "Индонезия", wave: "bp3" },
  { iso3: "IRN", nameRu: "Иран", wave: "bp3" },
  { iso3: "IRQ", nameRu: "Ирак", wave: "data3" },
  { iso3: "IRL", nameRu: "Ирландия", wave: "data5" },
  { iso3: "ISR", nameRu: "Израиль", wave: "bp3" },
  { iso3: "ITA", nameRu: "Италия", wave: "bp3" },
  { iso3: "JAM", nameRu: "Ямайка", wave: "data5" },
  { iso3: "JPN", nameRu: "Япония", wave: "bp3" },
  { iso3: "JOR", nameRu: "Иордания", wave: "data3" },
  { iso3: "KAZ", nameRu: "Казахстан", wave: "data3" },
  { iso3: "KEN", nameRu: "Кения", wave: "data3" },
  { iso3: "KIR", nameRu: "Кирибати", wave: "data5" },
  { iso3: "PRK", nameRu: "КНДР", wave: "bp3" },
  { iso3: "KOR", nameRu: "Республика Корея", wave: "bp3" },
  { iso3: "KWT", nameRu: "Кувейт", wave: "data3" },
  { iso3: "KGZ", nameRu: "Кыргызстан", wave: "data5" },
];

/** Ожидания по реестру, часть 3 (L–R). */
export const EXPECTED_REGISTRY_WAVES_C: readonly ExpectedRegistryEntry[] = [
  { iso3: "LAO", nameRu: "Лаос", wave: "data5" },
  { iso3: "LVA", nameRu: "Латвия", wave: "data3" },
  { iso3: "LBN", nameRu: "Ливан", wave: "data3" },
  { iso3: "LIE", nameRu: "Лихтенштейн", wave: "data5" },
  { iso3: "LSO", nameRu: "Лесото", wave: "data5" },
  { iso3: "LBR", nameRu: "Либерия", wave: "data5" },
  { iso3: "LBY", nameRu: "Ливия", wave: "data3" },
  { iso3: "LTU", nameRu: "Литва", wave: "data3" },
  { iso3: "LUX", nameRu: "Люксембург", wave: "data5" },
  { iso3: "MDG", nameRu: "Мадагаскар", wave: "data5" },
  { iso3: "MWI", nameRu: "Малави", wave: "data5" },
  { iso3: "MYS", nameRu: "Малайзия", wave: "data3" },
  { iso3: "MDV", nameRu: "Мальдивы", wave: "data5" },
  { iso3: "MLI", nameRu: "Мали", wave: "data5" },
  { iso3: "MLT", nameRu: "Мальта", wave: "data5" },
  { iso3: "MHL", nameRu: "Маршалловы Острова", wave: "data5" },
  { iso3: "MRT", nameRu: "Мавритания", wave: "data5" },
  { iso3: "MUS", nameRu: "Маврикий", wave: "data5" },
  { iso3: "MEX", nameRu: "Мексика", wave: "warfare3" },
  { iso3: "FSM", nameRu: "Микронезия", wave: "data5" },
  { iso3: "MDA", nameRu: "Молдова", wave: "data5" },
  { iso3: "MCO", nameRu: "Монако", wave: "data5" },
  { iso3: "MNG", nameRu: "Монголия", wave: "data3" },
  { iso3: "MNE", nameRu: "Черногория", wave: "data5" },
  { iso3: "MAR", nameRu: "Марокко", wave: "data3" },
  { iso3: "MOZ", nameRu: "Мозамбик", wave: "data3" },
  { iso3: "MMR", nameRu: "Мьянма", wave: "data3" },
  { iso3: "NAM", nameRu: "Намибия", wave: "data5" },
  { iso3: "NPL", nameRu: "Непал", wave: "data3" },
  { iso3: "NLD", nameRu: "Нидерланды", wave: "data3" },
  { iso3: "NZL", nameRu: "Новая Зеландия", wave: "data3" },
  { iso3: "NIC", nameRu: "Никарагуа", wave: "data5" },
  { iso3: "NER", nameRu: "Нигер", wave: "data5" },
  { iso3: "NGA", nameRu: "Нигерия", wave: "data3" },
  { iso3: "MKD", nameRu: "Северная Македония", wave: "data5" },
  { iso3: "NOR", nameRu: "Норвегия", wave: "data3" },
  { iso3: "OMN", nameRu: "Оман", wave: "data3" },
  { iso3: "PAK", nameRu: "Пакистан", wave: "bp3" },
  { iso3: "PLW", nameRu: "Палау", wave: "data5" },
  { iso3: "PAN", nameRu: "Панама", wave: "data5" },
  { iso3: "PNG", nameRu: "Папуа — Новая Гвинея", wave: "data5" },
  { iso3: "PRY", nameRu: "Парагвай", wave: "data3" },
  { iso3: "PER", nameRu: "Перу", wave: "data3" },
  { iso3: "PHL", nameRu: "Филиппины", wave: "data3" },
  { iso3: "PHI", nameRu: "Филиппины", wave: "data5" },
  { iso3: "POL", nameRu: "Польша", wave: "bp3" },
  { iso3: "PRT", nameRu: "Португалия", wave: "data3" },
  { iso3: "QAT", nameRu: "Катар", wave: "data3" },
  { iso3: "ROU", nameRu: "Румыния", wave: "data3" },
  { iso3: "RUS", nameRu: "Россия", wave: "bp3" },
  { iso3: "RWA", nameRu: "Руанда", wave: "data5" },
];

/** Ожидания по реестру, часть 4 (S–Z и особые территории). */
export const EXPECTED_REGISTRY_WAVES_D: readonly ExpectedRegistryEntry[] = [
  { iso3: "KNA", nameRu: "Сент-Китс и Невис", wave: "data5" },
  { iso3: "LCA", nameRu: "Сент-Люсия", wave: "data5" },
  { iso3: "VCT", nameRu: "Сент-Винсент и Гренадины", wave: "data5" },
  { iso3: "WSM", nameRu: "Самоа", wave: "data5" },
  { iso3: "SMR", nameRu: "Сан-Марино", wave: "data5" },
  { iso3: "STP", nameRu: "Сан-Томе и Принсипи", wave: "data5" },
  { iso3: "SAU", nameRu: "Саудовская Аравия", wave: "bp3" },
  { iso3: "SEN", nameRu: "Сенегал", wave: "data5" },
  { iso3: "SRB", nameRu: "Сербия", wave: "data3" },
  { iso3: "SYC", nameRu: "Сейшелы", wave: "data5" },
  { iso3: "SLE", nameRu: "Сьерра-Леоне", wave: "data5" },
  { iso3: "SGP", nameRu: "Сингапур", wave: "data3" },
  { iso3: "SVK", nameRu: "Словакия", wave: "data3" },
  { iso3: "SVN", nameRu: "Словения", wave: "data5" },
  { iso3: "SLB", nameRu: "Соломоновы Острова", wave: "data5" },
  { iso3: "SOM", nameRu: "Сомали", wave: "data5" },
  { iso3: "ZAF", nameRu: "ЮАР", wave: "warfare3" },
  { iso3: "SSD", nameRu: "Южный Судан", wave: "data5" },
  { iso3: "ESP", nameRu: "Испания", wave: "bp3" },
  { iso3: "LKA", nameRu: "Шри-Ланка", wave: "data3" },
  { iso3: "SDN", nameRu: "Судан", wave: "data3" },
  { iso3: "SUR", nameRu: "Суринам", wave: "data5" },
  { iso3: "SWE", nameRu: "Швеция", wave: "bp3" },
  { iso3: "CHE", nameRu: "Швейцария", wave: "data5" },
  { iso3: "SYR", nameRu: "Сирия", wave: "data3" },
  { iso3: "TJK", nameRu: "Таджикистан", wave: "data5" },
  { iso3: "TZA", nameRu: "Танзания", wave: "data3" },
  { iso3: "THA", nameRu: "Таиланд", wave: "warfare3" },
  { iso3: "TLS", nameRu: "Тимор-Лесте", wave: "data5" },
  { iso3: "TGO", nameRu: "Того", wave: "data5" },
  { iso3: "TON", nameRu: "Тонга", wave: "data5" },
  { iso3: "TTO", nameRu: "Тринидад и Тобаго", wave: "data5" },
  { iso3: "TUN", nameRu: "Тунис", wave: "data3" },
  { iso3: "TUR", nameRu: "Турция", wave: "bp3" },
  { iso3: "TKM", nameRu: "Туркменистан", wave: "data5" },
  { iso3: "TUV", nameRu: "Тувалу", wave: "data5" },
  { iso3: "UGA", nameRu: "Уганда", wave: "data5" },
  { iso3: "UKR", nameRu: "Украина", wave: "bp3" },
  { iso3: "ARE", nameRu: "ОАЭ", wave: "bp3" },
  { iso3: "GBR", nameRu: "Великобритания", wave: "bp3" },
  { iso3: "USA", nameRu: "США", wave: "bp3" },
  { iso3: "URY", nameRu: "Уругвай", wave: "data3" },
  { iso3: "UZB", nameRu: "Узбекистан", wave: "data3" },
  { iso3: "VUT", nameRu: "Вануату", wave: "data5" },
  { iso3: "VEN", nameRu: "Венесуэла", wave: "data3" },
  { iso3: "VNM", nameRu: "Вьетнам", wave: "bp3" },
  { iso3: "YEM", nameRu: "Йемен", wave: "data3" },
  { iso3: "ZMB", nameRu: "Замбия", wave: "data5" },
  { iso3: "ZWE", nameRu: "Зимбабве", wave: "data5" },
  { iso3: "TWN", nameRu: "Тайвань", wave: "bp3" },
  { iso3: "XKX", nameRu: "Косово", wave: "data5" },
  { iso3: "PSE", nameRu: "Палестина", wave: "data5" },
];

/** Полная таблица ожиданий по реестру (196 записей). */
export const EXPECTED_REGISTRY_WAVES: readonly ExpectedRegistryEntry[] = [
  ...EXPECTED_REGISTRY_WAVES_A,
  ...EXPECTED_REGISTRY_WAVES_B,
  ...EXPECTED_REGISTRY_WAVES_C,
  ...EXPECTED_REGISTRY_WAVES_D,
];

// ─────────────────────────────────────────────────────────────────────────────
// Таблица ожиданий: ростер волны data5 (регион и статус армии)
// ─────────────────────────────────────────────────────────────────────────────

/** Ожидаемая строка ростера data5. */
export interface ExpectedData5RosterEntry {
  /** Код ISO3. */
  iso3: string;
  /** Регион профиля (рус.). */
  region: string;
  /** Есть ли стоячая армия. */
  hasStandingArmy: boolean;
}

/** Ростер data5, часть 1: Азия и Европа. */
export const EXPECTED_DATA5_ROSTER_A: readonly ExpectedData5RosterEntry[] = [
  { iso3: "AFG", region: "Южная Азия", hasStandingArmy: true },
  { iso3: "BHR", region: "Ближний Восток", hasStandingArmy: true },
  { iso3: "BTN", region: "Южная Азия", hasStandingArmy: true },
  { iso3: "BRN", region: "Юго-Восточная Азия", hasStandingArmy: true },
  { iso3: "LAO", region: "Юго-Восточная Азия", hasStandingArmy: true },
  { iso3: "MDV", region: "Южная Азия", hasStandingArmy: true },
  { iso3: "TLS", region: "Юго-Восточная Азия", hasStandingArmy: true },
  { iso3: "PHI", region: "Юго-Восточная Азия", hasStandingArmy: true },
  { iso3: "KGZ", region: "Центральная Азия", hasStandingArmy: true },
  { iso3: "TJK", region: "Центральная Азия", hasStandingArmy: true },
  { iso3: "TKM", region: "Центральная Азия", hasStandingArmy: true },
  { iso3: "ALB", region: "Европа", hasStandingArmy: true },
  { iso3: "AND", region: "Европа", hasStandingArmy: false },
  { iso3: "BIH", region: "Европа", hasStandingArmy: true },
  { iso3: "CYP", region: "Европа", hasStandingArmy: true },
  { iso3: "ISL", region: "Европа", hasStandingArmy: false },
  { iso3: "IRL", region: "Европа", hasStandingArmy: true },
  { iso3: "LIE", region: "Европа", hasStandingArmy: false },
  { iso3: "LUX", region: "Европа", hasStandingArmy: true },
  { iso3: "MNE", region: "Европа", hasStandingArmy: true },
  { iso3: "MKD", region: "Европа", hasStandingArmy: true },
  { iso3: "SVN", region: "Европа", hasStandingArmy: true },
  { iso3: "CHE", region: "Европа", hasStandingArmy: true },
  { iso3: "MDA", region: "Восточная Европа", hasStandingArmy: true },
  { iso3: "MCO", region: "Европа", hasStandingArmy: false },
  { iso3: "SMR", region: "Европа", hasStandingArmy: false },
  { iso3: "MLT", region: "Европа", hasStandingArmy: true },
  { iso3: "XKX", region: "Европа", hasStandingArmy: true },
  { iso3: "PSE", region: "Ближний Восток", hasStandingArmy: false },
];

/** Ростер data5, часть 2: Америки. */
export const EXPECTED_DATA5_ROSTER_B: readonly ExpectedData5RosterEntry[] = [
  { iso3: "ATG", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "BHS", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "BRB", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "BLZ", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "CRI", region: "Центральная Америка и Карибы", hasStandingArmy: false },
  { iso3: "DMA", region: "Центральная Америка и Карибы", hasStandingArmy: false },
  { iso3: "DOM", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "SLV", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "GRD", region: "Центральная Америка и Карибы", hasStandingArmy: false },
  { iso3: "GTM", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "HTI", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "HND", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "NIC", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "PAN", region: "Центральная Америка и Карибы", hasStandingArmy: false },
  { iso3: "JAM", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "KNA", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "LCA", region: "Центральная Америка и Карибы", hasStandingArmy: false },
  { iso3: "VCT", region: "Центральная Америка и Карибы", hasStandingArmy: false },
  { iso3: "TTO", region: "Центральная Америка и Карибы", hasStandingArmy: true },
  { iso3: "GUY", region: "Южная Америка", hasStandingArmy: true },
  { iso3: "SUR", region: "Южная Америка", hasStandingArmy: true },
];

/** Ростер data5, часть 3: Африка. */
export const EXPECTED_DATA5_ROSTER_C: readonly ExpectedData5RosterEntry[] = [
  { iso3: "BEN", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "BFA", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "BDI", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "CPV", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "CMR", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "CAF", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "TCD", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "COM", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "COG", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "COD", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "CIV", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "DJI", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "ERI", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "SWZ", region: "Южная Африка", hasStandingArmy: true },
  { iso3: "GAB", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "GMB", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "GHA", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "GIN", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "GNB", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "LBR", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "LSO", region: "Южная Африка", hasStandingArmy: true },
  { iso3: "MDG", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "MWI", region: "Южная Африка", hasStandingArmy: true },
  { iso3: "MLI", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "MRT", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "MUS", region: "Восточная Африка", hasStandingArmy: false },
  { iso3: "NAM", region: "Южная Африка", hasStandingArmy: true },
  { iso3: "NER", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "RWA", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "SEN", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "SYC", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "SLE", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "SOM", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "SSD", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "TGO", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "UGA", region: "Восточная Африка", hasStandingArmy: true },
  { iso3: "BWA", region: "Южная Африка", hasStandingArmy: true },
  { iso3: "GNQ", region: "Центральная Африка", hasStandingArmy: true },
  { iso3: "STP", region: "Западная Африка", hasStandingArmy: true },
  { iso3: "ZMB", region: "Южная Африка", hasStandingArmy: true },
  { iso3: "ZWE", region: "Южная Африка", hasStandingArmy: true },
];

/** Ростер data5, часть 4: Океания. */
export const EXPECTED_DATA5_ROSTER_D: readonly ExpectedData5RosterEntry[] = [
  { iso3: "FJI", region: "Океания", hasStandingArmy: true },
  { iso3: "PNG", region: "Океания", hasStandingArmy: true },
  { iso3: "KIR", region: "Океания", hasStandingArmy: false },
  { iso3: "MHL", region: "Океания", hasStandingArmy: false },
  { iso3: "FSM", region: "Океания", hasStandingArmy: false },
  { iso3: "PLW", region: "Океания", hasStandingArmy: false },
  { iso3: "WSM", region: "Океания", hasStandingArmy: false },
  { iso3: "SLB", region: "Океания", hasStandingArmy: false },
  { iso3: "TON", region: "Океания", hasStandingArmy: true },
  { iso3: "TUV", region: "Океания", hasStandingArmy: false },
  { iso3: "VUT", region: "Океания", hasStandingArmy: false },
];

/** Полный ростер волны data5 (102 записи). */
export const EXPECTED_DATA5_ROSTER: readonly ExpectedData5RosterEntry[] = [
  ...EXPECTED_DATA5_ROSTER_A,
  ...EXPECTED_DATA5_ROSTER_B,
  ...EXPECTED_DATA5_ROSTER_C,
  ...EXPECTED_DATA5_ROSTER_D,
];

// ─────────────────────────────────────────────────────────────────────────────
// Таблица ожиданий: счётчики регионов в агрегатах
// ─────────────────────────────────────────────────────────────────────────────

/** Ожидаемые счётчики региона: профилей всего и стран без алиаса PHI. */
export interface ExpectedRegionCounts {
  /** Регион (рус.). */
  region: string;
  /** Профилей региона (с алиасом, если он в регионе). */
  profileCount: number;
  /** Стран региона в агрегатах (без алиаса). */
  countryCount: number;
}

/** Ожидаемые счётчики всех 13 регионов волны data5. */
export const EXPECTED_REGION_COUNTS: readonly ExpectedRegionCounts[] = [
  { region: "Южная Азия", profileCount: 3, countryCount: 3 },
  { region: "Ближний Восток", profileCount: 2, countryCount: 2 },
  { region: "Юго-Восточная Азия", profileCount: 4, countryCount: 3 },
  { region: "Центральная Азия", profileCount: 3, countryCount: 3 },
  { region: "Европа", profileCount: 16, countryCount: 16 },
  { region: "Восточная Европа", profileCount: 1, countryCount: 1 },
  { region: "Центральная Америка и Карибы", profileCount: 19, countryCount: 19 },
  { region: "Южная Америка", profileCount: 2, countryCount: 2 },
  { region: "Западная Африка", profileCount: 16, countryCount: 16 },
  { region: "Восточная Африка", profileCount: 11, countryCount: 11 },
  { region: "Центральная Африка", profileCount: 7, countryCount: 7 },
  { region: "Южная Африка", profileCount: 7, countryCount: 7 },
  { region: "Океания", profileCount: 11, countryCount: 11 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Фактические наборы кодов по волнам
// ─────────────────────────────────────────────────────────────────────────────

const registryCodes: readonly string[] = Object.keys(COUNTRY_NAMES_RU);
const bp3Codes: ReadonlySet<string> = new Set<string>(
  TOP30_BP3_INPUTS.map((entry) => entry.isoCode),
);
const warfare3Codes: ReadonlySet<string> = new Set<string>(
  TOP30_SUSTAINABILITY.map((entry) => entry.iso3),
);
const data3Codes: ReadonlySet<string> = new Set<string>(
  COUNTRY_PROFILES_60.map((entry) => entry.iso3),
);
const data5Codes: ReadonlySet<string> = new Set<string>(REST_ISO3_CODES);

/** Фактическая волна кода по импортам; null, если код нигде не покрыт. */
function actualWave(iso3: string): ExpectedWave | null {
  if (bp3Codes.has(iso3)) {
    return "bp3";
  }
  if (warfare3Codes.has(iso3)) {
    return "warfare3";
  }
  if (data3Codes.has(iso3)) {
    return "data3";
  }
  if (data5Codes.has(iso3)) {
    return "data5";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Проверки покрытия
// ─────────────────────────────────────────────────────────────────────────────

check(
  "реестр содержит 196 ключей",
  registryCodes.length === 196,
  `фактически ${registryCodes.length}`,
);

check(
  "таблица ожиданий содержит 196 записей",
  EXPECTED_REGISTRY_WAVES.length === 196,
  `фактически ${EXPECTED_REGISTRY_WAVES.length}`,
);

const expectedCodeSet: ReadonlySet<string> = new Set<string>(
  EXPECTED_REGISTRY_WAVES.map((entry) => entry.iso3),
);
check(
  "таблица ожиданий совпадает с ключами реестра",
  expectedCodeSet.size === registryCodes.length &&
    registryCodes.every((code) => expectedCodeSet.has(code)),
  "расхождение кодов между таблицей ожиданий и реестром",
);

const waveMismatches: string[] = [];
for (const entry of EXPECTED_REGISTRY_WAVES) {
  const actual: ExpectedWave | null = actualWave(entry.iso3);
  if (actual !== entry.wave) {
    waveMismatches.push(
      `${entry.iso3} (${entry.nameRu}): ожидание ${entry.wave}, факт ${actual ?? "нет"}`,
    );
  }
}
check(
  "принадлежность кодов волнам совпадает с таблицей ожиданий",
  waveMismatches.length === 0,
  waveMismatches.join("; "),
);

const uncovered: string[] = registryCodes.filter(
  (code) => actualWave(code) === null,
);
check(
  "объединение bp3 ∪ warfare3 ∪ data3 ∪ data5 покрывает весь реестр",
  uncovered.length === 0,
  uncovered.length === 0
    ? ""
    : `не покрыты поименно: ${uncovered
        .map((code) => `${code} (${registryName(code)})`)
        .join(", ")}`,
);
if (uncovered.length > 0) {
  console.log(
    `Непокрытые страны: ${uncovered
      .map((code) => `${registryName(code)} [${code}]`)
      .join(", ")}`,
  );
}

const foreignCodes: string[] = [...data5Codes].filter(
  (code) => !expectedCodeSet.has(code),
);
check(
  "все коды data5 принадлежат реестру",
  foreignCodes.length === 0,
  foreignCodes.join(", "),
);

check(
  "профилей data5 ровно 102",
  REST_COUNTRY_PROFILES.length === 102,
  `фактически ${REST_COUNTRY_PROFILES.length}`,
);

check(
  "коды iso3 внутри data5 уникальны",
  data5Codes.size === REST_COUNTRY_PROFILES.length,
  `уникальных ${data5Codes.size} при ${REST_COUNTRY_PROFILES.length} профилях`,
);

const overlaps: string[] = [...data5Codes].filter(
  (code) => bp3Codes.has(code) || warfare3Codes.has(code) || data3Codes.has(code),
);
check(
  "data5 не пересекается с bp3, warfare3 и data3",
  overlaps.length === 0,
  overlaps.join(", "),
);

// ─────────────────────────────────────────────────────────────────────────────
// Проверки содержимого профилей
// ─────────────────────────────────────────────────────────────────────────────

/** Неотрицательность числового поля: null допустим, отрицательное — нет. */
function nonNegativeOrNull(value: number | null): boolean {
  return value === null || value >= 0;
}

const badNumbers: string[] = [];
const badProvenance: string[] = [];
const badContent: string[] = [];
for (const profile of REST_COUNTRY_PROFILES) {
  if (!nonNegativeOrNull(profile.budget.amountUsdBn)) {
    badNumbers.push(`${profile.iso3}: бюджет`);
  }
  if (
    profile.budget.shareOfGdpPct !== null &&
    profile.budget.shareOfGdpPct < 0
  ) {
    badNumbers.push(`${profile.iso3}: доля ВВП`);
  }
  if (!nonNegativeOrNull(profile.personnel.active)) {
    badNumbers.push(`${profile.iso3}: активный состав`);
  }
  if (!nonNegativeOrNull(profile.personnel.reserve)) {
    badNumbers.push(`${profile.iso3}: резерв`);
  }
  if (!nonNegativeOrNull(profile.personnel.paramilitary)) {
    badNumbers.push(`${profile.iso3}: военизированные`);
  }
  const provenances = [
    profile.budget.provenance,
    profile.personnel.provenance,
    profile.defenseIndustry.provenance,
    profile.importDependence.provenance,
    profile.modernization.provenance,
  ];
  for (const provenance of provenances) {
    if (provenance.source.trim().length === 0 || provenance.year < 1990) {
      badProvenance.push(profile.iso3);
      break;
    }
  }
  if (profile.vulnerabilities.length < 1) {
    badContent.push(`${profile.iso3}: нет уязвимостей`);
  }
  if (profile.nameRu.trim().length === 0 || profile.region.trim().length === 0) {
    badContent.push(`${profile.iso3}: пустое имя или регион`);
  }
  if (profile.services.armyRu.trim().length === 0) {
    badContent.push(`${profile.iso3}: пустое описание СВ`);
  }
}
check(
  "бюджеты и численность неотрицательны или null",
  badNumbers.length === 0,
  badNumbers.join("; "),
);
check(
  "у каждого профиля заполнен провенанс ключевых секций",
  badProvenance.length === 0,
  badProvenance.join(", "),
);
check(
  "у каждого профиля есть уязвимости, имя, регион и описание служб",
  badContent.length === 0,
  badContent.join("; "),
);

const rosterMismatches: string[] = [];
const profileByIso3: ReadonlyMap<string, RestCountryProfile> = new Map<
  string,
  RestCountryProfile
>(REST_COUNTRY_PROFILES.map((profile) => [profile.iso3, profile]));
for (const expected of EXPECTED_DATA5_ROSTER) {
  const profile: RestCountryProfile | undefined = profileByIso3.get(expected.iso3);
  if (profile === undefined) {
    rosterMismatches.push(`${expected.iso3}: профиля нет`);
    continue;
  }
  if (profile.region !== expected.region) {
    rosterMismatches.push(
      `${expected.iso3}: регион «${profile.region}» вместо «${expected.region}»`,
    );
  }
  if (profile.hasStandingArmy !== expected.hasStandingArmy) {
    rosterMismatches.push(`${expected.iso3}: статус армии не совпал`);
  }
}
check(
  "ростер data5 (102 записи) совпал с таблицей ожиданий",
  EXPECTED_DATA5_ROSTER.length === 102 && rosterMismatches.length === 0,
  rosterMismatches.join("; "),
);

const phiProfile: RestCountryProfile | undefined = profileByIso3.get("PHI");
check(
  "алиас PHI не несёт чисел (бюджет и состав — null)",
  phiProfile !== undefined &&
    phiProfile.budget.amountUsdBn === null &&
    phiProfile.personnel.active === null,
  "алиас PHI должен оставаться пустым, чтобы не двоить Филиппины",
);

const noArmyProfiles: readonly RestCountryProfile[] = REST_COUNTRY_PROFILES.filter(
  (profile) => !profile.hasStandingArmy,
);
const noArmyWithBudget: string[] = noArmyProfiles
  .filter(
    (profile) =>
      profile.budget.amountUsdBn !== null && profile.budget.amountUsdBn > 0.1,
  )
  .map((profile) => profile.iso3);
check(
  "страны без армии не прячут военный бюджет (допустимы ≤0,1 млрд на береговую охрану и взносы)",
  noArmyWithBudget.length === 0,
  noArmyWithBudget.join(", "),
);
check(
  "стран без армии в волне ровно 21",
  noArmyProfiles.length === 21,
  `фактически ${noArmyProfiles.length}`,
);

// ─────────────────────────────────────────────────────────────────────────────
// Проверки агрегатов и справочных реестров
// ─────────────────────────────────────────────────────────────────────────────

const summary = summarizeData5();
check(
  "агрегаты: 102 профиля и 101 страна (алиас PHI исключён)",
  summary.totalProfiles === 102 && summary.totalCountries === 101,
  `профилей ${summary.totalProfiles}, стран ${summary.totalCountries}`,
);

const regionCountMismatches: string[] = [];
for (const expected of EXPECTED_REGION_COUNTS) {
  const aggregate = aggregateRegion(expected.region);
  if (
    aggregate.profileCount !== expected.profileCount ||
    aggregate.countryCount !== expected.countryCount
  ) {
    regionCountMismatches.push(
      `${expected.region}: профилей ${aggregate.profileCount}/${expected.profileCount}, стран ${aggregate.countryCount}/${expected.countryCount}`,
    );
  }
}
check(
  "региональные счётчики совпали с таблицей ожиданий (13 регионов)",
  regionCountMismatches.length === 0 && data5Regions().length === 13,
  regionCountMismatches.join("; "),
);

check(
  "аналитических профилей регионов 13 и трендовых рядов 13",
  REGION_ANALYTICAL_PROFILES.length === 13 &&
    REGION_SPENDING_SERIES.length === 13,
  `профилей ${REGION_ANALYTICAL_PROFILES.length}, рядов ${REGION_SPENDING_SERIES.length}`,
);

const roleCodes: ReadonlySet<string> = new Set<string>(
  ALL_COUNTRY_REGION_ROLES.map((entry) => entry.iso3),
);
check(
  "региональные роли покрывают все 102 кода data5",
  roleCodes.size === 102 &&
    REST_ISO3_CODES.every((code) => roleCodes.has(code)),
  `ролей уникальных ${roleCodes.size}`,
);

const roleRegionMismatches: string[] = [];
for (const role of ALL_COUNTRY_REGION_ROLES) {
  const profile: RestCountryProfile | undefined = profileByIso3.get(role.iso3);
  if (profile !== undefined && profile.region !== role.region) {
    roleRegionMismatches.push(`${role.iso3}: ${role.region} vs ${profile.region}`);
  }
}
check(
  "регион роли совпадает с регионом профиля",
  roleRegionMismatches.length === 0,
  roleRegionMismatches.join("; "),
);

const passportCodes: ReadonlySet<string> = new Set<string>(
  ALL_COUNTRY_PASSPORTS.map((entry) => entry.iso3),
);
check(
  "региональные паспорта покрывают все 102 кода data5",
  passportCodes.size === 102 &&
    REST_ISO3_CODES.every((code) => passportCodes.has(code)),
  `паспортов уникальных ${passportCodes.size}`,
);

check(
  "суммарный известный бюджет волны положителен и конечен",
  summary.totalKnownBudgetUsdBn > 0 &&
    Number.isFinite(summary.totalKnownBudgetUsdBn),
  `сумма ${summary.totalKnownBudgetUsdBn}`,
);

const benchmarkCodes: ReadonlySet<string> = new Set<string>(
  ALL_COUNTRY_BENCHMARKS.map((entry) => entry.iso3),
);
check(
  "бенчмарки покрывают все 102 кода data5",
  benchmarkCodes.size === 102 &&
    REST_ISO3_CODES.every((code) => benchmarkCodes.has(code)),
  `бенчмарков уникальных ${benchmarkCodes.size}`,
);

const qualityCodes: ReadonlySet<string> = new Set<string>(
  ALL_DATA_QUALITY.map((entry) => entry.iso3),
);
check(
  "реестр качества данных покрывает все 102 кода data5",
  qualityCodes.size === 102 &&
    REST_ISO3_CODES.every((code) => qualityCodes.has(code)),
  `записей качества уникальных ${qualityCodes.size}`,
);

const lowConfidenceEntries = ALL_DATA_QUALITY.filter(
  (entry) => entry.confidenceRu === "низкое",
);
check(
  "низкое доверие данным помечено у не менее 25 стран волны",
  lowConfidenceEntries.length >= 25,
  `фактически ${lowConfidenceEntries.length}`,
);

const rankingRegions: ReadonlySet<string> = new Set<string>(
  REGION_RANKINGS.map((entry) => entry.region),
);
check(
  "рейтинги заданы для всех 13 регионов",
  rankingRegions.size === 13,
  `регионов в рейтингах ${rankingRegions.size}`,
);

check(
  "субрегиональных анализов не менее 15",
  SUBREGION_ANALYSES.length >= 15,
  `фактически ${SUBREGION_ANALYSES.length}`,
);

const chronicleCodes: ReadonlySet<string> = new Set<string>(
  ALL_SECURITY_CHRONICLE.map((entry) => entry.iso3),
);
const chronicleForeign: string[] = [...chronicleCodes].filter(
  (code) => !data5Codes.has(code),
);
check(
  "хроника 2024–2025 содержит не менее 50 событий только по странам data5",
  ALL_SECURITY_CHRONICLE.length >= 50 && chronicleForeign.length === 0,
  `событий ${ALL_SECURITY_CHRONICLE.length}, чужих кодов ${chronicleForeign.join(", ")}`,
);

// ─────────────────────────────────────────────────────────────────────────────
// Итог
// ─────────────────────────────────────────────────────────────────────────────

console.log(
  `ИТОГО data5: проверок ${totalChecks}, провалено ${failedChecks}; ` +
    `покрытие реестра ${registryCodes.length - uncovered.length}/${registryCodes.length}`,
);
if (failedChecks > 0) {
  process.exit(1);
}
