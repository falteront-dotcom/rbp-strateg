// ─────────────────────────────────────────────────────────────────────────────
// Military Unit Strength Ratings
// Standardized unit effectiveness ratings for tactical mode
// Based on NATO STANAG and real combat performance data
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export type UnitBranch =
  | "infantry"
  | "armor"
  | "artillery"
  | "air_defense"
  | "aviation"
  | "naval"
  | "special_ops"
  | "logistics"
  | "engineer"
  | "ew"; // electronic warfare

export type UnitEchelon =
  | "squad"       // отделение 8-12
  | "platoon"     // взвод 25-50
  | "company"     // рота 80-150
  | "battalion"   // батальон 500-900
  | "brigade"     // бригада 3000-5000
  | "division"    // дивизия 10000-20000
  | "corps"       // корпус 20000-50000
  | "army";       // армия 50000+

export interface UnitStrengthRating {
  branch: UnitBranch;
  echelon: UnitEchelon;
  personnelRange: [number, number];
  combatPowerIndex: number;       // 1-100 relative combat power
  firePower: number;              // 1-100
  survivability: number;         // 1-100
  mobility: number;              // 1-100
  c2Requirement: number;         // 1-10 command complexity
  logisticsDemand: number;       // 1-10 supply consumption per day
  terrainEffectiveness: Record<string, number>; // terrain → effectiveness modifier
}

export interface FormationTemplate {
  name: string;
  nameRu: string;
  echelon: UnitEchelon;
  branch: UnitBranch;
  subUnits: Array<{
    type: string;
    nameRu: string;
    count: number;
    echelon: UnitEchelon;
  }>;
  equipment: Array<{
    category: string;
    nameRu: string;
    count: number;
  }>;
  totalPersonnel: number;
  combatPowerIndex: number;
}

// ─── Unit Strength Ratings ────────────────────────────────────────────────────
export const UNIT_STRENGTH_RATINGS: UnitStrengthRating[] = [
  {
    branch: "infantry",
    echelon: "battalion",
    personnelRange: [500, 900],
    combatPowerIndex: 30,
    firePower: 25,
    survivability: 40,
    mobility: 30,
    c2Requirement: 4,
    logisticsDemand: 4,
    terrainEffectiveness: { urban: 0.9, forest: 0.8, mountain: 0.7, plains: 0.5, desert: 0.4, water: 0.1 },
  },
  {
    branch: "armor",
    echelon: "battalion",
    personnelRange: [300, 500],
    combatPowerIndex: 60,
    firePower: 70,
    survivability: 65,
    mobility: 55,
    c2Requirement: 5,
    logisticsDemand: 7,
    terrainEffectiveness: { plains: 0.95, desert: 0.85, urban: 0.5, forest: 0.3, mountain: 0.2, water: 0.05 },
  },
  {
    branch: "artillery",
    echelon: "battalion",
    personnelRange: [300, 600],
    combatPowerIndex: 50,
    firePower: 90,
    survivability: 20,
    mobility: 25,
    c2Requirement: 6,
    logisticsDemand: 9,
    terrainEffectiveness: { plains: 0.9, desert: 0.85, urban: 0.7, mountain: 0.6, forest: 0.5, water: 0.1 },
  },
  {
    branch: "air_defense",
    echelon: "battalion",
    personnelRange: [200, 400],
    combatPowerIndex: 25,
    firePower: 40,
    survivability: 30,
    mobility: 35,
    c2Requirement: 7,
    logisticsDemand: 5,
    terrainEffectiveness: { plains: 0.9, desert: 0.85, urban: 0.7, mountain: 0.5, forest: 0.4, water: 0.2 },
  },
  {
    branch: "special_ops",
    echelon: "company",
    personnelRange: [80, 150],
    combatPowerIndex: 45,
    firePower: 35,
    survivability: 60,
    mobility: 70,
    c2Requirement: 8,
    logisticsDemand: 2,
    terrainEffectiveness: { urban: 0.95, mountain: 0.9, forest: 0.85, desert: 0.7, plains: 0.4, water: 0.3 },
  },
  {
    branch: "ew",
    echelon: "battalion",
    personnelRange: [150, 300],
    combatPowerIndex: 20,
    firePower: 5,
    survivability: 15,
    mobility: 40,
    c2Requirement: 9,
    logisticsDemand: 3,
    terrainEffectiveness: { plains: 0.8, desert: 0.8, urban: 0.75, forest: 0.6, mountain: 0.5, water: 0.3 },
  },
  {
    branch: "engineer",
    echelon: "battalion",
    personnelRange: [400, 700],
    combatPowerIndex: 10,
    firePower: 10,
    survivability: 30,
    mobility: 35,
    c2Requirement: 5,
    logisticsDemand: 6,
    terrainEffectiveness: { water: 0.8, urban: 0.7, forest: 0.6, mountain: 0.5, plains: 0.4, desert: 0.3 },
  },
  {
    branch: "logistics",
    echelon: "battalion",
    personnelRange: [400, 800],
    combatPowerIndex: 5,
    firePower: 5,
    survivability: 10,
    mobility: 50,
    c2Requirement: 4,
    logisticsDemand: 1,
    terrainEffectiveness: { plains: 0.9, desert: 0.7, urban: 0.6, forest: 0.4, mountain: 0.3, water: 0.1 },
  },
];

// ─── Formation Templates ──────────────────────────────────────────────────────
export const FORMATION_TEMPLATES: FormationTemplate[] = [
  {
    name: "Motor Rifle Division",
    nameRu: "Мотострелковая дивизия",
    echelon: "division",
    branch: "infantry",
    subUnits: [
      { type: "motor_rifle_regiment", nameRu: "Мотострелковый полк", count: 3, echelon: "brigade" },
      { type: "tank_regiment", nameRu: "Танковый полк", count: 1, echelon: "brigade" },
      { type: "artillery_regiment", nameRu: "Артиллерийский полк", count: 1, echelon: "brigade" },
      { type: "air_defense_regiment", nameRu: "Зенитный ракетный полк", count: 1, echelon: "brigade" },
      { type: "recon_battalion", nameRu: "Разведывательный батальон", count: 1, echelon: "battalion" },
      { type: "engineer_battalion", nameRu: "Инженерно-сапёрный батальон", count: 1, echelon: "battalion" },
      { type: "ew_company", nameRu: "Рота РЭБ", count: 1, echelon: "company" },
    ],
    equipment: [
      { category: "Танки", nameRu: "Т-72Б3/Т-90М", count: 94 },
      { category: "БМП", nameRu: "БМП-2/БМП-3", count: 210 },
      { category: "БТР", nameRu: "БТР-82А", count: 60 },
      { category: "Артиллерия", nameRu: "2С3/2С19/Д-30", count: 72 },
      { category: "РСЗО", nameRu: "БМ-21 Град", count: 18 },
      { category: "ПВО", nameRu: "Тор/Стрела-10", count: 24 },
    ],
    totalPersonnel: 12000,
    combatPowerIndex: 75,
  },
  {
    name: "Armored Division (US)",
    nameRu: "Бронетанковая дивизия (США)",
    echelon: "division",
    branch: "armor",
    subUnits: [
      { type: "abct", nameRu: "Бронетанковая бригадная боевая группа", count: 3, echelon: "brigade" },
      { type: "div_artillery", nameRu: "Дивизионная артиллерия", count: 1, echelon: "brigade" },
      { type: "cab", nameRu: "Бригада армейской авиации", count: 1, echelon: "brigade" },
      { type: "sustainment_bde", nameRu: "Бригада обеспечения", count: 1, echelon: "brigade" },
    ],
    equipment: [
      { category: "Танки", nameRu: "M1A2 Abrams", count: 87 },
      { category: "БМП", nameRu: "M2A4 Bradley", count: 138 },
      { category: "Артиллерия", nameRu: "M109A7 Paladin", count: 36 },
      { category: "РСЗО", nameRu: "M270A1 MLRS", count: 18 },
      { category: "Авиация", nameRu: "AH-64E + UH-60M", count: 48 },
      { category: "ПВО", nameRu: "Patriot/Avenger", count: 24 },
    ],
    totalPersonnel: 15000,
    combatPowerIndex: 85,
  },
  {
    name: "Marine Expeditionary Unit",
    nameRu: "Экспедиционный морской отряд (USMC)",
    echelon: "brigade",
    branch: "naval",
    subUnits: [
      { type: "ground_combat_element", nameRu: "Наземный боевой элемент (батальон)", count: 1, echelon: "battalion" },
      { type: "aviation_combat_element", nameRu: "Авиационный боевой элемент", count: 1, echelon: "brigade" },
      { type: "logistics_combat_element", nameRu: "Элемент боевого обеспечения", count: 1, echelon: "battalion" },
      { type: "command_element", nameRu: "Командный элемент", count: 1, echelon: "company" },
    ],
    equipment: [
      { category: "Пехота", nameRu: "Морские пехотинцы", count: 2200 },
      { category: "Танки", nameRu: "M1A1 F/A", count: 4 },
      { category: "БТР", nameRu: "AAV-7/LAV-25", count: 32 },
      { category: "Авиация", nameRu: "F-35B + MV-22 + CH-53K", count: 24 },
      { category: "Артиллерия", nameRu: "M777A2 + HIMARS", count: 12 },
    ],
    totalPersonnel: 4600,
    combatPowerIndex: 60,
  },
  {
    name: "Air Defense Division (S-400)",
    nameRu: "Дивизия ПВО (С-400)",
    echelon: "division",
    branch: "air_defense",
    subUnits: [
      { type: "s400_regiment", nameRu: "Зенитный ракетный полк С-400", count: 2, echelon: "brigade" },
      { type: "s300_regiment", nameRu: "Зенитный ракетный полк С-300", count: 1, echelon: "brigade" },
      { type: "pantcir_division", nameRu: "Дивизион Панцирь-С1", count: 2, echelon: "battalion" },
      { type: "radio_technical_battalion", nameRu: "Радиотехнический батальон", count: 1, echelon: "battalion" },
    ],
    equipment: [
      { category: "С-400", nameRu: "Триумф (40Н6 400км)", count: 16 },
      { category: "С-300", nameRu: "Фаворит (48Н6 250км)", count: 8 },
      { category: "Панцирь-С1", nameRu: "Панцирь (20км)", count: 12 },
      { category: "РЛС", nameRu: "Резонанс-Н/Небо-М", count: 8 },
    ],
    totalPersonnel: 5000,
    combatPowerIndex: 55,
  },
  {
    name: "Spetsnaz Brigade (GRU)",
    nameRu: "Бригада специального назначения ГРУ",
    echelon: "brigade",
    branch: "special_ops",
    subUnits: [
      { type: "spetsnaz_battalion", nameRu: "Батальон спецназ", count: 3, echelon: "battalion" },
      { type: "recon_company", nameRu: "Рота глубокой разведки", count: 1, echelon: "company" },
      { type: "ew_company", nameRu: "Рота РЭБ", count: 1, echelon: "company" },
      { type: "sigint_company", nameRu: "Рота радиоразведки", count: 1, echelon: "company" },
    ],
    equipment: [
      { category: "Лёгкое оружие", nameRu: "АК-12/ВСС/Винторез", count: 500 },
      { category: "Снайперское", nameRu: "СВДМ/ОРСИС Т-5000", count: 40 },
      { category: "ПТУР", nameRu: "Корнет-ЭМ/Метис-М1", count: 24 },
      { category: "ПЗРК", nameRu: "Верба/Игла-С", count: 24 },
      { category: "РЭБ", nameRu: "Лесочек/Красуха", count: 8 },
    ],
    totalPersonnel: 1600,
    combatPowerIndex: 50,
  },
];

// ─── Query functions ──────────────────────────────────────────────────────────
export function getStrengthRating(branch: UnitBranch, echelon: UnitEchelon): UnitStrengthRating | undefined {
  return UNIT_STRENGTH_RATINGS.find((r) => r.branch === branch && r.echelon === echelon);
}

export function getFormationTemplate(name: string): FormationTemplate | undefined {
  return FORMATION_TEMPLATES.find((f) => f.name === name);
}

export function getFormationsByBranch(branch: UnitBranch): FormationTemplate[] {
  return FORMATION_TEMPLATES.filter((f) => f.branch === branch);
}

export function getAllFormationTemplates(): FormationTemplate[] {
  return FORMATION_TEMPLATES;
}

export function calculateUnitEffectiveness(
  branch: UnitBranch,
  echelon: UnitEchelon,
  terrain: string,
): number {
  const rating = getStrengthRating(branch, echelon);
  if (!rating) return 50;
  const terrainMod = rating.terrainEffectiveness[terrain] ?? 0.5;
  return Math.round(rating.combatPowerIndex * terrainMod);
}
