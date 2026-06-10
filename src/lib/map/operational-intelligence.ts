// ─────────────────────────────────────────────────────────────────────────────
// Operational intelligence overlays for the strategic map.
// Layers are intentionally based on public/approximate reference data and the
// app's country dataset: A2/AD envelopes, maritime choke points, sustainment
// corridors and crisis flashpoints.
// ─────────────────────────────────────────────────────────────────────────────

import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { getPosition } from "@/lib/geo/country-centroids";
import type { AirReachCountryInput } from "@/lib/map/military-bases";

type Rgba = [number, number, number, number];
type OperationalCountryInput = AirReachCountryInput & { nuclearWarheads?: number | null; submarines?: number | null };

export interface A2ADZonePoint {
  objectKind: "a2adZone";
  iso: string;
  name: string;
  side: string;
  coalition: string | null;
  position: [number, number];
  radiusKm: number;
  saturationScore: number;
  integratedAirDefense: number;
  coastalDenial: number;
  longRangeStrike: number;
  label: string;
  explanation: string;
}

export interface MaritimeChokepoint {
  objectKind: "maritimeChokepoint";
  id: string;
  name: string;
  nameRu: string;
  region: string;
  position: [number, number];
  importance: number;
  risk: number;
  throughput: string;
  adjacentIso: string[];
  description: string;
}

export interface SupplyCorridor {
  objectKind: "supplyCorridor";
  id: string;
  name: string;
  side: string;
  source: [number, number];
  target: [number, number];
  throughputScore: number;
  vulnerability: number;
  routeType: "sea" | "air" | "land" | "mixed";
  description: string;
}

export interface FlashpointPoint {
  objectKind: "flashpoint";
  id: string;
  name: string;
  nameRu: string;
  position: [number, number];
  involvedIso: string[];
  category: "border" | "maritime" | "nuclear" | "insurgency" | "gray-zone" | "strategic";
  baselineRisk: number;
  computedRisk: number;
  escalationCeiling: number;
  description: string;
}

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function logScore(value: number, max: number): number {
  return clamp((Math.log10(Math.max(value, 0) + 1) / Math.log10(Math.max(max, 1) + 1)) * 100);
}

function sideColor(side: string): Rgba {
  switch (side) {
    case "NATO": return [59, 130, 246, 220];
    case "RUS": return [239, 68, 68, 220];
    case "CHINA": return [245, 158, 11, 220];
    case "UKR": return [234, 179, 8, 220];
    default: return [148, 163, 184, 190];
  }
}

function categoryColor(category: FlashpointPoint["category"]): Rgba {
  switch (category) {
    case "nuclear": return [248, 113, 113, 235];
    case "maritime": return [56, 189, 248, 230];
    case "border": return [251, 191, 36, 230];
    case "gray-zone": return [168, 85, 247, 225];
    case "insurgency": return [34, 197, 94, 220];
    case "strategic": return [236, 72, 153, 230];
  }
}

function maxOf(countries: ReadonlyArray<OperationalCountryInput>, selector: (country: OperationalCountryInput) => number): number {
  return Math.max(...countries.map(selector).map(n), 1);
}

export function estimateA2ADZone(country: OperationalCountryInput, countries: ReadonlyArray<OperationalCountryInput>): A2ADZonePoint {
  const maxAircraft = maxOf(countries, (c) => n(c.totalAircraft));
  const maxNavy = maxOf(countries, (c) => n(c.totalNavy) + n(c.submarines) * 3 + n(c.aircraftCarriers) * 15);
  const maxBudget = maxOf(countries, (c) => n(c.militaryBudgetBn));
  const airDefenseMass = logScore(n(country.totalAircraft) * 0.55 + n(country.totalHelicopters) * 0.18 + n(country.airfields) * 1.6, maxAircraft + 650);
  const coastalDenial = logScore(n(country.totalNavy) + n(country.submarines) * 4 + n(country.ports) * 2.2 + n(country.coastlineKm) * 0.012, maxNavy + 120);
  const longRangeStrike = clamp(
    logScore(n(country.militaryBudgetBn), maxBudget) * 0.24 +
    logScore(n(country.totalAircraft), maxAircraft) * 0.24 +
    n(country.techLevel) * 5.2 +
    n(country.ewCapability) * 3.2 +
    (n(country.nuclearWarheads) > 0 ? 13 : 0),
  );
  const integratedAirDefense = clamp(
    airDefenseMass * 0.34 +
    n(country.c2Capability) * 4.2 +
    n(country.ewCapability) * 3.3 +
    n(country.techLevel) * 2.6,
  );
  const saturationScore = clamp(integratedAirDefense * 0.36 + coastalDenial * 0.24 + longRangeStrike * 0.28 + logScore(n(country.militaryBudgetBn), maxBudget) * 0.12);
  const radiusKm = Math.round(260 + saturationScore * 18 + n(country.aircraftCarriers) * 110 + (n(country.nuclearWarheads) > 0 ? 180 : 0));
  const name = country.nameRu || country.name;

  return {
    objectKind: "a2adZone",
    iso: country.isoCode,
    name,
    side: country.side ?? "NEUTRAL",
    coalition: country.coalition ?? null,
    position: getPosition(country.isoCode),
    radiusKm,
    saturationScore: clamp(saturationScore),
    integratedAirDefense: clamp(integratedAirDefense),
    coastalDenial: clamp(coastalDenial),
    longRangeStrike: clamp(longRangeStrike),
    label: `${country.isoCode} A2/AD ${Math.round(saturationScore)}`,
    explanation: "Оценка объединяет авиацию/ПВО, РЭБ, C2, морское denial, дальний удар и бюджетную насыщенность.",
  };
}

export function buildA2ADZones(countries: ReadonlyArray<OperationalCountryInput>): A2ADZonePoint[] {
  return countries
    .filter((country) => n(country.totalAircraft) + n(country.totalNavy) + n(country.airfields) + n(country.militaryBudgetBn) > 0)
    .map((country) => estimateA2ADZone(country, countries))
    .filter((zone) => zone.saturationScore >= 22)
    .sort((a, b) => b.saturationScore - a.saturationScore)
    .slice(0, 44);
}

export const MARITIME_CHOKEPOINTS: MaritimeChokepoint[] = [
  { objectKind: "maritimeChokepoint", id: "malacca", name: "Strait of Malacca", nameRu: "Малаккский пролив", region: "Indo-Pacific", position: [101.0, 2.7], importance: 98, risk: 74, throughput: "Ключевой поток Азия—Европа / энергия Восточной Азии", adjacentIso: ["SGP", "MYS", "IDN"], description: "Один из главных мировых морских узких проходов; контроль/блокирование резко меняет снабжение Китая, Японии, Кореи и мировой торговли." },
  { objectKind: "maritimeChokepoint", id: "hormuz", name: "Strait of Hormuz", nameRu: "Ормузский пролив", region: "Middle East", position: [56.6, 26.6], importance: 96, risk: 86, throughput: "Нефть и LNG Персидского залива", adjacentIso: ["IRN", "OMN", "ARE"], description: "Критический энергетический проход; высокая чувствительность к ракетам, минам, малым катерам и авиации." },
  { objectKind: "maritimeChokepoint", id: "bab-el-mandeb", name: "Bab el-Mandeb", nameRu: "Баб-эль-Мандеб", region: "Red Sea", position: [43.4, 12.6], importance: 91, risk: 82, throughput: "Суэц—Индийский океан", adjacentIso: ["YEM", "DJI", "ERI"], description: "Узел между Красным морем и Индийским океаном; уязвим к береговым ракетам, БПЛА и нестабильности вокруг Йемена/Рога Африки." },
  { objectKind: "maritimeChokepoint", id: "suez", name: "Suez Canal", nameRu: "Суэцкий канал", region: "Egypt / Red Sea", position: [32.55, 30.0], importance: 94, risk: 61, throughput: "Европа—Азия, контейнеры и энергия", adjacentIso: ["EGY"], description: "Искусственная артерия глобальной торговли; пропускная способность критична для НАТО, ЕС, Китая и Ближнего Востока." },
  { objectKind: "maritimeChokepoint", id: "gibraltar", name: "Strait of Gibraltar", nameRu: "Гибралтар", region: "Mediterranean", position: [-5.6, 36.0], importance: 88, risk: 48, throughput: "Вход в Средиземное море", adjacentIso: ["ESP", "MAR", "GBR"], description: "Контроль входа в Средиземноморье; влияет на Атлантику, Северную Африку и южный фланг НАТО." },
  { objectKind: "maritimeChokepoint", id: "turkish-straits", name: "Turkish Straits", nameRu: "Босфор / Дарданеллы", region: "Black Sea", position: [29.0, 41.1], importance: 89, risk: 77, throughput: "Черное море—Средиземное море", adjacentIso: ["TUR", "RUS", "UKR"], description: "Стратегический клапан Черного моря; критичен для России, Украины, Турции и восточного Средиземноморья." },
  { objectKind: "maritimeChokepoint", id: "taiwan-strait", name: "Taiwan Strait", nameRu: "Тайваньский пролив", region: "East Asia", position: [120.3, 24.1], importance: 95, risk: 90, throughput: "Полупроводники, контейнеры, Восточная Азия", adjacentIso: ["CHN", "TWN", "JPN", "USA"], description: "Флэшпоинт великодержавной конкуренции; сочетает морскую блокаду, ПВО/ПРО, авиацию, десантные угрозы и технологические цепочки." },
  { objectKind: "maritimeChokepoint", id: "luzon", name: "Luzon Strait", nameRu: "Лусонский пролив", region: "First Island Chain", position: [121.8, 20.5], importance: 82, risk: 70, throughput: "Тихий океан—Южно-Китайское море", adjacentIso: ["PHL", "TWN", "CHN", "USA"], description: "Проход подводных лодок и надводных сил между первой островной цепью и Южно-Китайским морем." },
  { objectKind: "maritimeChokepoint", id: "korea-strait", name: "Korea Strait", nameRu: "Корейский пролив", region: "Northeast Asia", position: [129.3, 34.7], importance: 78, risk: 66, throughput: "Япония—Корея—Китай", adjacentIso: ["KOR", "JPN", "CHN"], description: "Плотная морская и авиационная зона рядом с Кореей, Японией и восточным Китаем." },
  { objectKind: "maritimeChokepoint", id: "giuk", name: "GIUK Gap", nameRu: "Рубеж GIUK", region: "North Atlantic", position: [-25.0, 62.5], importance: 84, risk: 59, throughput: "Северная Атлантика / подлодки", adjacentIso: ["GBR", "ISL", "NOR", "RUS", "USA"], description: "Классический противолодочный рубеж между Гренландией, Исландией и Британией; важен для трансатлантического усиления НАТО." },
  { objectKind: "maritimeChokepoint", id: "danish-straits", name: "Danish Straits", nameRu: "Датские проливы", region: "Baltic", position: [12.0, 55.7], importance: 77, risk: 63, throughput: "Балтика—Северное море", adjacentIso: ["DNK", "DEU", "SWE", "POL", "RUS"], description: "Выход Балтийского моря; влияет на флот, логистику и безопасность восточного фланга НАТО." },
  { objectKind: "maritimeChokepoint", id: "panama", name: "Panama Canal", nameRu: "Панамский канал", region: "Americas", position: [-79.7, 9.1], importance: 86, risk: 42, throughput: "Атлантика—Тихий океан", adjacentIso: ["PAN", "USA"], description: "Стратегический маневр между океанами; важен для торговли, ВМС и кризисной переброски." },
];

export const FLASHPOINTS: Omit<FlashpointPoint, "computedRisk" | "escalationCeiling">[] = [
  { objectKind: "flashpoint", id: "ukraine-front", name: "Ukraine Front", nameRu: "Украинский фронт", position: [36.8, 48.3], involvedIso: ["UKR", "RUS", "POL", "USA"], category: "strategic", baselineRisk: 93, description: "Активный театр большой войны с высокой ролью артиллерии, БПЛА, ПВО, логистики и внешней поддержки." },
  { objectKind: "flashpoint", id: "taiwan", name: "Taiwan Strait", nameRu: "Тайвань", position: [121.0, 23.8], involvedIso: ["CHN", "USA", "JPN", "PHL"], category: "maritime", baselineRisk: 88, description: "Сценарии блокады, ракетно-авиационного давления, десантной угрозы и вмешательства союзников США." },
  { objectKind: "flashpoint", id: "korean-peninsula", name: "Korean Peninsula", nameRu: "Корейский полуостров", position: [127.5, 38.2], involvedIso: ["PRK", "KOR", "USA", "CHN", "JPN"], category: "nuclear", baselineRisk: 82, description: "Сверхплотный театр с ядерным фактором, артиллерией, авиацией и крупными союзными силами." },
  { objectKind: "flashpoint", id: "baltics", name: "Baltic Flank", nameRu: "Балтийский фланг", position: [24.5, 56.5], involvedIso: ["EST", "LVA", "LTU", "POL", "RUS", "DEU", "USA"], category: "border", baselineRisk: 71, description: "Стык НАТО и России; важны Сувалкский коридор, Калининград, ПВО/РЭБ и быстрая переброска." },
  { objectKind: "flashpoint", id: "black-sea", name: "Black Sea", nameRu: "Черное море", position: [33.0, 44.0], involvedIso: ["UKR", "RUS", "TUR", "ROU", "BGR"], category: "maritime", baselineRisk: 77, description: "Морские дроны, ракеты, проливы, зерновые/энергетические маршруты и черноморская авиация." },
  { objectKind: "flashpoint", id: "south-china-sea", name: "South China Sea", nameRu: "Южно-Китайское море", position: [114.5, 12.0], involvedIso: ["CHN", "PHL", "VNM", "MYS", "USA"], category: "gray-zone", baselineRisk: 78, description: "Серые зоны, искусственные острова, береговая охрана, A2/AD и союзные операции свободы навигации." },
  { objectKind: "flashpoint", id: "india-pakistan", name: "India—Pakistan", nameRu: "Индия—Пакистан", position: [74.5, 33.5], involvedIso: ["IND", "PAK", "CHN"], category: "nuclear", baselineRisk: 76, description: "Пограничный и ядерный риск; важны мобилизационные темпы, авиация, ПВО и кризисное C2." },
  { objectKind: "flashpoint", id: "israel-iran", name: "Israel—Iran", nameRu: "Израиль—Иран", position: [43.5, 32.0], involvedIso: ["ISR", "IRN", "USA", "SAU"], category: "strategic", baselineRisk: 80, description: "Дальние удары, ПВО/ПРО, прокси-сети, Ормуз и региональная эскалация." },
  { objectKind: "flashpoint", id: "arctic", name: "High North", nameRu: "Арктика / Северный фланг", position: [35.0, 72.0], involvedIso: ["RUS", "NOR", "USA", "GBR", "CAN"], category: "strategic", baselineRisk: 59, description: "Подлодки, раннее предупреждение, энергоинфраструктура, Северный морской путь и GIUK." },
  { objectKind: "flashpoint", id: "persian-gulf", name: "Persian Gulf", nameRu: "Персидский залив", position: [52.0, 26.0], involvedIso: ["IRN", "SAU", "ARE", "QAT", "USA"], category: "maritime", baselineRisk: 75, description: "Энергетическая артерия мира: Ормуз, ракеты, БПЛА, ПВО и морская безопасность." },
];

export const SUPPLY_CORRIDORS: SupplyCorridor[] = [
  { objectKind: "supplyCorridor", id: "us-europe", name: "US → Europe Reinforcement", side: "NATO", source: [-76.3, 36.9], target: [7.6, 49.4], throughputScore: 93, vulnerability: 38, routeType: "mixed", description: "Трансатлантическая переброска США в Европу через порты, авиабазы и командную сеть НАТО." },
  { objectKind: "supplyCorridor", id: "nato-eastern-flank", name: "NATO Eastern Flank", side: "NATO", source: [7.6, 49.4], target: [23.5, 52.0], throughputScore: 78, vulnerability: 56, routeType: "land", description: "Логистическая дуга Рамштайн—Польша—Балтия/Украина: железные дороги, склады, ПВО и узкие места." },
  { objectKind: "supplyCorridor", id: "russia-western-md", name: "Russia Western MD", side: "RUS", source: [37.6, 55.8], target: [31.0, 50.5], throughputScore: 76, vulnerability: 64, routeType: "land", description: "Западное стратегическое направление России: дальность снабжения, железные дороги, мосты и ударная уязвимость." },
  { objectKind: "supplyCorridor", id: "china-first-chain", name: "China First Island Chain", side: "CHINA", source: [121.5, 29.9], target: [121.0, 23.8], throughputScore: 81, vulnerability: 70, routeType: "mixed", description: "Китайская дуга к первой островной цепи: ракеты, авиация, флот, десантная логистика и A2/AD." },
  { objectKind: "supplyCorridor", id: "us-indo-pacific", name: "US Indo-Pacific Network", side: "NATO", source: [144.8, 13.6], target: [139.7, 35.3], throughputScore: 86, vulnerability: 58, routeType: "sea", description: "Гуам—Япония—Корея: передовая сеть США в западной части Тихого океана." },
  { objectKind: "supplyCorridor", id: "auk-us-aus", name: "AUKUS South Pacific Arc", side: "NATO", source: [130.9, -12.4], target: [144.8, 13.6], throughputScore: 72, vulnerability: 44, routeType: "sea", description: "Австралия—Гуам: глубинная линия обеспечения AUKUS для Индо-Тихоокеанского региона." },
  { objectKind: "supplyCorridor", id: "iran-hormuz", name: "Iran Hormuz Denial Belt", side: "NEUTRAL", source: [51.4, 35.7], target: [56.6, 26.6], throughputScore: 58, vulnerability: 73, routeType: "mixed", description: "Связка материковой инфраструктуры Ирана с Ормузским проливом: ракеты, катера, БПЛА и ПВО." },
  { objectKind: "supplyCorridor", id: "india-andaman", name: "India Andaman Watch", side: "NEUTRAL", source: [74.1, 14.8], target: [92.7, 11.7], throughputScore: 66, vulnerability: 47, routeType: "sea", description: "Западная Индия—Андаманы: контроль подходов к Малакке и восточного Индийского океана." },
];

export function createA2ADLayers(countries: ReadonlyArray<OperationalCountryInput>): Layer[] {
  const zones = buildA2ADZones(countries);
  const envelope = new ScatterplotLayer<A2ADZonePoint>({
    id: "operational-a2ad-envelopes",
    data: zones,
    pickable: true,
    opacity: 0.25,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => d.radiusKm * 1000,
    getFillColor: (d) => {
      const [r, g, b] = sideColor(d.side);
      return [r, g, b, 36];
    },
    getLineColor: (d) => {
      const [r, g, b] = sideColor(d.side);
      return [r, g, b, Math.round(80 + d.saturationScore)];
    },
    radiusUnits: "meters",
    radiusMinPixels: 8,
    radiusMaxPixels: 230,
  });

  const nodes = new ScatterplotLayer<A2ADZonePoint>({
    id: "operational-a2ad-nodes",
    data: zones,
    pickable: true,
    opacity: 0.92,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => 16000 + d.saturationScore * 720,
    getFillColor: (d) => sideColor(d.side),
    getLineColor: [226, 232, 240, 210],
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 25,
  });

  const labels = new TextLayer<A2ADZonePoint>({
    id: "operational-a2ad-labels",
    data: zones.slice(0, 18),
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => d.label,
    getSize: (d) => 9 + d.saturationScore / 18,
    getColor: [226, 232, 240, 220],
    getPixelOffset: [0, -12],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    background: true,
    getBackgroundColor: [2, 6, 23, 175],
    backgroundPadding: [4, 2],
    fontFamily: "monospace",
  });

  return [envelope, nodes, labels];
}

export function createMaritimeChokepointLayers(): Layer[] {
  const halo = new ScatterplotLayer<MaritimeChokepoint>({
    id: "operational-chokepoint-halos",
    data: MARITIME_CHOKEPOINTS,
    pickable: true,
    opacity: 0.38,
    stroked: false,
    filled: true,
    getPosition: (d) => d.position,
    getRadius: (d) => 65000 + d.importance * 4200,
    getFillColor: (d) => [34, 211, 238, Math.round(35 + d.risk * 0.5)],
    radiusUnits: "meters",
    radiusMinPixels: 9,
    radiusMaxPixels: 92,
  });

  const core = new ScatterplotLayer<MaritimeChokepoint>({
    id: "operational-chokepoint-cores",
    data: MARITIME_CHOKEPOINTS,
    pickable: true,
    opacity: 0.94,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => 18000 + d.importance * 520,
    getFillColor: (d) => d.risk >= 75 ? [248, 113, 113, 225] : [34, 211, 238, 225],
    getLineColor: [226, 232, 240, 220],
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 24,
  });

  const labels = new TextLayer<MaritimeChokepoint>({
    id: "operational-chokepoint-labels",
    data: MARITIME_CHOKEPOINTS,
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => `${d.name} ${d.risk}`,
    getSize: 10,
    getColor: [226, 232, 240, 225],
    getPixelOffset: [0, -13],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    background: true,
    getBackgroundColor: [2, 6, 23, 175],
    backgroundPadding: [4, 2],
    fontFamily: "monospace",
  });

  return [halo, core, labels];
}

export function createSupplyCorridorLayers(): Layer[] {
  const arcs = new ArcLayer<SupplyCorridor>({
    id: "operational-supply-corridors",
    data: SUPPLY_CORRIDORS,
    pickable: true,
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getSourceColor: (d) => sideColor(d.side),
    getTargetColor: (d) => d.vulnerability >= 65 ? [248, 113, 113, 230] : [34, 211, 238, 220],
    getWidth: (d) => 1.2 + d.throughputScore / 18,
    getHeight: (d) => 0.22 + d.throughputScore / 180,
    opacity: 0.62,
  });

  const endpoints = new ScatterplotLayer<SupplyCorridor>({
    id: "operational-supply-corridor-endpoints",
    data: SUPPLY_CORRIDORS,
    pickable: true,
    opacity: 0.88,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.target,
    getRadius: (d) => 17000 + d.vulnerability * 620,
    getFillColor: (d) => d.vulnerability >= 65 ? [248, 113, 113, 220] : sideColor(d.side),
    getLineColor: [226, 232, 240, 210],
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 24,
  });

  const labels = new TextLayer<SupplyCorridor>({
    id: "operational-supply-corridor-labels",
    data: SUPPLY_CORRIDORS,
    pickable: false,
    getPosition: (d) => d.target,
    getText: (d) => `${d.routeType.toUpperCase()} ${d.throughputScore}/${d.vulnerability}`,
    getSize: 9,
    getColor: [226, 232, 240, 215],
    getPixelOffset: [0, -12],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    background: true,
    getBackgroundColor: [2, 6, 23, 165],
    backgroundPadding: [3, 2],
    fontFamily: "monospace",
  });

  return [arcs, endpoints, labels];
}

export function buildFlashpoints(countries: ReadonlyArray<OperationalCountryInput>): FlashpointPoint[] {
  const byIso = new Map(countries.map((country) => [country.isoCode, country]));
  return FLASHPOINTS.map((flashpoint) => {
    const involved = flashpoint.involvedIso.map((iso) => byIso.get(iso)).filter((country): country is OperationalCountryInput => Boolean(country));
    const bpAverage = involved.length > 0
      ? involved.reduce((sum, country) => sum + n(country.bpAdvanced ?? country.bpTotal), 0) / involved.length
      : flashpoint.baselineRisk;
    const nuclearFactor = involved.some((country) => n(country.nuclearWarheads) > 0) ? 9 : 0;
    const coalitionFactor = new Set(involved.map((country) => country.side ?? country.coalition ?? country.isoCode)).size > 2 ? 6 : 0;
    const computedRisk = clamp(flashpoint.baselineRisk * 0.62 + bpAverage * 0.22 + nuclearFactor + coalitionFactor);
    const escalationCeiling = clamp(Math.max(flashpoint.baselineRisk, computedRisk) + nuclearFactor + coalitionFactor * 0.6);
    return { ...flashpoint, computedRisk, escalationCeiling };
  }).sort((a, b) => b.computedRisk - a.computedRisk);
}

export function createFlashpointLayers(countries: ReadonlyArray<OperationalCountryInput>): Layer[] {
  const points = buildFlashpoints(countries);
  const halo = new ScatterplotLayer<FlashpointPoint>({
    id: "operational-flashpoint-halos",
    data: points,
    pickable: true,
    opacity: 0.28,
    stroked: false,
    filled: true,
    getPosition: (d) => d.position,
    getRadius: (d) => 95000 + d.escalationCeiling * 4400,
    getFillColor: (d) => {
      const [r, g, b] = categoryColor(d.category);
      return [r, g, b, Math.round(40 + d.computedRisk * 0.7)];
    },
    radiusUnits: "meters",
    radiusMinPixels: 12,
    radiusMaxPixels: 120,
  });

  const core = new ScatterplotLayer<FlashpointPoint>({
    id: "operational-flashpoint-cores",
    data: points,
    pickable: true,
    opacity: 0.95,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => 18000 + d.computedRisk * 620,
    getFillColor: (d) => categoryColor(d.category),
    getLineColor: [226, 232, 240, 220],
    radiusUnits: "meters",
    radiusMinPixels: 4,
    radiusMaxPixels: 26,
  });

  const labels = new TextLayer<FlashpointPoint>({
    id: "operational-flashpoint-labels",
    data: points,
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => `${d.name.replace(/—/g, "-")} ${Math.round(d.computedRisk)}`,
    getSize: 10,
    getColor: [226, 232, 240, 225],
    getPixelOffset: [0, -14],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    background: true,
    getBackgroundColor: [2, 6, 23, 180],
    backgroundPadding: [4, 2],
    fontFamily: "monospace",
  });

  return [halo, core, labels];
}
