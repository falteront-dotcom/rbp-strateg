// ─────────────────────────────────────────────────────────────────────────────
// Strategic Culture Profiles
// Classification and analysis of military strategic cultures
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export type StrategicCultureType =
  | "maritime"       // Naval power projection (USA, UK, JPN)
  | "continental"    // Land-based defense (RUS, CHN, IND)
  | "expeditionary"  // Force projection abroad (FRA, UK)
  | "deterrent"      // Nuclear deterrent focus (PRK, PAK, ISR)
  | "guerrilla"      // Asymmetric warfare tradition (VNM, AFG, CUB)
  | "hybrid"         // Mixed capabilities (TUR, IRN, EGY)
  | "neutral"        // Non-aligned defense (CHE, SWE, AUT)
  | "collective"     // Alliance-dependent (NATO small states);

export type DoctrineEmphasis =
  | "firepower"       // Artillery + missiles (RUS, DPRK)
  | "maneuver"        // Speed + deep operations (USA, GBR, ISR)
  | "attrition"       // Grinding down the enemy (WWI-style)
  | "network"         // C4ISR + precision (USA, GBR)
  | "area_denial"     // A2/AD zones (RUS, CHN, IRN)
  | "insurgency"      // People's war, guerrilla (VNM, AFG)
  | "nuclear_deterrent" // Nuclear threshold strategy (PRK, PAK)
  | "coalition"       // Always fight with allies (NATO members);

export interface StrategicCultureProfile {
  isoCode: string;
  cultureType: StrategicCultureType;
  doctrineEmphasis: DoctrineEmphasis;
  militaryTradition: string;     // Russian description
  keyStrengths: string[];        // Russian
  keyWeaknesses: string[];       // Russian
  riskTolerance: number;         // 0-100, higher = more willing to use force
  innovationRate: number;        // 0-100, rate of doctrinal innovation
  adaptability: number;          // 0-100, ability to adapt in conflict
  allianceReliance: number;      // 0-100, dependence on allies
  nuclearDoctrine: "first_use" | "no_first_use" | "ambiguous" | "none";
  civilMilitaryRelation: "civilian" | "military" | "mixed";
  historicalPatterns: string[];  // Key patterns from conflict history
}

// ─── Culture Database ─────────────────────────────────────────────────────────
const CULTURE_PROFILES: Record<string, StrategicCultureProfile> = {
  USA: {
    isoCode: "USA",
    cultureType: "maritime",
    doctrineEmphasis: "network",
    militaryTradition: "Морская держава с глобальной проекцией силы. Доктрина воздушно-наземного боя (AirLand Battle) → Multi-Domain Operations.",
    keyStrengths: ["Глобальная логистика", "Информационное превосходство", "Высокая точность оружия", "Коалиционное лидерство"],
    keyWeaknesses: ["Зависимость от технологий", "Политические ограничения", "Затяжные асимметричные конфликты"],
    riskTolerance: 65,
    innovationRate: 85,
    adaptability: 70,
    allianceReliance: 60,
    nuclearDoctrine: "ambiguous",
    civilMilitaryRelation: "civilian",
    historicalPatterns: ["Победа в конвенциональных войнах", "Слабость в партизанских", "Технологический отрыв"],
  },
  RUS: {
    isoCode: "RUS",
    cultureType: "continental",
    doctrineEmphasis: "firepower",
    militaryTradition: "Континентальная держава с упором на артиллерию и ракетные войска. Советская глубокая операция → гибридная война.",
    keyStrengths: ["Артиллерийская мощь", "РЭБ и кибервойна", "Ядерное сдерживание", "Стратегическая глубина"],
    keyWeaknesses: ["Слабая логистика на дистанции", "Зависимость от мобилизации", "Технологическое отставание в ВПК"],
    riskTolerance: 75,
    innovationRate: 50,
    adaptability: 45,
    allianceReliance: 30,
    nuclearDoctrine: "ambiguous",
    civilMilitaryRelation: "mixed",
    historicalPatterns: ["Победа через истощение", "Глубокая операция", "Адаптация после поражений (Чечня)"],
  },
  CHN: {
    isoCode: "CHN",
    cultureType: "continental",
    doctrineEmphasis: "area_denial",
    militaryTradition: "Народная война → локальная война под высокотехнологичными условиями → информатизированная война.",
    keyStrengths: ["A2/AD в первом островном поясе", "Масштаб мобилизации", "Быстрая модернизация ВМС", "Кибер-возможности"],
    keyWeaknesses: ["Отсутствие боевого опыта", "Логистика дальней проекции", "Союзники"],
    riskTolerance: 55,
    innovationRate: 75,
    adaptability: 55,
    allianceReliance: 15,
    nuclearDoctrine: "no_first_use",
    civilMilitaryRelation: "mixed",
    historicalPatterns: ["Ограниченные конфликты", "Асимметричные подходы", "Корейская война: массовая стойкость"],
  },
  GBR: {
    isoCode: "GBR",
    cultureType: "maritime",
    doctrineEmphasis: "maneuver",
    militaryTradition: "Морская держава, экспедиционные операции. Философия 'maneuverist approach' — победа через манёвр, а не истощение.",
    keyStrengths: ["Экспедиционные возможности", "Спецназ (SAS/SBS)", "Разведка (Five Eyes)", "Авиация"],
    keyWeaknesses: ["Малый численный состав", "Ограниченная сухопутная мощь", "Зависимость от NATO"],
    riskTolerance: 55,
    innovationRate: 75,
    adaptability: 75,
    allianceReliance: 70,
    nuclearDoctrine: "ambiguous",
    civilMilitaryRelation: "civilian",
    historicalPatterns: ["Манёвр вместо истощения", "Морская блокада", "Спецоперации"],
  },
  FRA: {
    isoCode: "FRA",
    cultureType: "expeditionary",
    doctrineEmphasis: "maneuver",
    militaryTradition: "Экспедиционная традиция + независимая ядерная триада. Операции в Африке и Ближнем Востоке.",
    keyStrengths: ["Автономная проекция силы", "Ядерная независимость", "Опыт африканских операций", "Высокая мобильность"],
    keyWeaknesses: ["Малый бюджет относительно амбиций", "Износ техники", "Ограниченные резервы"],
    riskTolerance: 60,
    innovationRate: 65,
    adaptability: 70,
    allianceReliance: 50,
    nuclearDoctrine: "ambiguous",
    civilMilitaryRelation: "civilian",
    historicalPatterns: ["Экспедиционные операции", "Независимая линия в NATO", "Контртеррор"],
  },
  IND: {
    isoCode: "IND",
    cultureType: "continental",
    doctrineEmphasis: "firepower",
    militaryTradition: "Континентальная оборона против Пакистана и Китая. Доктрина Cold Start → проактивная оборона.",
    keyStrengths: ["Большая армия", "Горная война (Кашмир)", "Растущий ВМС", "Ядерная триада"],
    keyWeaknesses: ["Слабая interoperability видов ВС", "Зависимость от импорта оружия", "Отсталая оборонная промышленность"],
    riskTolerance: 50,
    innovationRate: 55,
    adaptability: 60,
    allianceReliance: 25,
    nuclearDoctrine: "no_first_use",
    civilMilitaryRelation: "civilian",
    historicalPatterns: ["Каргиль: ограниченная война в горах", "Холодный старт: быстрое наступление"],
  },
  ISR: {
    isoCode: "ISR",
    cultureType: "deterrent",
    doctrineEmphasis: "maneuver",
    militaryTradition: "Малая страна с качественным превосходством. Доктрина 'не допустить потери инициативы'. Обязательная военная служба.",
    keyStrengths: ["Качество личного состава", "Технологическое превосходство", "Разведка (Моссад)", "Воздушное превосходство"],
    keyWeaknesses: ["Малая стратегическая глубина", "Демографическая уязвимость", "Международное давление"],
    riskTolerance: 85,
    innovationRate: 90,
    adaptability: 85,
    allianceReliance: 40,
    nuclearDoctrine: "ambiguous",
    civilMilitaryRelation: "mixed",
    historicalPatterns: ["Превентивные удары (1967)", "Асимметричный ответ", "Технологические инновации (Железный купол)"],
  },
  PRK: {
    isoCode: "PRK",
    cultureType: "deterrent",
    doctrineEmphasis: "nuclear_deterrent",
    militaryTradition: "Сонгун (Военное первое) — армия как основа государства. Асимметричные подходы + ядерное шантажирование.",
    keyStrengths: ["Ядерное сдерживание", "Массовая артиллерия", "Спецназ", "Кибер-угроза"],
    keyWeaknesses: ["Устаревшая техника", "Экономическая слабость", "Изоляция", "Низкая логистика"],
    riskTolerance: 90,
    innovationRate: 25,
    adaptability: 30,
    allianceReliance: 60,
    nuclearDoctrine: "first_use",
    civilMilitaryRelation: "military",
    historicalPatterns: ["Провокации для переговоров", "Ядерный шантаж", "Асимметричные угрозы"],
  },
  TUR: {
    isoCode: "TUR",
    cultureType: "hybrid",
    doctrineEmphasis: "maneuver",
    militaryTradition: "НATO-совместимость + независимые операции (Сирия, Ливия). Баланс между Западом и самостоятельностью.",
    keyStrengths: ["Вторая армия NATO", "Опыт боёв (Сирия, Курдистан)", "БПЛА (Bayraktar)", "Географическое положение"],
    keyWeaknesses: ["Внутренняя политизация армии", "Курдский вопрос", "Зависимость от импорта"],
    riskTolerance: 65,
    innovationRate: 60,
    adaptability: 70,
    allianceReliance: 45,
    nuclearDoctrine: "none",
    civilMilitaryRelation: "mixed",
    historicalPatterns: ["БПЛА-революция (Карабах)", "Экспедиционные операции (Ливия)", "Контртеррор"],
  },
  IRN: {
    isoCode: "IRN",
    cultureType: "hybrid",
    doctrineEmphasis: "area_denial",
    militaryTradition: "Асимметричная доктрина: КСИР + прокси (Хезболла, Хути). Зона отрицания доступа в Ормузском проливе.",
    keyStrengths: ["Прокси-сеть", "Ракетный арсенал", "РЭБ", "Горький опыт (Иран-Ирак)"],
    keyWeaknesses: ["Устаревшая авиация", "Санкции", "Изоляция от мирового ВПК", "Конкуренция КСИР/Армия"],
    riskTolerance: 70,
    innovationRate: 55,
    adaptability: 65,
    allianceReliance: 35,
    nuclearDoctrine: "none",
    civilMilitaryRelation: "military",
    historicalPatterns: ["Асимметричный ответ", "Прокси-война", "Ракетные удары"],
  },
  UKR: {
    isoCode: "UKR",
    cultureType: "continental",
    doctrineEmphasis: "network",
    militaryTradition: "Постсоветская → NATO-интеграция. 2014: крах советской модели → адаптация к NATO-стандартам + инновации (дроны).",
    keyStrengths: ["Боевой опыт (СВО)", "Высокая мораль", "Дронные инновации", "NATO-поддержка", "Адаптивность"],
    keyWeaknesses: ["Зависимость от внешнего снабжения", "Мобилизационный кризис", "Ограниченная авиация и флот"],
    riskTolerance: 80,
    innovationRate: 90,
    adaptability: 95,
    allianceReliance: 75,
    nuclearDoctrine: "none",
    civilMilitaryRelation: "civilian",
    historicalPatterns: ["Быстрая адаптация (2014→2022)", "Дроновая тактика", "Артиллерийская война"],
  },
};

// ─── Default profile generator ────────────────────────────────────────────────
function generateDefaultProfile(isoCode: string): StrategicCultureProfile {
  return {
    isoCode,
    cultureType: "neutral",
    doctrineEmphasis: "coalition",
    militaryTradition: "Нейтральная/коалиционная оборонительная доктрина.",
    keyStrengths: ["Оборонительная готовность", "Союзническая поддержка"],
    keyWeaknesses: ["Ограниченная автономная проекция", "Малый военный бюджет"],
    riskTolerance: 30,
    innovationRate: 40,
    adaptability: 50,
    allianceReliance: 60,
    nuclearDoctrine: "none",
    civilMilitaryRelation: "civilian",
    historicalPatterns: ["Ограниченный боевой опыт"],
  };
}

// ─── Query Functions ──────────────────────────────────────────────────────────
export function getStrategicCulture(isoCode: string): StrategicCultureProfile {
  return CULTURE_PROFILES[isoCode] ?? generateDefaultProfile(isoCode);
}

export function getCountriesByCultureType(type: StrategicCultureType): string[] {
  return Object.values(CULTURE_PROFILES)
    .filter((p) => p.cultureType === type)
    .map((p) => p.isoCode);
}

export function getCountriesByDoctrineEmphasis(emphasis: DoctrineEmphasis): string[] {
  return Object.values(CULTURE_PROFILES)
    .filter((p) => p.doctrineEmphasis === emphasis)
    .map((p) => p.isoCode);
}

export function compareStrategicCultures(
  isoA: string,
  isoB: string
): {
  similarity: number;
  differences: string[];
  implications: string[];
} {
  const a = getStrategicCulture(isoA);
  const b = getStrategicCulture(isoB);

  let similarity = 0;
  const differences: string[] = [];
  const implications: string[] = [];

  // Culture type match
  if (a.cultureType === b.cultureType) similarity += 25;
  else differences.push(`Тип культуры: ${a.cultureType} vs ${b.cultureType}`);

  // Doctrine match
  if (a.doctrineEmphasis === b.doctrineEmphasis) similarity += 25;
  else differences.push(`Акцент доктрины: ${a.doctrineEmphasis} vs ${b.doctrineEmphasis}`);

  // Nuclear doctrine
  if (a.nuclearDoctrine === b.nuclearDoctrine) similarity += 15;
  else differences.push(`Ядерная доктрина: ${a.nuclearDoctrine} vs ${b.nuclearDoctrine}`);

  // Risk tolerance similarity
  const riskDiff = Math.abs(a.riskTolerance - b.riskTolerance);
  similarity += Math.max(0, 15 - riskDiff * 0.3);
  if (riskDiff > 30) implications.push("Разный уровень склонности к риску");

  // Alliance reliance
  const allianceDiff = Math.abs(a.allianceReliance - b.allianceReliance);
  similarity += Math.max(0, 10 - allianceDiff * 0.2);
  if (allianceDiff > 40) implications.push("Разная зависимость от союзников");

  // Strategic implications
  if (a.cultureType === "maritime" && b.cultureType === "continental") {
    implications.push("Морская vs континентальная: конфликт типов войны");
  }
  if (a.doctrineEmphasis === "firepower" && b.doctrineEmphasis === "maneuver") {
    implications.push("Огневая мощь vs манёвр: противостояние подходов");
  }
  if (a.nuclearDoctrine !== "none" && b.nuclearDoctrine !== "none") {
    implications.push("Обе стороны — ядерные державы: риск эскалации");
  }

  return {
    similarity: Math.round(similarity),
    differences,
    implications,
  };
}

export function getAllCultureProfiles(): Record<string, StrategicCultureProfile> {
  return { ...CULTURE_PROFILES };
}

export function getCultureTypes(): StrategicCultureType[] {
  return ["maritime", "continental", "expeditionary", "deterrent", "guerrilla", "hybrid", "neutral", "collective"];
}

export function getDoctrineEmphases(): DoctrineEmphasis[] {
  return ["firepower", "maneuver", "attrition", "network", "area_denial", "insurgency", "nuclear_deterrent", "coalition"];
}
