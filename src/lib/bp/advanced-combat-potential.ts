// ─────────────────────────────────────────────────────────────────────────────
// Advanced Combat Potential Model
// Расширенная модель определения боевого потенциала: force structure, quality,
// sustainment, projection, C4ISR, deterrence, geography, synergies and penalties.
// The model is intentionally transparent: every adjustment is returned for UI/API.
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData } from "@/lib/bp/types";
import { calculateCountryBP } from "@/lib/bp/calculate-bp";
import { DEFAULT_WEIGHTS, type WeightsConfig } from "@/lib/bp/weights";
import { estimateAirOperationalReach } from "@/lib/bp/air-reach";

export type AdvancedDomainKey =
  | "landWarfare"
  | "airPower"
  | "maritimePower"
  | "strategicDeterrence"
  | "mobilizationDepth"
  | "industrialEndurance"
  | "logisticsReach"
  | "c4isrReadiness"
  | "geostrategicPosition"
  | "forceBalance";

export type AdvancedModifierKind = "bonus" | "penalty" | "synergy" | "constraint";

export interface AdvancedDomainScore {
  key: AdvancedDomainKey;
  name: string;
  nameEn: string;
  weight: number;
  score: number;
  confidence: number;
  drivers: AdvancedDriver[];
}

export interface AdvancedDriver {
  key: string;
  label: string;
  raw: number;
  score: number;
  weight: number;
  explanation: string;
}

export interface AdvancedModifier {
  key: string;
  label: string;
  kind: AdvancedModifierKind;
  value: number;
  explanation: string;
}

export interface AdvancedRiskFlag {
  key: string;
  label: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface AdvancedCombatPotential {
  isoCode: string;
  baseBP: number;
  advancedBP: number;
  confidence: number;
  domains: AdvancedDomainScore[];
  modifiers: AdvancedModifier[];
  riskFlags: AdvancedRiskFlag[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

interface DomainSpec {
  key: AdvancedDomainKey;
  name: string;
  nameEn: string;
  weight: number;
}

interface NormStats {
  max: Record<string, number>;
  min: Record<string, number>;
  avg: Record<string, number>;
}

const DOMAIN_SPECS: DomainSpec[] = [
  { key: "landWarfare", name: "Сухопутная мощь", nameEn: "Land Warfare", weight: 0.14 },
  { key: "airPower", name: "Воздушное превосходство", nameEn: "Air Power", weight: 0.13 },
  { key: "maritimePower", name: "Морская проекция", nameEn: "Maritime Power", weight: 0.10 },
  { key: "strategicDeterrence", name: "Стратегическое сдерживание", nameEn: "Strategic Deterrence", weight: 0.10 },
  { key: "mobilizationDepth", name: "Мобилизационная глубина", nameEn: "Mobilization Depth", weight: 0.10 },
  { key: "industrialEndurance", name: "Промышленная устойчивость", nameEn: "Industrial Endurance", weight: 0.12 },
  { key: "logisticsReach", name: "Логистический радиус", nameEn: "Logistics Reach", weight: 0.10 },
  { key: "c4isrReadiness", name: "C4ISR и готовность", nameEn: "C4ISR & Readiness", weight: 0.12 },
  { key: "geostrategicPosition", name: "Геостратегическая позиция", nameEn: "Geostrategic Position", weight: 0.05 },
  { key: "forceBalance", name: "Сбалансированность ВС", nameEn: "Force Balance", weight: 0.04 },
];

const NUMERIC_FIELDS: Array<keyof CountryRawData> = [
  "areaKm2",
  "coastlineKm",
  "gdpPppBn",
  "militaryBudgetBn",
  "defensePctGdp",
  "populationM",
  "activePersonnel",
  "reservePersonnel",
  "fitForServiceM",
  "totalTanks",
  "totalAfv",
  "totalArtillery",
  "totalMlrs",
  "totalAircraft",
  "totalHelicopters",
  "totalNavy",
  "submarines",
  "aircraftCarriers",
  "nuclearWarheads",
  "ports",
  "airfields",
  "oilProductionKbd",
  "merchantFleet",
  "techLevel",
  "moraleIndex",
  "combatExperience",
  "c2Capability",
  "ewCapability",
];

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1): number {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildStats(allData: CountryRawData[]): NormStats {
  const max: Record<string, number> = {};
  const min: Record<string, number> = {};
  const avg: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    const values = allData.map((d) => safeNumber(d[field] as number));
    max[field] = Math.max(...values, 1);
    min[field] = Math.min(...values, 0);
    avg[field] = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);
  }
  return { max, min, avg };
}

function linear(value: number, max: number): number {
  return clamp((safeNumber(value) / Math.max(max, 1)) * 100);
}

function logScore(value: number, max: number): number {
  const v = Math.max(0, safeNumber(value));
  const m = Math.max(max, 1);
  return clamp((Math.log10(v + 1) / Math.log10(m + 1)) * 100);
}

function capped(value: number, cap: number): number {
  return clamp((safeNumber(value) / Math.max(cap, 1)) * 100);
}

function weightedMean(drivers: AdvancedDriver[]): number {
  const weight = drivers.reduce((sum, d) => sum + d.weight, 0) || 1;
  return drivers.reduce((sum, d) => sum + d.score * d.weight, 0) / weight;
}

function driver(
  key: string,
  label: string,
  raw: number,
  score: number,
  weight: number,
  explanation: string,
): AdvancedDriver {
  return { key, label, raw: round(raw, 2), score: round(clamp(score), 1), weight, explanation };
}

function domain(
  key: AdvancedDomainKey,
  drivers: AdvancedDriver[],
  confidence: number,
): AdvancedDomainScore {
  const spec = DOMAIN_SPECS.find((s) => s.key === key);
  if (!spec) throw new Error(`Unknown advanced BP domain: ${key}`);
  return {
    key,
    name: spec.name,
    nameEn: spec.nameEn,
    weight: spec.weight,
    score: round(weightedMean(drivers), 1),
    confidence: round(clamp(confidence), 1),
    drivers,
  };
}

function perSoldierBudgetBn(data: CountryRawData): number {
  const active = Math.max(data.activePersonnel, 1);
  return data.militaryBudgetBn / active;
}

function personnelToPopulation(data: CountryRawData): number {
  const pop = Math.max(data.populationM * 1_000_000, 1);
  return (data.activePersonnel + data.reservePersonnel * 0.35) / pop;
}

function landComposite(data: CountryRawData): number {
  return (
    data.totalTanks * 2.2 +
    data.totalAfv * 0.65 +
    data.totalArtillery * 1.2 +
    data.totalMlrs * 2.1 +
    data.activePersonnel / 2500 +
    data.reservePersonnel / 9000
  );
}

function airComposite(data: CountryRawData): number {
  return (
    data.totalAircraft * 1.8 +
    data.totalHelicopters * 0.75 +
    data.airfields * 1.2 +
    data.techLevel * 55 +
    data.c2Capability * 40
  );
}

function maritimeComposite(data: CountryRawData): number {
  return (
    data.totalNavy * 1.0 +
    data.submarines * 4.5 +
    data.aircraftCarriers * 18 +
    data.ports * 2.2 +
    data.merchantFleet * 0.04 +
    Math.sqrt(Math.max(data.coastlineKm, 0)) * 1.2
  );
}

function deterrenceComposite(data: CountryRawData): number {
  const nuclear = data.nuclearWarheads > 0 ? 35 + logScore(data.nuclearWarheads, 6000) * 0.65 : 0;
  const submarines = capped(data.submarines, 70) * 0.20;
  const aircraft = capped(data.totalAircraft, 3500) * 0.15;
  const tech = capped(data.techLevel, 10) * 0.25;
  const c2 = capped(data.c2Capability, 10) * 0.25;
  return nuclear + submarines + aircraft + tech + c2;
}

function industrialComposite(data: CountryRawData): number {
  return (
    logScore(data.gdpPppBn, 35_000) * 0.35 +
    logScore(data.militaryBudgetBn, 900) * 0.25 +
    capped(data.defensePctGdp, 12) * 0.10 +
    logScore(data.oilProductionKbd, 12_000) * 0.10 +
    capped(data.techLevel, 10) * 0.12 +
    capped(data.combatExperience, 10) * 0.08
  ) * 10;
}

function logisticsComposite(data: CountryRawData): number {
  return (
    logScore(data.ports, 100) * 0.18 +
    logScore(data.airfields, 800) * 0.20 +
    logScore(data.merchantFleet, 6000) * 0.15 +
    logScore(data.oilProductionKbd, 12_000) * 0.15 +
    capped(data.coastlineKm, 60_000) * 0.10 +
    logScore(data.gdpPppBn, 35_000) * 0.12 +
    capped(data.c2Capability, 10) * 0.10
  ) * 10;
}

function balanceScore(values: number[]): number {
  const valid = values.map((v) => clamp(v));
  const avg = valid.reduce((a, b) => a + b, 0) / Math.max(valid.length, 1);
  const variance = valid.reduce((sum, v) => sum + (v - avg) ** 2, 0) / Math.max(valid.length, 1);
  const sd = Math.sqrt(variance);
  return clamp(100 - sd * 1.15 + avg * 0.08);
}

function sideInteroperability(data: CountryRawData): number {
  if (data.coalition === "NATO" || data.side === "NATO") return 92;
  if (data.coalition === "AUKUS") return 90;
  if (data.coalition === "CSTO" || data.side === "RUS") return 68;
  if (data.coalition === "BRICS" || data.side === "CHINA") return 62;
  if (data.side === "UKR") return 75;
  return 46;
}

function estimateConfidence(data: CountryRawData): number {
  const completeness = [
    data.gdpPppBn,
    data.militaryBudgetBn,
    data.populationM,
    data.activePersonnel,
    data.totalTanks + data.totalAircraft + data.totalNavy,
    data.airfields + data.ports,
    data.techLevel,
    data.c2Capability,
  ].filter((v) => safeNumber(v) > 0).length / 8;
  const qualitative = (capped(data.techLevel, 10) + capped(data.moraleIndex, 10) + capped(data.c2Capability, 10)) / 3;
  return clamp(completeness * 72 + qualitative * 0.28);
}

function buildLandDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const landRaw = landComposite(data);
  const allLandMax = Math.max(stats.max.totalTanks * 2.2 + stats.max.totalAfv * 0.65 + stats.max.totalArtillery * 1.2 + stats.max.totalMlrs * 2.1 + stats.max.activePersonnel / 2500, 1);
  const drivers = [
    driver("landComposite", "Суммарная броня и артиллерия", landRaw, logScore(landRaw, allLandMax), 0.34, "Танки, ББМ, артиллерия, РСЗО и численность сухопутного компонента."),
    driver("armorDensity", "Бронетанковая плотность", data.totalTanks + data.totalAfv, logScore(data.totalTanks * 2 + data.totalAfv, stats.max.totalTanks * 2 + stats.max.totalAfv), 0.18, "Даёт преимущество в манёвренной наземной войне."),
    driver("artilleryMass", "Огневая масса артиллерии", data.totalArtillery + data.totalMlrs, logScore(data.totalArtillery + data.totalMlrs * 1.8, stats.max.totalArtillery + stats.max.totalMlrs * 1.8), 0.18, "Учитывает ствольную артиллерию и РСЗО с повышенным весом."),
    driver("combatExperience", "Боевой опыт", data.combatExperience, capped(data.combatExperience, 10), 0.14, "Повышает фактическую эффективность больших сухопутных группировок."),
    driver("morale", "Мораль и устойчивость", data.moraleIndex, capped(data.moraleIndex, 10), 0.08, "Мораль снижает риск развала при потерях и затяжной кампании."),
    driver("c2Land", "Управляемость наземных сил", data.c2Capability, capped(data.c2Capability, 10), 0.08, "C2 определяет способность использовать массу без хаоса и фрикции."),
  ];
  return domain("landWarfare", drivers, estimateConfidence(data));
}

function buildAirDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const airRaw = airComposite(data);
  const maxRaw = stats.max.totalAircraft * 1.8 + stats.max.totalHelicopters * 0.75 + stats.max.airfields * 1.2 + 950;
  const airReach = estimateAirOperationalReach(data);
  const drivers = [
    driver("airComposite", "Авиационный парк", airRaw, logScore(airRaw, maxRaw), 0.24, "Боевые самолёты, вертолёты и инфраструктура аэродромов."),
    driver("combatRadius", "Боевой радиус авиации", airReach.combatRadiusKm, airReach.reachScore, 0.17, "Радиусы авиации, дозаправка, аэродромная сеть, авианосцы и союзные базы влияют на реальную дальность применения силы."),
    driver("airfieldNetwork", "Сеть аэродромов", data.airfields, logScore(data.airfields, stats.max.airfields), 0.14, "Чем больше аэродромов, тем выше рассредоточение и темп вылетов."),
    driver("techAir", "Технологичность авиации", data.techLevel, capped(data.techLevel, 10), 0.17, "Технологический уровень приближает оценку к качеству платформ, сенсоров и вооружений."),
    driver("c2Air", "Воздушное C2", data.c2Capability, capped(data.c2Capability, 10), 0.13, "Сетевое управление, AWACS/ISR и интеграция ПВО."),
    driver("ewAir", "РЭБ в воздушной среде", data.ewCapability, capped(data.ewCapability, 10), 0.08, "РЭБ повышает выживаемость и снижает эффективность противника."),
    driver("budgetPerSoldier", "Финансирование качества", perSoldierBudgetBn(data), logScore(perSoldierBudgetBn(data) * 1_000_000, 0.45), 0.07, "Бюджет на военнослужащего — прокси обслуживания, обучения и высокоточных средств."),
  ];
  return domain("airPower", drivers, estimateConfidence(data));
}

function buildMaritimeDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const raw = maritimeComposite(data);
  const maxRaw = stats.max.totalNavy + stats.max.submarines * 4.5 + stats.max.aircraftCarriers * 18 + stats.max.ports * 2.2 + stats.max.merchantFleet * 0.04 + Math.sqrt(stats.max.coastlineKm) * 1.2;
  const blueWater = data.aircraftCarriers * 12 + data.submarines * 3 + data.merchantFleet * 0.03;
  const drivers = [
    driver("maritimeComposite", "Суммарный морской потенциал", raw, logScore(raw, maxRaw), 0.28, "Корабли, подлодки, авианосцы, порты, торговый флот и длина береговой линии."),
    driver("blueWater", "Океанская проекция", blueWater, logScore(blueWater, stats.max.aircraftCarriers * 12 + stats.max.submarines * 3 + stats.max.merchantFleet * 0.03), 0.22, "Авианосцы, подлодки и торговый флот дают дальнюю проекцию силы."),
    driver("submarineForce", "Подводный флот", data.submarines, logScore(data.submarines, stats.max.submarines), 0.16, "Подлодки — ключевой инструмент сдерживания и морского denial."),
    driver("portBase", "Портовая база", data.ports, logScore(data.ports, stats.max.ports), 0.14, "Порты поддерживают ремонт, снабжение и развёртывание флота."),
    driver("coastalAccess", "Доступ к морю", data.coastlineKm, logScore(data.coastlineKm, stats.max.coastlineKm), 0.10, "Береговая линия расширяет возможности, но также добавляет уязвимые направления."),
    driver("navalTech", "Технологии ВМФ", data.techLevel, capped(data.techLevel, 10), 0.10, "Качество сенсоров, ПВО кораблей, ракет и связи."),
  ];
  const confidence = data.coastlineKm > 0 ? estimateConfidence(data) : 80;
  return domain("maritimePower", drivers, confidence);
}

function buildDeterrenceDomain(data: CountryRawData): AdvancedDomainScore {
  const raw = deterrenceComposite(data);
  const triadProxy = (data.nuclearWarheads > 0 ? 35 : 0) + capped(data.submarines, 40) * 0.25 + capped(data.totalAircraft, 1200) * 0.20 + capped(data.c2Capability, 10) * 0.20;
  const drivers = [
    driver("nuclearInventory", "Ядерный арсенал", data.nuclearWarheads, data.nuclearWarheads > 0 ? 35 + logScore(data.nuclearWarheads, 6000) * 0.65 : 0, 0.35, "ЯО радикально меняет стратегическое сдерживание даже при малом количестве."),
    driver("deliveryTriadProxy", "Прокси триады доставки", triadProxy, triadProxy, 0.20, "Подлодки, авиация и C2 как приближение возможностей доставки."),
    driver("secondStrike", "Потенциал ответного удара", data.submarines + data.aircraftCarriers, clamp(capped(data.submarines, 70) * 0.75 + capped(data.c2Capability, 10) * 0.25), 0.15, "Подводный компонент и устойчивое управление повышают survivability."),
    driver("missileTech", "Ракетно-технологический уровень", data.techLevel + data.ewCapability, clamp((data.techLevel + data.ewCapability) * 5), 0.14, "Технологии и РЭБ коррелируют с ракетными, сенсорными и противоракетными возможностями."),
    driver("strategicC2", "Стратегическое управление", data.c2Capability, capped(data.c2Capability, 10), 0.16, "Надёжное C2 критично для безопасного сдерживания."),
  ];
  return domain("strategicDeterrence", drivers, raw > 0 ? estimateConfidence(data) : 72);
}

function buildMobilizationDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const mobilized = data.activePersonnel + data.reservePersonnel * 0.55 + data.fitForServiceM * 1_000_000 * 0.035;
  const drivers = [
    driver("activePersonnel", "Действующий состав", data.activePersonnel, logScore(data.activePersonnel, stats.max.activePersonnel), 0.24, "Немедленно доступная сила."),
    driver("reserveDepth", "Глубина резерва", data.reservePersonnel, logScore(data.reservePersonnel, stats.max.reservePersonnel), 0.20, "Резерв повышает устойчивость к потерям и длительной войне."),
    driver("fitForService", "Годные к службе", data.fitForServiceM, logScore(data.fitForServiceM, stats.max.fitForServiceM), 0.18, "Долгосрочный мобилизационный ресурс."),
    driver("populationDepth", "Демографическая база", data.populationM, logScore(data.populationM, stats.max.populationM), 0.14, "Население важно для долгой войны и экономики."),
    driver("mobilizedComposite", "Интегральный мобилизационный объём", mobilized, logScore(mobilized, stats.max.activePersonnel + stats.max.reservePersonnel * 0.55 + stats.max.fitForServiceM * 1_000_000 * 0.035), 0.16, "Комбинирует действующих, резерв и часть годного населения."),
    driver("militarizationRatio", "Доля военной нагрузки", personnelToPopulation(data), capped(personnelToPopulation(data), 0.08), 0.08, "Слишком низкая доля ограничивает быстрый рост, слишком высокая может давить на экономику."),
  ];
  return domain("mobilizationDepth", drivers, estimateConfidence(data));
}

function buildIndustrialDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const budgetPerActive = perSoldierBudgetBn(data);
  const drivers = [
    driver("gdpPpp", "ВВП ППС", data.gdpPppBn, logScore(data.gdpPppBn, stats.max.gdpPppBn), 0.24, "Экономическая база для длительного производства и импорта."),
    driver("militaryBudget", "Военный бюджет", data.militaryBudgetBn, logScore(data.militaryBudgetBn, stats.max.militaryBudgetBn), 0.22, "Годовой ресурс закупок, НИОКР и содержания войск."),
    driver("defenseEffort", "Оборонное усилие", data.defensePctGdp, capped(data.defensePctGdp, 12), 0.11, "Доля ВВП показывает политическую готовность вкладываться в оборону."),
    driver("energyBase", "Энергетическая база", data.oilProductionKbd, logScore(data.oilProductionKbd, stats.max.oilProductionKbd), 0.11, "Нефть — прокси топливной автономности и экспортной выручки."),
    driver("techIndustry", "Технологический уровень ВПК", data.techLevel, capped(data.techLevel, 10), 0.14, "Чем выше techLevel, тем выше качество ВПК и способность к сложным системам."),
    driver("budgetPerActive", "Бюджет на военнослужащего", budgetPerActive, logScore(budgetPerActive * 1_000_000, 0.45), 0.10, "Содержательная оценка качества оснащения, подготовки и техобслуживания."),
    driver("industrialComposite", "Индустриальный композит", industrialComposite(data), industrialComposite(data) / 10, 0.08, "Сводный показатель экономики, бюджета, технологий и опыта."),
  ];
  return domain("industrialEndurance", drivers, estimateConfidence(data));
}

function buildLogisticsDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const airReach = estimateAirOperationalReach(data);
  const drivers = [
    driver("ports", "Морские порты", data.ports, logScore(data.ports, stats.max.ports), 0.13, "Порты обеспечивают импорт, экспедиционную логистику и ремонт."),
    driver("airfields", "Аэродромы", data.airfields, logScore(data.airfields, stats.max.airfields), 0.15, "Аэродромы обеспечивают переброску, рассредоточение и темп операций."),
    driver("airExpeditionaryReach", "Воздушная дальность снабжения", airReach.expeditionaryRadiusKm, airReach.reachScore, 0.12, "Боевой/экспедиционный радиус авиации влияет на переброску, сопровождение и темп операций вне своей территории."),
    driver("merchantFleet", "Торговый флот", data.merchantFleet, logScore(data.merchantFleet, stats.max.merchantFleet), 0.10, "Мобилизационный морской транспорт."),
    driver("oil", "Топливная автономность", data.oilProductionKbd, logScore(data.oilProductionKbd, stats.max.oilProductionKbd), 0.11, "Снижает уязвимость к внешним поставкам топлива."),
    driver("areaManageability", "Управляемость территории", data.areaKm2, clamp(100 - logScore(data.areaKm2, stats.max.areaKm2) * 0.35 + capped(data.airfields, 700) * 0.25), 0.09, "Большая территория полезна для глубины, но усложняет снабжение без инфраструктуры."),
    driver("coastlineReach", "Морской доступ", data.coastlineKm, logScore(data.coastlineKm, stats.max.coastlineKm), 0.07, "Береговая линия расширяет логистический радиус при наличии портов."),
    driver("logisticsComposite", "Логистический композит", logisticsComposite(data), logisticsComposite(data) / 10, 0.14, "Комбинация портов, аэродромов, флота, топлива, C2 и экономики."),
    driver("c2Logistics", "Управление снабжением", data.c2Capability, capped(data.c2Capability, 10), 0.09, "Без C2 инфраструктура хуже конвертируется в реальный темп операций."),
  ];
  return domain("logisticsReach", drivers, estimateConfidence(data));
}

function buildC4ReadinessDomain(data: CountryRawData): AdvancedDomainScore {
  const interoperability = sideInteroperability(data);
  const drivers = [
    driver("c2Capability", "C2", data.c2Capability, capped(data.c2Capability, 10), 0.20, "Командование, связь, разведка и штабная культура."),
    driver("ewCapability", "РЭБ", data.ewCapability, capped(data.ewCapability, 10), 0.15, "Способность мешать противнику и защищать свои сети."),
    driver("techLevel", "Технологический уровень", data.techLevel, capped(data.techLevel, 10), 0.17, "Прокси сенсоров, БПЛА, связи, ВТО и ИТ-инфраструктуры."),
    driver("morale", "Мораль", data.moraleIndex, capped(data.moraleIndex, 10), 0.12, "Устойчивость частей под давлением."),
    driver("combatExperience", "Боевой опыт", data.combatExperience, capped(data.combatExperience, 10), 0.14, "Опыт резко снижает фрикцию на первых этапах конфликта."),
    driver("interoperability", "Интероперабельность", interoperability, interoperability, 0.12, "Союзная совместимость, стандарты, обмен разведданными и логистика."),
    driver("maintenanceCapacity", "Прокси техобслуживания", perSoldierBudgetBn(data), logScore(perSoldierBudgetBn(data) * 1_000_000, 0.45), 0.10, "Деньги на военнослужащего коррелируют с readiness и исправностью."),
  ];
  return domain("c4isrReadiness", drivers, estimateConfidence(data));
}

function buildGeoDomain(data: CountryRawData, stats: NormStats): AdvancedDomainScore {
  const depth = logScore(data.areaKm2, stats.max.areaKm2);
  const access = clamp(logScore(data.coastlineKm, stats.max.coastlineKm) * 0.45 + logScore(data.ports, stats.max.ports) * 0.30 + logScore(data.airfields, stats.max.airfields) * 0.25);
  const defensive = clamp(depth * 0.45 + access * 0.18 + (data.coastlineKm > 0 ? 6 : 0) + (data.climateZone ? 8 : 3));
  const drivers = [
    driver("strategicDepth", "Стратегическая глубина", data.areaKm2, depth, 0.24, "Большая территория увеличивает глубину обороны и рассредоточение."),
    driver("access", "Доступность театра", data.coastlineKm + data.ports + data.airfields, access, 0.23, "Морской и воздушный доступ для переброски и снабжения."),
    driver("resourcePosition", "Ресурсная позиция", data.oilProductionKbd, logScore(data.oilProductionKbd, stats.max.oilProductionKbd), 0.13, "Энергетическая база снижает стратегическую зависимость."),
    driver("climateComplexity", "Климатическая сложность", data.areaKm2, clamp(depth * 0.4 + (data.climateZone ? 35 : 20)), 0.10, "Разнообразные условия могут осложнять действия противника, но требуют адаптации."),
    driver("defensiveDepth", "Оборонная глубина", defensive, defensive, 0.14, "Сводная оценка глубины, доступа и инфраструктуры."),
    driver("regionalPosture", "Региональная позиция", sideInteroperability(data), sideInteroperability(data), 0.16, "Союзы и блоковая принадлежность меняют геостратегическое окружение."),
  ];
  return domain("geostrategicPosition", drivers, estimateConfidence(data));
}

function buildForceBalanceDomain(domains: AdvancedDomainScore[]): AdvancedDomainScore {
  const core = domains.filter((d) => d.key !== "forceBalance");
  const scores = core.map((d) => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
  const drivers = [
    driver("balance", "Баланс доменов", maxScore - minScore, balanceScore(scores), 0.40, "Наказывает перекосы, когда один домен не поддержан другими."),
    driver("floor", "Минимальный критический домен", minScore, minScore, 0.22, "Самая слабая область часто становится ограничителем кампании."),
    driver("average", "Среднее доменное качество", avg, avg, 0.22, "Средний уровень доменов без учёта весов."),
    driver("readinessSupport", "Поддержка C4ISR/readiness", domains.find((d) => d.key === "c4isrReadiness")?.score ?? 0, domains.find((d) => d.key === "c4isrReadiness")?.score ?? 0, 0.16, "C4ISR помогает синхронизировать домены."),
  ];
  return domain("forceBalance", drivers, core.reduce((s, d) => s + d.confidence, 0) / Math.max(core.length, 1));
}

function makeModifier(key: string, label: string, kind: AdvancedModifierKind, value: number, explanation: string): AdvancedModifier {
  return { key, label, kind, value: round(value, 1), explanation };
}

function computeModifiers(data: CountryRawData, domains: AdvancedDomainScore[]): AdvancedModifier[] {
  const byKey = new Map(domains.map((d) => [d.key, d.score]));
  const mods: AdvancedModifier[] = [];
  const air = byKey.get("airPower") ?? 0;
  const land = byKey.get("landWarfare") ?? 0;
  const c4 = byKey.get("c4isrReadiness") ?? 0;
  const logistics = byKey.get("logisticsReach") ?? 0;
  const industry = byKey.get("industrialEndurance") ?? 0;
  const maritime = byKey.get("maritimePower") ?? 0;
  const deterrence = byKey.get("strategicDeterrence") ?? 0;
  const airReach = estimateAirOperationalReach(data);

  if (airReach.combatRadiusKm > 2300 && logistics > 62) mods.push(makeModifier("long_range_air_projection", "Дальняя авиационная проекция", "bonus", 1.4, "Большой боевой радиус авиации при сильной логистике расширяет оперативную глубину и давление на удалённые ТВД."));
  if (air > 62 && airReach.combatRadiusKm < 850) mods.push(makeModifier("short_air_radius_constraint", "Короткий авиационный радиус", "constraint", -1.1, "Крупный авиапарк с малым радиусом хуже влияет на стратегическую проекцию и дальнее прикрытие."));
  if (air > 72 && c4 > 70) mods.push(makeModifier("air_c4_synergy", "Синергия авиации и C4ISR", "synergy", 1.8, "Высокий air power при хорошем C4ISR повышает реальный темп высокоточных операций."));
  if (land > 75 && logistics < 45) mods.push(makeModifier("heavy_force_logistics_drag", "Тяжёлая армия ограничена логистикой", "constraint", -2.4, "Большая сухопутная масса без сопоставимой логистики хуже конвертируется в боеспособность."));
  if (maritime > 70 && data.aircraftCarriers > 0) mods.push(makeModifier("carrier_projection", "Авианосная проекция", "bonus", 1.3, "Авианосцы расширяют политический и военный радиус применения силы."));
  if (deterrence > 70) mods.push(makeModifier("strategic_deterrence_floor", "Порог стратегического сдерживания", "bonus", 2.0, "Сильное сдерживание повышает общий стратегический вес страны."));
  if (industry > 72 && data.defensePctGdp > 3.5) mods.push(makeModifier("war_economy_capacity", "Ёмкость военной экономики", "bonus", 1.2, "Сильная экономика при высоком оборонном усилии лучше выдерживает длительный конфликт."));
  if (data.militaryBudgetBn > 0 && data.activePersonnel > 0 && perSoldierBudgetBn(data) < 0.000012) mods.push(makeModifier("underfunded_personnel", "Недофинансирование личного состава", "penalty", -1.5, "Низкий бюджет на военнослужащего может означать проблемы обучения, снабжения и ремонта."));
  if (data.nuclearWarheads === 0 && deterrence < 35 && land < 35 && air < 35) mods.push(makeModifier("limited_high_intensity_ceiling", "Низкий потолок high-intensity войны", "constraint", -1.2, "Нет сильного ядерного/сухопутного/воздушного домена, ограничена война высокой интенсивности."));
  if (data.side === "NATO" || data.coalition === "NATO") mods.push(makeModifier("nato_network", "Сетевой эффект НАТО", "synergy", 1.0, "Стандарты, разведобмен и совместная логистика дают бонус сверх национальных показателей."));
  if (data.side === "UKR" && data.combatExperience >= 8) mods.push(makeModifier("active_war_adaptation", "Адаптация активной войны", "bonus", 1.4, "Высокий опыт современных боевых действий повышает скорость обучения."));
  if (data.coastlineKm === 0 && maritime < 20) mods.push(makeModifier("landlocked_projection_limit", "Ограничение морской проекции", "constraint", -0.8, "Отсутствие выхода к морю уменьшает дальнюю логистику и давление на морские коммуникации."));
  return mods;
}

function computeRiskFlags(data: CountryRawData, domains: AdvancedDomainScore[]): AdvancedRiskFlag[] {
  const byKey = new Map(domains.map((d) => [d.key, d.score]));
  const flags: AdvancedRiskFlag[] = [];
  const land = byKey.get("landWarfare") ?? 0;
  const air = byKey.get("airPower") ?? 0;
  const logistics = byKey.get("logisticsReach") ?? 0;
  const industry = byKey.get("industrialEndurance") ?? 0;
  const c4 = byKey.get("c4isrReadiness") ?? 0;
  const maritime = byKey.get("maritimePower") ?? 0;
  const airReach = estimateAirOperationalReach(data);

  if (air > 60 && airReach.combatRadiusKm < 900) flags.push({ key: "air_radius_gap", label: "Ограниченный радиус авиации", severity: "medium", explanation: "Авиационный парк есть, но боевой радиус/сеть баз ограничивают дальнее применение силы." });
  if (land > 70 && logistics < 45) flags.push({ key: "logistics_gap", label: "Логистический разрыв", severity: "high", explanation: "Сухопутная масса значительно опережает логистический радиус." });
  if (air > 65 && c4 < 45) flags.push({ key: "air_c2_gap", label: "Авиация без достаточного C2", severity: "medium", explanation: "Большой авиапарк хуже реализуется без C4ISR/РЭБ." });
  if (data.nuclearWarheads > 0 && c4 < 55) flags.push({ key: "nuclear_c2_risk", label: "Ядерное C2 требует внимания", severity: "high", explanation: "Ядерный арсенал требует очень надёжного управления и связи." });
  if (industry < 35 && data.defensePctGdp > 5) flags.push({ key: "economic_overstretch", label: "Риск экономического перенапряжения", severity: "medium", explanation: "Высокая доля обороны при небольшой экономике может быть неустойчивой." });
  if (maritime < 25 && data.coastlineKm > 5_000) flags.push({ key: "coastal_undercoverage", label: "Недопокрытая береговая линия", severity: "medium", explanation: "Длинная береговая линия при слабом флоте повышает уязвимость побережья." });
  if (data.activePersonnel > 800_000 && perSoldierBudgetBn(data) < 0.00002) flags.push({ key: "readiness_maintenance", label: "Риск исправности и readiness", severity: "medium", explanation: "Очень большой штат с низким финансированием на человека может снижать боеготовность." });
  if (flags.length === 0) flags.push({ key: "no_major_red_flags", label: "Крупные ограничения не выявлены", severity: "low", explanation: "По доступным данным явных критических дисбалансов не найдено." });
  return flags;
}

function summarize(data: CountryRawData, domains: AdvancedDomainScore[], advancedBP: number): string {
  const sorted = [...domains].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const weak = sorted[sorted.length - 1];
  const tier = advancedBP >= 85 ? "сверхдержава" : advancedBP >= 70 ? "ведущая военная держава" : advancedBP >= 55 ? "региональная держава" : advancedBP >= 38 ? "средняя сила" : "ограниченная сила";
  return `${data.nameRu || data.name}: ${tier}; сильнейший домен — ${top.name.toLowerCase()} (${top.score.toFixed(1)}), главный ограничитель — ${weak.name.toLowerCase()} (${weak.score.toFixed(1)}).`;
}

export function calculateAdvancedCombatPotential(
  country: CountryRawData,
  allCountries: CountryRawData[],
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): AdvancedCombatPotential {
  const cohort = allCountries.length > 0 ? allCountries : [country];
  const stats = buildStats(cohort);
  const base = calculateCountryBP(country, cohort, weights).totalBP;

  const domainsWithoutBalance = [
    buildLandDomain(country, stats),
    buildAirDomain(country, stats),
    buildMaritimeDomain(country, stats),
    buildDeterrenceDomain(country),
    buildMobilizationDomain(country, stats),
    buildIndustrialDomain(country, stats),
    buildLogisticsDomain(country, stats),
    buildC4ReadinessDomain(country),
    buildGeoDomain(country, stats),
  ];
  const domains = [...domainsWithoutBalance, buildForceBalanceDomain(domainsWithoutBalance)];

  const domainTotal = domains.reduce((sum, d) => sum + d.score * d.weight, 0);
  const modifiers = computeModifiers(country, domains);
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);

  // Blend with existing BP for backward compatibility. Existing model remains
  // the anchor; advanced model adds transparent correction from domain analysis.
  const advancedBP = clamp(base * 0.58 + domainTotal * 0.42 + modifierTotal, 0, 100);
  const confidence = domains.reduce((sum, d) => sum + d.confidence * d.weight, 0);
  const sorted = [...domains].sort((a, b) => b.score - a.score);

  return {
    isoCode: country.isoCode,
    baseBP: round(base, 1),
    advancedBP: round(advancedBP, 1),
    confidence: round(confidence, 1),
    domains,
    modifiers,
    riskFlags: computeRiskFlags(country, domains),
    strengths: sorted.slice(0, 3).map((d) => `${d.name}: ${d.score.toFixed(1)}`),
    weaknesses: sorted.slice(-3).reverse().map((d) => `${d.name}: ${d.score.toFixed(1)}`),
    summary: summarize(country, domains, advancedBP),
  };
}

export function calculateAdvancedCombatPotentialBatch(
  countries: CountryRawData[],
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): AdvancedCombatPotential[] {
  return countries.map((country) => calculateAdvancedCombatPotential(country, countries, weights));
}

export function getAdvancedDomainSpecs(): DomainSpec[] {
  return DOMAIN_SPECS.map((spec) => ({ ...spec }));
}
