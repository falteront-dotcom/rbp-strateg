// ─────────────────────────────────────────────────────────────────────────────
// Strategic Scenarios Reference
// Predefined scenarios for What-If analysis
// Based on real geopolitical flashpoints and military contingencies
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

export type ScenarioCategory =
  | "regional_conflict"     // Региональный конфликт
  | "nuclear_exchange"      // Ядерный обмен
  | "coalition_shift"       // Смена коалиций
  | "technology_shock"      // Технологический шок
  | "economic_collapse"     // Экономический коллапс
  | "civil_war"             // Гражданская война
  | "coup_detat"            // Государственный переворот
  | "arms_race";            // Гонка вооружений

export interface ScenarioModifier {
  field: string;             // CountryRawData field name
  delta: number;             // Percentage change (-100 to +200)
  description: string;       // Russian description
}

export interface StrategicScenario {
  id: string;
  name: string;
  nameRu: string;
  category: ScenarioCategory;
  probability: number;       // 0-1 estimated probability
  impact: number;            // 1-10 global impact rating
  description: string;       // Russian detailed description
  affectedCountries: string[]; // ISO3 codes
  modifiers: Record<string, ScenarioModifier[]>; // keyed by ISO3
  historicalPrecedent: string;
  militaryImplications: string[];
  economicImplications: string[];
  geopoliticalImplications: string[];
}

// ─── Scenario Database ────────────────────────────────────────────────────────
export const STRATEGIC_SCENARIOS: StrategicScenario[] = [
  {
    id: "taiwan_strait_2027",
    name: "Taiwan Strait Crisis 2027",
    nameRu: "Тайваньский кризис 2027",
    category: "regional_conflict",
    probability: 0.3,
    impact: 9,
    description: "Китайская военная операция против Тайваня. Наиболее вероятный сценарий крупномасштабной войны между великими державами. Xi Jinping поручил ВС КНР быть готовыми к 2027 году. Варианты: блокада, ракетные удары, десантная операция.",
    affectedCountries: ["CHN", "USA", "JPN", "AUS", "TWN"],
    modifiers: {
      CHN: [
        { field: "militaryBudgetBn", delta: 50, description: "Военный бюджет +50% (экстренные расходы на операцию)" },
        { field: "activePersonnel", delta: 30, description: "Мобилизация +30% личного состава" },
        { field: "defensePctGdp", delta: 100, description: "Доля обороны в ВВП удваивается" },
      ],
      USA: [
        { field: "militaryBudgetBn", delta: 20, description: "Военный бюджет +20% (поддержка Тайваня)" },
        { field: "totalNavy", delta: -15, description: "Потери флота -15% (A2/AD зона КНР)" },
        { field: "totalAircraft", delta: -10, description: "Потери авиации -10% (ПВО КНР)" },
      ],
      JPN: [
        { field: "militaryBudgetBn", delta: 40, description: "Бюджет +40% (прямая угроза)" },
        { field: "defensePctGdp", delta: 100, description: "Доля обороны → 2%+ ВВП" },
      ],
    },
    historicalPrecedent: "Фолклендская война (1982): экспедиционная операция на 13000км, но без противника уровня Китая. Корейская война (1950): прямое столкновение США и Китая.",
    militaryImplications: [
      "Китайская A2/AD зона — серьёзная угроза для авианосных групп США",
      "Блокада Тайваня → глобальный кризис полупроводников (TSMC 90% передовых чипов)",
      "Ракетный обстрел: 1000+ ракет за 48 часов (оценка CSIS)",
      "Амфибийная операция: 1-3 млн солдат, 200+ кораблей (крупнейшая в истории)",
      "Ядерная эскалация: риск применения тактического ЯО",
    ],
    economicImplications: [
      "Глобальная рецессия: ВВП мира -5-10% (оценка Bloomberg)",
      "Кризис полупроводников: TSMC остановка → -$1T технологический сектор",
      "Энергетический кризис: блокада Южно-Китайского моря → нефть +200%",
      "Санкции против Китая: -$2T торговля, но Китай — основной кредитор США",
    ],
    geopoliticalImplications: [
      "Третья мировая война или ограниченный конфликт?",
      "NATO: поддержит ли Европа США в Азии?",
      "Россия: воспользуется отвлечением США для наступления в Европе?",
      "КНР: риск изоляции или новый мировой порядок?",
    ],
  },
  {
    id: "nato_russia_escalation",
    name: "NATO-Russia Direct Confrontation",
    nameRu: "Прямое столкновение НАТО-Россия",
    category: "regional_conflict",
    probability: 0.15,
    impact: 10,
    description: "Эскалация СВО до прямого столкновения НАТО и России. Триггеры: инцидент на границе, кибератака на инфраструктуру НАТО, применение тактического ЯО в Украине. Сценарий 3-й мировой войны.",
    affectedCountries: ["RUS", "USA", "GBR", "FRA", "DEU", "POL", "UKR"],
    modifiers: {
      RUS: [
        { field: "militaryBudgetBn", delta: 100, description: "Бюджет ×2 (военная экономика)" },
        { field: "activePersonnel", delta: 100, description: "Мобилизация: +100% личного состава" },
        { field: "gdpPppBn", delta: -30, description: "ВВП -30% (санкции + военная экономика)" },
      ],
      USA: [
        { field: "militaryBudgetBn", delta: 30, description: "Бюджет +30% (война в Европе)" },
        { field: "activePersonnel", delta: 20, description: "Мобилизация +20%" },
      ],
      POL: [
        { field: "militaryBudgetBn", delta: 100, description: "Бюджет ×2 (фронтовое государство)" },
        { field: "defensePctGdp", delta: 200, description: "Доля обороны → 6%+ ВВП" },
        { field: "totalTanks", delta: 50, description: "+50% танков (NATO усиление)" },
      ],
      DEU: [
        { field: "militaryBudgetBn", delta: 50, description: "Бюджет +50% (Zeitenwende)" },
        { field: "defensePctGdp", delta: 150, description: "Доля обороны → 3%+ ВВП" },
      ],
    },
    historicalPrecedent: "Холодная война: прямое столкновение избегалось 40 лет. Кубинский кризис (1962): ближайший момент к ядерной войне.",
    militaryImplications: [
      "Два ядерных сверхдержавы — вероятность ядерного обмена максимальна",
      "Российская A2/AD в Калининграде → блокада Балтики",
      "NATO: 3.5M активных + 4M резерв → подавляющий конвенциональный перевес",
      "Россия: 1.15M активных + 2M резерв + ядерная триада",
      "Северный флот → угроза атлантическим коммуникациям НАТО",
    ],
    economicImplications: [
      "Глобальная рецессия: ВВП -10-20%",
      "Энергетический кризис: российские ресурсы отрезаны → Европа в кризисе",
      "Зерновой кризис: Украина + Россия = 30% мирового экспорта",
      "Военная экономика: обе стороны переходят на военные рельсы",
    ],
    geopoliticalImplications: [
      "Конец мирового порядка с 1945",
      "Китай: возможность для расширения в Азии пока США заняты в Европе",
      "Глобальный Юг: нейтралитет или поддержка России?",
      "Ядерное сдерживание: сработает ли после 80 лет?",
    ],
  },
  {
    id: "china_tech_shock",
    name: "Chinese Technology Breakthrough",
    nameRu: "Китайский технологический прорыв",
    category: "technology_shock",
    probability: 0.25,
    impact: 7,
    description: "Китай достигает технологического паритета с США в ключевых областях: полупроводники, ИИ, стелс, авиадвигатели. Смещение баланса сил в Азии. Аналог: советская атомная бомба (1949) — конец американской монополии.",
    affectedCountries: ["CHN", "USA", "JPN", "KOR", "TWN"],
    modifiers: {
      CHN: [
        { field: "militaryBudgetBn", delta: 30, description: "Бюджет +30% (технологический дивиденд)" },
        { field: "totalAircraft", delta: 20, description: "+20% авиации (J-20/J-35 массовое производство)" },
        { field: "totalTanks", delta: 15, description: "+15% танков (Type 99A массовое производство)" },
      ],
    },
    historicalPrecedent: "Советская атомная бомба (1949): конец американской ядерной монополии. Спутник (1957): технологический шок для США.",
    militaryImplications: [
      "J-20/J-35 в количестве 500+ — угроза воздушного превосходства США в Азии",
      "Китайские авианосцы Type 003/004 — проекция силы в Тихом океане",
      "DF-41 + гиперзвук → преодоление ПРО США",
      "ИИ в C4ISR — автоматизация принятия решений",
    ],
    economicImplications: [
      "Китайские полупроводники → снижение зависимости от TSMC",
      "Экспорт оружия: Китай вытесняет Россию на рынке развивающихся стран",
      "Технологический суверенитет: невосприимчивость к санкциям",
    ],
    geopoliticalImplications: [
      "Конец технологического превосходства США в Азии",
      "Тайвань: потеря стратегического значения TSMC?",
      "Новая гонка вооружений: США инвестируют в следующий уровень технологий",
    ],
  },
  {
    id: "india_pakistan_nuclear",
    name: "India-Pakistan Nuclear Exchange",
    nameRu: "Индо-пакистанский ядерный обмен",
    category: "nuclear_exchange",
    probability: 0.05,
    impact: 10,
    description: "Эскалация кашмирского конфликта до ядерного обмена. Наиболее вероятная пара для ядерной войны: 4 войны, Pakistan 'First Use' доктрина, тактическое ЯО (Nasr 60km). Ограниченный обмен: 50-100 боеголовок.",
    affectedCountries: ["IND", "PAK", "CHN"],
    modifiers: {
      IND: [
        { field: "gdpPppBn", delta: -40, description: "ВВП -40% (ядерные удары по Мумбаи, Дели)" },
        { field: "activePersonnel", delta: -20, description: "Потери -20% личного состава" },
        { field: "populationM", delta: -10, description: "Население -10% (жертвы + эвакуация)" },
      ],
      PAK: [
        { field: "gdpPppBn", delta: -60, description: "ВВП -60% (ядерные удары по Исламабаду, Карачи)" },
        { field: "activePersonnel", delta: -30, description: "Потери -30% личного состава" },
        { field: "populationM", delta: -15, description: "Население -15% (жертвы + эвакуация)" },
      ],
    },
    historicalPrecedent: "Каргильская война (1999): самый близкий к ядерной войне момент после Кубинского кризиса.",
    militaryImplications: [
      "Пакистан: Nasr (60km) — тактическое ЯО для остановки индийских танков",
      "Индия: массированный ответ — стратегические удары по городам",
      "Оценка жертв: 50-125 млн прямых потерь (ICC estimate)",
      "Ядерная зима: -1.5°C глобально на 5 лет → голод на 2 млрд людей",
    ],
    economicImplications: [
      "Глобальный кризис: -5-10% ВВП мира от ядерной зимы",
      "Южная Азия: экономический коллапс обоих государств",
      "Миграционный кризис: 100+ млн беженцев",
    ],
    geopoliticalImplications: [
      "Конец ядерного табу: первый обмен с 1945",
      "Обесценивание ядерного сдерживания как концепции",
      "Китай: поддержка Пакистана → эскалация с Индией?",
      "Урок для Ирана/КНДР: ядерное оружие = уничтожение, не защита",
    ],
  },
  {
    id: "russia_economic_collapse",
    name: "Russian Economic Collapse",
    nameRu: "Экономический коллапс России",
    category: "economic_collapse",
    probability: 0.1,
    impact: 8,
    description: "Нефтяное эмбарго + санкции + демографический кризис → ВВП России падает на 30-50%. Военная экономика неустойчива: 40% бюджета = оборона. Аналог: СССР 1991 — экономический коллапс привёл к распаду.",
    affectedCountries: ["RUS", "BLR", "KAZ", "ARM"],
    modifiers: {
      RUS: [
        { field: "gdpPppBn", delta: -40, description: "ВВП -40% (эмбарго + демография)" },
        { field: "militaryBudgetBn", delta: -30, description: "Военный бюджет -30% (нет средств)" },
        { field: "activePersonnel", delta: -25, description: "Армия -25% (демобилизация + демография)" },
        { field: "totalTanks", delta: -20, description: "Танки -20% (невозможность модернизации)" },
        { field: "totalAircraft", delta: -15, description: "Авиация -15% (нет запчастей)" },
      ],
      BLR: [
        { field: "gdpPppBn", delta: -30, description: "ВВП -30% (зависимость от России)" },
        { field: "militaryBudgetBn", delta: -40, description: "Бюджет -40% (субсидии России прекращены)" },
      ],
    },
    historicalPrecedent: "СССР 1991: экономический коллапс → распад государства. Военный бюджет упал на 80% за 5 лет.",
    militaryImplications: [
      "Армия не может поддерживать текущий уровень: 1.15M → 800K",
      "Флот: 60% кораблей не могут выйти в море (ремонт)",
      "Авиация: 40% парка grounded (запчасти из ЕС/США)",
      "Ядерная триада: поддержание приоритетно, но не 100%",
    ],
    economicImplications: [
      "Нефтегаз: -50% доходов (эмбарго + зелёный переход)",
      "Демография: 146M → 130M к 2050 (без миграции)",
      "Мозги: 1M+ эмигрантов с 2022 — потеря квалифицированных кадров",
    ],
    geopoliticalImplications: [
      "ОДКБ: распад без российского субсидирования",
      "Центральная Азия: поворот к Китаю",
      "Беларусь: потеря российского субсидирования → политический кризис",
    ],
  },
  {
    id: "turkey_nato_exit",
    name: "Turkey Exits NATO",
    nameRu: "Выход Турции из НАТО",
    category: "coalition_shift",
    probability: 0.08,
    impact: 6,
    description: "Турция выходит из НАТО (или де-факто нейтралитет). Утрата контроля над Босфором/Дарданеллами, потеря Incirlik AB, южного фланга NATO. Крупнейший переворот в архитектуре европейской безопасности с 1949.",
    affectedCountries: ["TUR", "USA", "GBR", "GRC", "RUS"],
    modifiers: {
      TUR: [
        { field: "militaryBudgetBn", delta: 20, description: "Бюджет +20% (самостоятельная оборона)" },
        { field: "defensePctGdp", delta: 50, description: "Доля обороны +50%" },
      ],
      USA: [
        { field: "totalNavy", delta: -5, description: "Флот -5% (утрата баз в Турции)" },
        { field: "c4isrCapability", delta: -10, description: "C4ISR -10% (утрата radar sites)" },
      ],
    },
    historicalPrecedent: "Выход Франции из NATO MILITARY (1966-2009): 43 года вне военной структуры. Швеция/Финляндия → NATO (2023): шок архитектуры безопасности.",
    militaryImplications: [
      "Босфор/Дарданеллы: Турция контролирует проход российского флота",
      "Incirlik AB: утрата ключевой базы США на Ближнем Востоке",
      "Южный фланг NATO: Греция + Италия = уязвимая позиция",
      "Турецкая армия: 2-я в NATO → 1-я в новом блоке?",
    ],
    economicImplications: [
      "Турецкая экономика: -$50B торговля с ЕС/NATO",
      "Военная промышленность: Байкар, Рокетсан — независимый поставщик",
      "Энергетический коридор: Турция = мост между Востоком и Западом",
    ],
    geopoliticalImplications: [
      "Новый блок: Турция + Азербайджан + Пакистан?",
      "Россия: выигрыш — ослабление NATO южного фланга",
      "Ближний Восток: Турция как региональная держава без ограничений NATO",
    ],
  },
];

// ─── Query functions ──────────────────────────────────────────────────────────
export function getScenarioById(id: string): StrategicScenario | undefined {
  return STRATEGIC_SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByCategory(category: ScenarioCategory): StrategicScenario[] {
  return STRATEGIC_SCENARIOS.filter((s) => s.category === category);
}

export function getScenariosForCountry(isoCode: string): StrategicScenario[] {
  return STRATEGIC_SCENARIOS.filter((s) => s.affectedCountries.includes(isoCode));
}

export function getScenariosByImpact(minImpact: number): StrategicScenario[] {
  return STRATEGIC_SCENARIOS.filter((s) => s.impact >= minImpact);
}

export function getScenariosByProbability(minProb: number): StrategicScenario[] {
  return STRATEGIC_SCENARIOS.filter((s) => s.probability >= minProb);
}

export function getAllScenarios(): StrategicScenario[] {
  return STRATEGIC_SCENARIOS;
}

// ─── Apply scenario modifiers to country data ────────────────────────────────
export function applyScenarioModifiers(
  baseData: Record<string, number>,
  modifiers: ScenarioModifier[],
): Record<string, number> {
  const result = { ...baseData };
  for (const mod of modifiers) {
    if (result[mod.field] !== undefined) {
      result[mod.field] = result[mod.field] * (1 + mod.delta / 100);
      if (result[mod.field] < 0) result[mod.field] = 0;
    }
  }
  return result;
}
