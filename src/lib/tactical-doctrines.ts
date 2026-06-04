// ─────────────────────────────────────────────────────────────────────────────
// Tactical Doctrine Reference
// Military doctrines of major powers for tactical mode
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export type DoctrineType =
  | "deep_operation"       // Советская глубокая операция
  | "airland_battle"       // USA AirLand Battle
  | "maneuver_warfare"     // Манёвренная война
  | "attrition_warfare"    // Война на истощение
  | "hybrid_warfare"       // Гибридная война
  | "area_denial"          // A2/AD зона отрицания доступа
  | "insurgency"           // Повстанческая война
  | "maritime_power"       // Морская мощь
  | "nuclear_deterrence"   // Ядерное сдерживание
  | "network_centric";     // Сетецентрическая война

export interface TacticalDoctrine {
  type: DoctrineType;
  nameRu: string;
  originCountry: string;  // ISO3
  originPeriod: string;
  corePrinciples: string[];
  keyFormations: string[];
  terrainPreference: string[];
  strengthsVs: DoctrineType[];
  weaknessesVs: DoctrineType[];
  combinedArmsRatio: {
    infantry: number;      // 0-100%
    armor: number;
    artillery: number;
    airDefense: number;
    aviation: number;
  };
  historicalExamples: string[];
  modernApplication: string;
}

export const TACTICAL_DOCTRINES: TacticalDoctrine[] = [
  {
    type: "deep_operation",
    nameRu: "Глубокая операция (Советская военная доктрина)",
    originCountry: "RUS",
    originPeriod: "1930-е — настоящее время",
    corePrinciples: [
      "Последовательное эшелонирование: удар → развитие успеха → преследование",
      "Артиллерийская подготовка: массированный огонь 4-8 часов перед атакой",
      "Оперативные манёвренные группы (ОМГ): глубокий прорыв в тыл",
      "Концентрация сил на направлении главного удара (3:1 минимум)",
      "РЭБ как ключевой элемент: подавление связи противника",
    ],
    keyFormations: [
      "Мотострелковая дивизия — основной тактический элемент",
      "Танковая бригада — оперативный резерв развития успеха",
      "Артиллерийская группа — массированный огонь",
      "ОМГ — глубокий рейд в тыл противника",
    ],
    terrainPreference: ["Равнины", "Открытая местность", "Степи"],
    strengthsVs: ["attrition_warfare", "insurgency"],
    weaknessesVs: ["airland_battle", "maneuver_warfare"],
    combinedArmsRatio: { infantry: 30, armor: 25, artillery: 25, airDefense: 10, aviation: 10 },
    historicalExamples: [
      "Багратион (1944) — образец глубокой операции",
      "Восточная Украина (2022) — огневая подготовка + штурм",
      "Чечня (2000) — адаптация к городским условиям",
    ],
    modernApplication: "СВО: эшелонированная оборона + артиллерийская война + дроны-корректировщики. РЭБ парализует связь. Глубокая операция ограничена ПВО противника.",
  },
  {
    type: "airland_battle",
    nameRu: "Воздушно-наземный бой (США/NATO)",
    originCountry: "USA",
    originPeriod: "1980-е — настоящее время (→ Multi-Domain Operations)",
    corePrinciples: [
      "Воздушное превосходство — обязательное условие",
      "Совместные операции: авиация + наземные силы интегрированы",
      "Точечные удары вместо массированных — GPS/лазерное наведение",
      "Захват инициативы: атаковать глубже и быстрее противника",
      "C4ISR: информационное превосходство определяет ход боя",
    ],
    keyFormations: [
      "Бригадная боевая группа (BCT) — самодостаточная единица",
      "Air Tasking Order (ATO) — централизованное управление авиацией",
      "Fires Brigade — координация артиллерии/авиации",
      "C4ISR Node — центр управления разведкой и связью",
    ],
    terrainPreference: ["Любая (зависит от авиации)", "Пустыни", "Открытая местность"],
    strengthsVs: ["attrition_warfare", "area_denial"],
    weaknessesVs: ["insurgency", "hybrid_warfare"],
    combinedArmsRatio: { infantry: 20, armor: 20, artillery: 15, airDefense: 10, aviation: 35 },
    historicalExamples: [
      "Буря в пустыне (1991) — 38 дней воздушной кампании → 100ч наземной",
      "Ирак (2003) — Shock and Awe → быстрый разгром армии",
      "Афганистан (2001) — воздушная мощь + спецназ + союзники на земле",
    ],
    modernApplication: "Multi-Domain Operations (MDO): интеграция земли, воздуха, моря, космоса, кибера. Проблема: СВО показала, что ПВО может ограничить авиацию. Дроны — новая угроза.",
  },
  {
    type: "maneuver_warfare",
    nameRu: "Манёвренная война",
    originCountry: "GBR",
    originPeriod: "1990-е — настоящее время",
    corePrinciples: [
      "Избегать фронта — атаковать слабые точки",
      "Скорость и инициатива — не дать противнику восстановиться",
      "Разрушение когезии — деморализация вместо уничтожения",
      "Миссионный приказ (Auftragstaktik) — гибкость на поле боя",
      "Непрямые подходы — не бей там, где ожидают",
    ],
    keyFormations: [
      "Комбинированная группа — гибкая, самодостаточная",
      "Спецназ (SAS/SBS) — глубокая разведка и диверсии",
      "Воздушно-десантные — захват ключевых точек",
      "Лёгкие пехотные бригады — высокая мобильность",
    ],
    terrainPreference: ["Горы", "Леса", "Города", "Сложная местность"],
    strengthsVs: ["attrition_warfare", "area_denial"],
    weaknessesVs: ["deep_operation", "nuclear_deterrence"],
    combinedArmsRatio: { infantry: 35, armor: 15, artillery: 15, airDefense: 5, aviation: 30 },
    historicalExamples: [
      "Фолкленды (1982) — экспедиционная операция на 13000км",
      "Ирак (2003) — британский сектор, манёвр вместо штурма",
      "Мали (2013) — спецназ + авиация, минимальные силы",
    ],
    modernApplication: "NATO philosophy: инициатива и скорость. Британская группировка в Estonia (eFP) — манёвренная оборона. Проблема: малый состав ограничивает масштаб.",
  },
  {
    type: "hybrid_warfare",
    nameRu: "Гибридная война",
    originCountry: "RUS",
    originPeriod: "2014 — настоящее время",
    corePrinciples: [
      "Военные без знаков различия — правдоподобное отрицание",
      "Информационная война параллельно с боевой",
      "Кибератаки на инфраструктуру",
      "Экономическое давление",
      "Поддержка сепаратистов / прокси-сил",
    ],
    keyFormations: [
      "ЧВК (Вагнер) — правдоподобное отрицание + гибкость",
      "Спецназ ГРУ — диверсии и разведка",
      "Информационные войска — тролль-фермы, пропаганда",
      "Прокси-силы (ДНР/ЛНР) — местные силы с поддержкой",
    ],
    terrainPreference: ["Города", "Политически нестабильные регионы"],
    strengthsVs: ["attrition_warfare", "insurgency"],
    weaknessesVs: ["airland_battle", "network_centric"],
    combinedArmsRatio: { infantry: 40, armor: 10, artillery: 10, airDefense: 5, aviation: 5 },
    historicalExamples: [
      "Крым (2014) — бескровное присоединение через 'вежливых людей'",
      "Донбасс (2014) — прокси-война + информационная операция",
      "Сирия (2015) — авиация + ЧВК + дипломатия",
    ],
    modernApplication: "СВО: гибридная → конвенциональная война. Гибридная фаза работала в Крыму, но не в масштабной войне. Урок: гибридная война — инструмент ограниченных конфликтов.",
  },
  {
    type: "area_denial",
    nameRu: "Зона отрицания доступа (A2/AD)",
    originCountry: "CHN",
    originPeriod: "2000-е — настоящее время",
    corePrinciples: [
      "Не дать противнику подойти — ракеты дальнего радиуса",
      "Многоуровневая ПВО — средняя + дальняя + истребители",
      "Противокорабельные баллистические ракеты (DF-21D) — авианосцы",
      "Подводный флот — скрытая угроза",
      "Космическая и кибер-поддержка — отключение C4ISR противника",
    ],
    keyFormations: [
      "Ракетные базы (DF-21D/DF-26) — зона поражения 1500+ км",
      "ПВО зоны (HQ-9/HQ-22) — многослойная оборона",
      "Подводные лодки (Type 093/094) — скрытая угроза",
      "Береговая оборона (YJ-12/YJ-18) — ПКР",
    ],
    terrainPreference: ["Прибрежные воды", "Островные пояса", "Проливы"],
    strengthsVs: ["maritime_power", "airland_battle"],
    weaknessesVs: ["deep_operation", "nuclear_deterrence"],
    combinedArmsRatio: { infantry: 10, armor: 5, artillery: 15, airDefense: 30, aviation: 20 },
    historicalExamples: [
      "Первый островной пояс — зона A2/AD",
      "Тайваньский пролив — центр A2/AD стратегии КНР",
      "Южно-Китайское море — искусственные острова как базы",
    ],
    modernApplication: "Китайская стратегия: не дать США вмешаться в тайваньский конфликт. DF-21D 'убийца авианосцев' + ПВО + подлодки. Проблема: A2/AD не работает за пределами зоны.",
  },
  {
    type: "insurgency",
    nameRu: "Повстанческая / партизанская война",
    originCountry: "VNM",
    originPeriod: "1940-е — настоящее время",
    corePrinciples: [
      "Избегать прямых столкновений с превосходящим противником",
      "Удары по уязвимым точкам: логистика, коммуникации, мораль",
      "Сливание с населением — 'рыба в воде'",
      "Истощение: длительная война подрывает политическую волю",
      "Иностранная поддержка — критична для выживания",
    ],
    keyFormations: [
      "Местные ячейки — автономные группы 5-15 бойцов",
      "Партизанские отряды — мобильные ударные группы",
      "Подпольные сети — логистика и разведка",
      "Политические структуры — мобилизация населения",
    ],
    terrainPreference: ["Горы", "Джунгли", "Города (городская герилья)", "Сельская местность"],
    strengthsVs: ["airland_battle", "deep_operation"],
    weaknessesVs: ["attrition_warfare", "area_denial"],
    combinedArmsRatio: { infantry: 70, armor: 0, artillery: 5, airDefense: 5, aviation: 0 },
    historicalExamples: [
      "Вьетнам (1965-1975) — поражение США",
      "Афганистан (1979-1989) — поражение СССР",
      "Талибан (2001-2021) — возвращение к власти",
    ],
    modernApplication: "СВО: Украина использует элементы партизанской войны (диверсии в тылу, дроны, Hit-and-run). ХАМАС 7 октября — пример асимметричной атаки. Проблема: партизанская война не выигрывает территорию — только истощает.",
  },
];

// ─── Query functions ──────────────────────────────────────────────────────────
export function getDoctrineByType(type: DoctrineType): TacticalDoctrine | undefined {
  return TACTICAL_DOCTRINES.find((d) => d.type === type);
}

export function getAllDoctrines(): TacticalDoctrine[] {
  return TACTICAL_DOCTRINES;
}

export function getDoctrinesByCountry(isoCode: string): TacticalDoctrine[] {
  return TACTICAL_DOCTRINES.filter((d) => d.originCountry === isoCode);
}

export function getCounterDoctrine(type: DoctrineType): TacticalDoctrine[] {
  const doctrine = getDoctrineByType(type);
  if (!doctrine) return [];
  return doctrine.weaknessesVs
    .map((w) => getDoctrineByType(w))
    .filter((d): d is TacticalDoctrine => d !== undefined);
}
