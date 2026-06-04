// ─────────────────────────────────────────────────────────────────────────────
// Nuclear Triad Assessment
// Evaluates completeness and capability of nuclear delivery systems
// Based on FAS Nuclear Notebook and SIPRI data
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export type TriadLeg = "land" | "sea" | "air";
export type TriadStatus = "complete" | "partial" | "aspiring" | "none";

export interface TriadLegDetail {
  active: boolean;
  platforms: string[];
  warheads: number;
  range: string;
  generation: number;
}

export interface DeliverySystem {
  name: string;
  nameRu: string;
  type: "ICBM" | "SLBM" | "ALCM" | "gravity_bomb" | "cruise_missile" | "tactical";
  platform: string;
  range: number;
  warheadsPer: number;
  count: number;
  status: "deployed" | "development" | "retired";
}

export interface NuclearTriadAssessment {
  isoCode: string;
  countryName: string;
  countryNameRu: string;
  status: TriadStatus;
  totalWarheads: number;
  triadLegs: Record<TriadLeg, TriadLegDetail>;
  deliverySystems: DeliverySystem[];
  doctrines: string[];
  firstTest: number;
  nptStatus: "NPT Nuclear" | "NPT Non-Nuclear" | "Non-Signatory" | "Withdrawn";
}

// ─── Triad Data (9 nuclear states) ────────────────────────────────────────────
export const NUCLEAR_TRIADS: NuclearTriadAssessment[] = [
  {
    isoCode: "USA",
    countryName: "United States",
    countryNameRu: "США",
    status: "complete",
    totalWarheads: 5044,
    triadLegs: {
      land: { active: true, platforms: ["LGM-30G Minuteman III"], warheads: 400, range: "13000km", generation: 3 },
      sea: { active: true, platforms: ["UGM-133A Trident II D5 (Ohio-class)"], warheads: 1920, range: "11300km", generation: 4 },
      air: { active: true, platforms: ["B-2A Spirit", "B-52H Stratofortress"], warheads: 936, range: "14000km", generation: 3 },
    },
    deliverySystems: [
      { name: "LGM-30G Minuteman III", nameRu: "Минитмен-III", type: "ICBM", platform: "Silo", range: 13000, warheadsPer: 1, count: 400, status: "deployed" },
      { name: "UGM-133A Trident II D5", nameRu: "Трайдент II D5", type: "SLBM", platform: "Ohio-class SSBN", range: 11300, warheadsPer: 8, count: 240, status: "deployed" },
      { name: "B-2A Spirit", nameRu: "B-2 Спирит", type: "gravity_bomb", platform: "Stealth bomber", range: 14000, warheadsPer: 16, count: 18, status: "deployed" },
      { name: "B-52H Stratofortress", nameRu: "B-52 Стратофортресс", type: "ALCM", platform: "Strategic bomber", range: 14000, warheadsPer: 20, count: 46, status: "deployed" },
      { name: "B-21 Raider", nameRu: "B-21 Рейдер", type: "gravity_bomb", platform: "Next-gen stealth", range: 15000, warheadsPer: 16, count: 0, status: "development" },
    ],
    doctrines: ["Расширенное сдерживание (NATO)", "Гибкий ответ", "Не первый удар (политика)"],
    firstTest: 1945,
    nptStatus: "NPT Nuclear",
  },
  {
    isoCode: "RUS",
    countryName: "Russia",
    countryNameRu: "Россия",
    status: "complete",
    totalWarheads: 5580,
    triadLegs: {
      land: { active: true, platforms: ["RS-24 Ярс", "Р-36М2 Воевода", "РС-28 Сармат"], warheads: 1132, range: "12000-18000km", generation: 4 },
      sea: { active: true, platforms: ["Р-30 Булава (Борей-А)"], warheads: 672, range: "9300km", generation: 3 },
      air: { active: true, platforms: ["Ту-160М", "Ту-95МСМ"], warheads: 580, range: "15000km", generation: 3 },
    },
    deliverySystems: [
      { name: "RS-24 Ярс", nameRu: "РС-24 Ярс", type: "ICBM", platform: "Mobile/Silo", range: 12000, warheadsPer: 4, count: 174, status: "deployed" },
      { name: "Р-36М2 Воевода", nameRu: "Р-36М2 Воевода (Сатана)", type: "ICBM", platform: "Silo", range: 16000, warheadsPer: 10, count: 46, status: "deployed" },
      { name: "РС-28 Сармат", nameRu: "РС-28 Сармат (Сатана II)", type: "ICBM", platform: "Silo", range: 18000, warheadsPer: 15, count: 0, status: "development" },
      { name: "Р-30 Булава", nameRu: "Р-30 Булава", type: "SLBM", platform: "Borei-A SSBN", range: 9300, warheadsPer: 6, count: 112, status: "deployed" },
      { name: "Ту-160М", nameRu: "Ту-160М Белый лебедь", type: "ALCM", platform: "Strategic bomber", range: 15000, warheadsPer: 12, count: 16, status: "deployed" },
      { name: "Ту-95МСМ", nameRu: "Ту-95МСМ", type: "ALCM", platform: "Strategic bomber", range: 12000, warheadsPer: 6, count: 55, status: "deployed" },
    ],
    doctrines: ["Деэскалация через эскалацию", "Применение первым при угрозе существованию", "Амбигуная доктрина"],
    firstTest: 1949,
    nptStatus: "NPT Nuclear",
  },
  {
    isoCode: "CHN",
    countryName: "China",
    countryNameRu: "Китай",
    status: "complete",
    totalWarheads: 500,
    triadLegs: {
      land: { active: true, platforms: ["DF-41", "DF-31AG", "DF-5B"], warheads: 200, range: "12000-15000km", generation: 4 },
      sea: { active: true, platforms: ["JL-2 (Type 094)", "JL-3 (Type 096)"], warheads: 72, range: "7200-11000km", generation: 3 },
      air: { active: true, platforms: ["H-6N"], warheads: 20, range: "8000km", generation: 2 },
    },
    deliverySystems: [
      { name: "DF-41", nameRu: "DF-41 (Дунфэн-41)", type: "ICBM", platform: "Road-mobile", range: 15000, warheadsPer: 10, count: 24, status: "deployed" },
      { name: "DF-31AG", nameRu: "DF-31AG", type: "ICBM", platform: "Road-mobile", range: 12000, warheadsPer: 3, count: 36, status: "deployed" },
      { name: "DF-5B", nameRu: "DF-5B", type: "ICBM", platform: "Silo", range: 13000, warheadsPer: 8, count: 20, status: "deployed" },
      { name: "JL-2", nameRu: "JL-2 (Цзюйлун-2)", type: "SLBM", platform: "Type 094 SSBN", range: 7200, warheadsPer: 1, count: 48, status: "deployed" },
      { name: "JL-3", nameRu: "JL-3 (Цзюйлун-3)", type: "SLBM", platform: "Type 096 SSBN", range: 11000, warheadsPer: 3, count: 0, status: "development" },
      { name: "H-6N", nameRu: "H-6N", type: "ALCM", platform: "Strategic bomber", range: 8000, warheadsPer: 2, count: 20, status: "deployed" },
    ],
    doctrines: ["Не первый удар (декларация)", "Минимальное сдерживание → ограниченное сдерживание", "Наращивание к 2030: 500+ боеголовок"],
    firstTest: 1964,
    nptStatus: "NPT Nuclear",
  },
  {
    isoCode: "GBR",
    countryName: "United Kingdom",
    countryNameRu: "Великобритания",
    status: "partial",
    totalWarheads: 225,
    triadLegs: {
      land: { active: false, platforms: [], warheads: 0, range: "N/A", generation: 0 },
      sea: { active: true, platforms: ["Trident II D5 (Vanguard-class → Dreadnought-class)"], warheads: 120, range: "11300km", generation: 4 },
      air: { active: false, platforms: ["WE.177 (retired 1998)"], warheads: 0, range: "N/A", generation: 0 },
    },
    deliverySystems: [
      { name: "Trident II D5", nameRu: "Трайдент II D5", type: "SLBM", platform: "Vanguard SSBN", range: 11300, warheadsPer: 8, count: 48, status: "deployed" },
      { name: "Dreadnought-class SSBN", nameRu: "Дредноут (класс ПЛАРБ)", type: "SLBM", platform: "Next-gen SSBN", range: 11300, warheadsPer: 12, count: 0, status: "development" },
    ],
    doctrines: ["Минимальное сдерживание", "Только морской компонент с 1998", "CASD (Continuous At-Sea Deterrent)"],
    firstTest: 1952,
    nptStatus: "NPT Nuclear",
  },
  {
    isoCode: "FRA",
    countryName: "France",
    countryNameRu: "Франция",
    status: "partial",
    totalWarheads: 290,
    triadLegs: {
      land: { active: false, platforms: [], warheads: 0, range: "N/A", generation: 0 },
      sea: { active: true, platforms: ["M51.2 (Triomphant-class)"], warheads: 160, range: "10000km", generation: 4 },
      air: { active: true, platforms: ["ASMP-A (Rafale M)"], warheads: 54, range: "600km", generation: 3 },
    },
    deliverySystems: [
      { name: "M51.2", nameRu: "M51.2", type: "SLBM", platform: "Triomphant SSBN", range: 10000, warheadsPer: 6, count: 32, status: "deployed" },
      { name: "ASMP-A", nameRu: "ASMP-A (воздух-поверхность)", type: "cruise_missile", platform: "Rafale M", range: 600, warheadsPer: 1, count: 54, status: "deployed" },
      { name: "M51.3", nameRu: "M51.3 (гиперзвуковая ГЧ)", type: "SLBM", platform: "Suffren SSBN", range: 11000, warheadsPer: 6, count: 0, status: "development" },
    ],
    doctrines: ["Строгая достаточность", "Два компонента: морской + воздушный", "Не первый удар (декларация)"],
    firstTest: 1960,
    nptStatus: "NPT Nuclear",
  },
  {
    isoCode: "IND",
    countryName: "India",
    countryNameRu: "Индия",
    status: "partial",
    totalWarheads: 172,
    triadLegs: {
      land: { active: true, platforms: ["Agni-V (5000km)", "Agni-III (3500km)"], warheads: 80, range: "3500-5000km", generation: 3 },
      sea: { active: true, platforms: ["K-4 (Arihant-class)"], warheads: 24, range: "3500km", generation: 2 },
      air: { active: false, platforms: ["Jaguar IS (retiring)"], warheads: 0, range: "N/A", generation: 1 },
    },
    deliverySystems: [
      { name: "Agni-V", nameRu: "Агни-V", type: "ICBM", platform: "Road-mobile", range: 5000, warheadsPer: 3, count: 16, status: "deployed" },
      { name: "Agni-III", nameRu: "Агни-III", type: "ICBM", platform: "Road-mobile", range: 3500, warheadsPer: 1, count: 24, status: "deployed" },
      { name: "K-4", nameRu: "K-4", type: "SLBM", platform: "Arihant SSBN", range: 3500, warheadsPer: 1, count: 16, status: "deployed" },
      { name: "K-15 Sagarika", nameRu: "K-15 Сагарика", type: "SLBM", platform: "Arihant SSBN", range: 750, warheadsPer: 1, count: 12, status: "deployed" },
    ],
    doctrines: ["Не первый удар (No First Use)", "Минимальное достоверное сдерживание", "Credible minimum deterrence"],
    firstTest: 1974,
    nptStatus: "Non-Signatory",
  },
  {
    isoCode: "PAK",
    countryName: "Pakistan",
    countryNameRu: "Пакистан",
    status: "partial",
    totalWarheads: 170,
    triadLegs: {
      land: { active: true, platforms: ["Shaheen-III (2750km)", "Ghauri (1300km)"], warheads: 100, range: "1300-2750km", generation: 2 },
      sea: { active: false, platforms: [], warheads: 0, range: "N/A", generation: 0 },
      air: { active: true, platforms: ["Ra'ad-II ALCM (F-16/JF-17)"], warheads: 20, range: "600km", generation: 2 },
    },
    deliverySystems: [
      { name: "Shaheen-III", nameRu: "Шахин-III", type: "ICBM", platform: "Road-mobile", range: 2750, warheadsPer: 1, count: 24, status: "deployed" },
      { name: "Ghauri", nameRu: "Гаури", type: "ICBM", platform: "Road-mobile", range: 1300, warheadsPer: 1, count: 18, status: "deployed" },
      { name: "Ra'ad-II", nameRu: "Раад-II", type: "cruise_missile", platform: "F-16/JF-17", range: 600, warheadsPer: 1, count: 20, status: "deployed" },
    ],
    doctrines: ["Полная спектральная сдерживание (Full Spectrum Deterrence)", "Применение первым против Индии", "Тактическое ядерное оружие (Nasr/Hatf-IX 60km)"],
    firstTest: 1998,
    nptStatus: "Non-Signatory",
  },
  {
    isoCode: "PRK",
    countryName: "North Korea",
    countryNameRu: "КНДР",
    status: "partial",
    totalWarheads: 50,
    triadLegs: {
      land: { active: true, platforms: ["Hwasong-17 (15000km)", "Hwasong-15 (13000km)"], warheads: 30, range: "13000-15000km", generation: 3 },
      sea: { active: false, platforms: ["SLBM testing (Pukguksong-1)"], warheads: 0, range: "N/A", generation: 1 },
      air: { active: false, platforms: [], warheads: 0, range: "N/A", generation: 0 },
    },
    deliverySystems: [
      { name: "Hwasong-17", nameRu: "Хвасон-17", type: "ICBM", platform: "Road-mobile", range: 15000, warheadsPer: 1, count: 10, status: "deployed" },
      { name: "Hwasong-15", nameRu: "Хвасон-15", type: "ICBM", platform: "Road-mobile", range: 13000, warheadsPer: 1, count: 8, status: "deployed" },
      { name: "Pukguksong-1", nameRu: "Пуккыксон-1", type: "SLBM", platform: "Sinpo-class SSB", range: 1300, warheadsPer: 1, count: 0, status: "development" },
    ],
    doctrines: ["Асимметричное сдерживание", "Первый удар при угрозе режиму", "МБР как средство выживания режима"],
    firstTest: 2006,
    nptStatus: "Withdrawn",
  },
  {
    isoCode: "ISR",
    countryName: "Israel",
    countryNameRu: "Израиль",
    status: "partial",
    totalWarheads: 90,
    triadLegs: {
      land: { active: true, platforms: ["Jericho III (4800-6500km)"], warheads: 50, range: "6500km", generation: 3 },
      sea: { active: true, platforms: ["Dolphin-class SSK (cruise missiles)"], warheads: 20, range: "1500km", generation: 2 },
      air: { active: true, platforms: ["F-15I Ra'am (gravity bombs)"], warheads: 20, range: "4500km", generation: 3 },
    },
    deliverySystems: [
      { name: "Jericho III", nameRu: "Иерихон-III", type: "ICBM", platform: "Silo/Mobile", range: 6500, warheadsPer: 1, count: 24, status: "deployed" },
      { name: "Dolphin-class SSK", nameRu: "Дельфин (ПЛ)", type: "cruise_missile", platform: "Diesel SSK", range: 1500, warheadsPer: 1, count: 6, status: "deployed" },
      { name: "F-15I Ra'am", nameRu: "F-15I Раам", type: "gravity_bomb", platform: "Strike fighter", range: 4500, warheadsPer: 2, count: 25, status: "deployed" },
    ],
    doctrines: ["Ядерная амбигуность (неподтверждённое владение)", "Самсонов вариант (последнее средство)", "Предотвращение региональной ядерной гонки"],
    firstTest: 1979,   // Vela incident — unconfirmed
    nptStatus: "Non-Signatory",
  },
];

// ─── Query functions ──────────────────────────────────────────────────────────
export function getTriadAssessment(isoCode: string): NuclearTriadAssessment | undefined {
  return NUCLEAR_TRIADS.find((t) => t.isoCode === isoCode);
}

export function getTriadStatus(isoCode: string): TriadStatus {
  return getTriadAssessment(isoCode)?.status ?? "none";
}

export function getActiveTriadLegs(isoCode: string): TriadLeg[] {
  const assessment = getTriadAssessment(isoCode);
  if (!assessment) return [];
  return (Object.keys(assessment.triadLegs) as TriadLeg[]).filter(
    (leg) => assessment.triadLegs[leg].active
  );
}

export function getAllNuclearStates(): NuclearTriadAssessment[] {
  return NUCLEAR_TRIADS;
}

export function getTriadCompleteness(isoCode: string): number {
  const legs = getActiveTriadLegs(isoCode);
  return (legs.length / 3) * 100; // 0%, 33%, 67%, 100%
}

export function getDeployedDeliverySystems(isoCode: string): DeliverySystem[] {
  const assessment = getTriadAssessment(isoCode);
  if (!assessment) return [];
  return assessment.deliverySystems.filter((d) => d.status === "deployed");
}
