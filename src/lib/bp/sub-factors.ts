// ─────────────────────────────────────────────────────────────────────────────
// BP Sub-Factor Definitions
// Detailed breakdown of each BP component into contributing sub-factors
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SubFactor {
  key: string;
  name: string;           // Russian name
  nameEn: string;         // English name for debugging
  description: string;    // Russian description
  weight: number;         // 0-1, relative weight within parent component
  scoringFunction: string; // Description of how this factor is scored
  dataSource: string;     // Where data comes from (GFP, WB, FAS, estimated)
}

export interface ComponentSubFactors {
  componentKey: string;
  componentName: string; // Russian
  componentNameEn: string;
  subFactors: SubFactor[];
}

// ─── Sub-Factor Definitions ──────────────────────────────────────────────────
export const WEAPON_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "weaponScore",
  componentName: "Оружие",
  componentNameEn: "Weapons",
  subFactors: [
    {
      key: "tankScore",
      name: "Танковый потенциал",
      nameEn: "Tank Potential",
      description: "Количество и качество основных боевых танков. Включает оценку поколения танков (T-90M/M1A2 = 3-е поколение+).",
      weight: 0.20,
      scoringFunction: "normalize(tanks, 0, 15000) * generationFactor(1-3)",
      dataSource: "GFP",
    },
    {
      key: "aircraftScore",
      name: "Авиационный потенциал",
      nameEn: "Aircraft Potential",
      description: "Общее количество боевых самолётов с учётом типа (истребители 5-го поколения получают повышающий коэффициент).",
      weight: 0.25,
      scoringFunction: "normalize(aircraft, 0, 5000) * stealthBonus(5th-gen count)",
      dataSource: "GFP",
    },
    {
      key: "navyScore",
      name: "Морской потенциал",
      nameEn: "Naval Potential",
      description: "Общее количество боевых кораблей с учётом типа (авианосцы = 5x, подлодки = 3x).",
      weight: 0.20,
      scoringFunction: "normalize(weightedNavy, 0, 500) where carriers*5 + subs*3 + surface*1",
      dataSource: "GFP",
    },
    {
      key: "artilleryScore",
      name: "Артиллерийский потенциал",
      nameEn: "Artillery Potential",
      description: "Количество артиллерийских систем (включая САУ, буксируемую и РСЗО).",
      weight: 0.15,
      scoringFunction: "normalize(artillery + mlrs * 1.5, 0, 20000)",
      dataSource: "GFP",
    },
    {
      key: "missileScore",
      name: "Ракетный потенциал",
      nameEn: "Missile Potential",
      description: "Наличие баллистических и крылатых ракет. Оценка по типам (МБР > БРСД > тактические).",
      weight: 0.10,
      scoringFunction: "hasICBM*30 + hasSLBM*25 + hasCRBM*20 + hasSRBM*10",
      dataSource: "Estimated from nuclear/side",
    },
    {
      key: "nuclearScore",
      name: "Ядерный потенциал",
      nameEn: "Nuclear Potential",
      description: "Количество ядерных боеголовок. 0 = 0 баллов, 1-100 = 40, 100-500 = 70, 500+ = 90.",
      weight: 0.10,
      scoringFunction: "stepFunction(warheads, [0→0, 1→40, 100→70, 500→90, 5000→100])",
      dataSource: "FAS Nuclear Notebook",
    },
  ],
};

export const MANPOWER_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "manpowerScore",
  componentName: "Люди",
  componentNameEn: "Manpower",
  subFactors: [
    {
      key: "activePersonnelScore",
      name: "Активный состав",
      nameEn: "Active Personnel",
      description: "Численность действующего военного персонала. Нормализуется относительно максимального значения (≈2М).",
      weight: 0.35,
      scoringFunction: "normalize(activePersonnel, 0, 2000000)",
      dataSource: "GFP",
    },
    {
      key: "reservePersonnelScore",
      name: "Резерв",
      nameEn: "Reserve Personnel",
      description: "Численность резервистов, доступных для мобилизации. Коэффициент 0.5x относительно активного состава.",
      weight: 0.25,
      scoringFunction: "normalize(reservePersonnel, 0, 3000000) * 0.5",
      dataSource: "GFP",
    },
    {
      key: "paramilitaryScore",
      name: "Парамилитарные силы",
      nameEn: "Paramilitary Forces",
      description: "Жандармерия, береговая охрана, внутренние войска. Коэффициент 0.3x.",
      weight: 0.15,
      scoringFunction: "normalize(paramilitary, 0, 1000000) * 0.3",
      dataSource: "GFP",
    },
    {
      key: "personnelQualityScore",
      name: "Качество личного состава",
      nameEn: "Personnel Quality",
      description: "Оценка уровня подготовки, мотивации и боевого опыта. Зависит от alliance, defense budget per soldier.",
      weight: 0.25,
      scoringFunction: "baseQuality(alliance) + budgetPerSoldierBonus(budget/active) + experienceBonus(combatHistory)",
      dataSource: "Estimated",
    },
  ],
};

export const LOGISTICS_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "logisticsScore",
  componentName: "Логистика",
  componentNameEn: "Logistics",
  subFactors: [
    {
      key: "portScore",
      name: "Порты и гавани",
      nameEn: "Ports and Harbors",
      description: "Количество морских портов. Критично для морских держав и силовой проекции.",
      weight: 0.20,
      scoringFunction: "normalize(ports, 0, 100)",
      dataSource: "GFP",
    },
    {
      key: "airportScore",
      name: "Аэропорты",
      nameEn: "Airfields",
      description: "Количество аэропортов и аэродромов. Влияет на мобильность и логистику ВВС.",
      weight: 0.20,
      scoringFunction: "normalize(airfields, 0, 500)",
      dataSource: "GFP",
    },
    {
      key: "roadwayScore",
      name: "Автодорожная сеть",
      nameEn: "Roadway Network",
      description: "Протяжённость автодорог в км. Основа сухопутной логистики.",
      weight: 0.20,
      scoringFunction: "normalize(roadways, 0, 7000000)",
      dataSource: "GFP",
    },
    {
      key: "railwayScore",
      name: "Железнодорожная сеть",
      nameEn: "Railway Network",
      description: "Протяжённость железных дорог. Критична для переброски тяжёлой техники.",
      weight: 0.20,
      scoringFunction: "normalize(railways, 0, 300000)",
      dataSource: "GFP",
    },
    {
      key: "merchantFleetScore",
      name: "Торговый флот",
      nameEn: "Merchant Marine",
      description: "Количество торговых судов. Мобилизационный ресурс для морской логистики.",
      weight: 0.20,
      scoringFunction: "normalize(merchantFleet, 0, 6000)",
      dataSource: "GFP",
    },
  ],
};

export const C2_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "c2Score",
  componentName: "Управление",
  componentNameEn: "Command & Control",
  subFactors: [
    {
      key: "c4iScore",
      name: "C4ISR системы",
      nameEn: "C4ISR Systems",
      description: "Командование, управление, связь, компьютеры, разведка и наблюдение. Оценка технологического уровня.",
      weight: 0.30,
      scoringFunction: "techLevel * 20 + satelliteCount * 5",
      dataSource: "Estimated from techLevel + side",
    },
    {
      key: "ewScore",
      name: "Радиоэлектронная борьба",
      nameEn: "Electronic Warfare",
      description: "Возможности РЭБ: постановка помех, защита от помех, радиоразведка.",
      weight: 0.25,
      scoringFunction: "ewCapability * 20",
      dataSource: "Estimated from side + techLevel",
    },
    {
      key: "cyberScore",
      name: "Кибернетическая война",
      nameEn: "Cyber Warfare",
      description: "Наступательные и оборонительные кибер-возможности. Связано с технологическим уровнем.",
      weight: 0.20,
      scoringFunction: "techLevel * 15 + sideBonus(NATO/5eyes: +10)",
      dataSource: "Estimated",
    },
    {
      key: "satelliteScore",
      name: "Спутниковая разведка",
      nameEn: "Satellite Reconnaissance",
      description: "Количество военных и разведывательных спутников.",
      weight: 0.10,
      scoringFunction: "min(100, militarySatellites * 10)",
      dataSource: "Estimated",
    },
    {
      key: "moraleScore",
      name: "Боевой дух",
      nameEn: "Morale",
      description: "Моральный дух вооружённых сил. Зависит от alliance, боевого опыта, патриотизма.",
      weight: 0.15,
      scoringFunction: "baseMorale(alliance) + combatBonus(experience) - warFatigue(if at war > 1 year)",
      dataSource: "Estimated from side + combatExperience",
    },
  ],
};

export const ECONOMY_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "economyScore",
  componentName: "Экономика",
  componentNameEn: "Economy",
  subFactors: [
    {
      key: "gdpScore",
      name: "ВВП (ППС)",
      nameEn: "GDP PPP",
      description: "Валовой внутренний продукт по паритету покупательной способности. Основа экономического потенциала.",
      weight: 0.30,
      scoringFunction: "normalize(gdpPppBn, 0, 30000)",
      dataSource: "World Bank",
    },
    {
      key: "budgetScore",
      name: "Военный бюджет",
      nameEn: "Military Budget",
      description: "Абсолютный размер военного бюджета в млрд долларов.",
      weight: 0.30,
      scoringFunction: "normalize(militaryBudgetBn, 0, 900)",
      dataSource: "World Bank / GFP",
    },
    {
      key: "defenseGDPScore",
      name: "Доля обороны в ВВП",
      nameEn: "Defense % GDP",
      description: "Процент ВВП, выделяемый на оборону. Показатель приоритетности военных расходов.",
      weight: 0.20,
      scoringFunction: "normalize(defensePctGdp, 0, 15)",
      dataSource: "World Bank",
    },
    {
      key: "oilScore",
      name: "Нефтедобыча",
      nameEn: "Oil Production",
      description: "Добыча нефти в баррелях/день. Стратегический энергетический ресурс.",
      weight: 0.10,
      scoringFunction: "normalize(oilProductionKbd, 0, 15000)",
      dataSource: "GFP",
    },
    {
      key: "industrialScore",
      name: "Промышленный потенциал",
      nameEn: "Industrial Potential",
      description: "Оценка военно-промышленного комплекса. Зависит от GDP, techLevel, и наличия ВПК.",
      weight: 0.10,
      scoringFunction: "gdpScore * 0.5 + techLevel * 3 + defenseIndustryBonus(side)",
      dataSource: "Estimated",
    },
  ],
};

export const DOCTRINE_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "doctrineScore",
  componentName: "Доктрина",
  componentNameEn: "Doctrine",
  subFactors: [
    {
      key: "postureScore",
      name: "Оборонная позиция",
      nameEn: "Defense Posture",
      description: "Наступательная / оборонительная / сдерживания. Определяет структуру ВС.",
      weight: 0.30,
      scoringFunction: "offensive*80 + defensive*60 + deterrent*70 + mixed*65",
      dataSource: "Estimated from tank/aircraft ratio",
    },
    {
      key: "allianceScore",
      name: "Альянсовая принадлежность",
      nameEn: "Alliance Membership",
      description: "Членство в военных союзах. NATO +20, CSTO +15, BRICS +10, нейтрал 0.",
      weight: 0.30,
      scoringFunction: "allianceBonus(NATO=20, CSTO=15, BRICS=10, AUKUS=18, neutral=0)",
      dataSource: "From side classification",
    },
    {
      key: "experienceScore",
      name: "Боевой опыт",
      nameEn: "Combat Experience",
      description: "Наличие недавнего боевого опыта. Участие в реальных конфликтах за последние 20 лет.",
      weight: 0.25,
      scoringFunction: "combatExperience * 20 + recentConflictBonus(if active conflict)",
      dataSource: "From combatExperience field",
    },
    {
      key: "modernizationScore",
      name: "Модернизация ВС",
      nameEn: "Military Modernization",
      description: "Уровень модернизации вооружённых сил. Связан с budget/personnel и techLevel.",
      weight: 0.15,
      scoringFunction: "budgetPerSoldier * 0.3 + techLevel * 5",
      dataSource: "Estimated from budget + techLevel",
    },
  ],
};

export const READINESS_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "readinessScore",
  componentName: "Боеготовность",
  componentNameEn: "Readiness",
  subFactors: [
    {
      key: "activeReserveRatioScore",
      name: "Соотношение актив/резерв",
      nameEn: "Active/Reserve Ratio",
      description: "Высокое соотношение активного состава к резерву = выше готовность к немедленным действиям.",
      weight: 0.30,
      scoringFunction: "normalize(activeRatio, 0.1, 0.8) * 100",
      dataSource: "Calculated from GFP data",
    },
    {
      key: "modernizationReadinessScore",
      name: "Уровень модернизации",
      nameEn: "Modernization Level",
      description: "Доля современного оружия в ВС. Зависит от techLevel и возраста парка.",
      weight: 0.30,
      scoringFunction: "techLevel * 15 + budgetPerSoldier / 100",
      dataSource: "Estimated",
    },
    {
      key: "exerciseScore",
      name: "Учения и тренировки",
      nameEn: "Exercise Frequency",
      description: "Регулярность масштабных военных учений. Зависит от alliance и бюджета.",
      weight: 0.20,
      scoringFunction: "allianceBonus(NATO:15, CSTO:12, other:5) + budgetBonus",
      dataSource: "Estimated",
    },
    {
      key: "supplyScore",
      name: "Снабжение и логистика",
      nameEn: "Supply Chain",
      description: "Способность поддерживать длительные операции. Зависит от экономики и логистики.",
      weight: 0.20,
      scoringFunction: "economyScore * 0.3 + logisticsScore * 0.4 + allianceSupplyBonus",
      dataSource: "Derived from E + L scores",
    },
  ],
};

export const TERRAIN_SUB_FACTORS: ComponentSubFactors = {
  componentKey: "terrainScore",
  componentName: "География",
  componentNameEn: "Geography",
  subFactors: [
    {
      key: "areaScore",
      name: "Территория",
      nameEn: "Territory Area",
      description: "Площадь страны. Большая территория = больше стратегическая глубина.",
      weight: 0.25,
      scoringFunction: "normalize(areaKm2, 0, 17000000)",
      dataSource: "GFP / World Bank",
    },
    {
      key: "borderScore",
      name: "Границы",
      nameEn: "Borders",
      description: "Протяжённость сухопутных границ. Влияет на уязвимость и оборонительные потребности.",
      weight: 0.25,
      scoringFunction: "inverseNormalize(landBorders, 0, 30000) — longer borders = harder to defend",
      dataSource: "Estimated",
    },
    {
      key: "coastlineScore",
      name: "Побережье",
      nameEn: "Coastline",
      description: "Длина береговой линии. Доступ к морям = возможность морской проекции силы.",
      weight: 0.25,
      scoringFunction: "normalize(coastlineKm, 0, 200000)",
      dataSource: "GFP",
    },
    {
      key: "climateScore",
      name: "Климат",
      nameEn: "Climate",
      description: "Климатические условия: умеренный = благоприятный, тропический/арктический = затруднения.",
      weight: 0.10,
      scoringFunction: "temperate=80, continental=60, tropical/arctic=40",
      dataSource: "Estimated from latitude",
    },
    {
      key: "depthScore",
      name: "Стратегическая глубина",
      nameEn: "Strategic Depth",
      description: "Расстояние от границ до ключевых центров. Большая глубина = время для мобилизации.",
      weight: 0.15,
      scoringFunction: "normalize(sqrt(areaKm2 / pi), 0, 2000) * 100",
      dataSource: "Calculated from area",
    },
  ],
};

// ─── All sub-factors array ─────────────────────────────────────────────────────
export const ALL_COMPONENT_SUB_FACTORS: ComponentSubFactors[] = [
  WEAPON_SUB_FACTORS,
  MANPOWER_SUB_FACTORS,
  LOGISTICS_SUB_FACTORS,
  C2_SUB_FACTORS,
  ECONOMY_SUB_FACTORS,
  DOCTRINE_SUB_FACTORS,
  READINESS_SUB_FACTORS,
  TERRAIN_SUB_FACTORS,
];

// ─── Sub-factor scoring types and functions ──────────────────────────────────
export interface SubFactorScore {
  key: string;
  name: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
}

export function scoreSubFactors(
  componentKey: string,
  countryData: Record<string, unknown>
): SubFactorScore[] {
  const comp = ALL_COMPONENT_SUB_FACTORS.find((c) => c.componentKey === componentKey);
  if (!comp) return [];

  return comp.subFactors.map((sf) => {
    // Simple scoring: use the data source value directly, normalized 0-100
    const rawValue = (countryData[sf.key] as number) ?? 0;
    const rawScore = Math.min(100, Math.max(0, rawValue));
    const weightedScore = rawScore * sf.weight;
    return {
      key: sf.key,
      name: sf.name,
      weight: sf.weight,
      rawScore,
      weightedScore,
    };
  });
}

export function aggregateSubFactors(scores: SubFactorScore[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum: number, s: SubFactorScore) => sum + s.weightedScore, 0);
  const totalWeight = scores.reduce((sum: number, s: SubFactorScore) => sum + s.weight, 0);
  return totalWeight > 0 ? total / totalWeight : 0;
}
