// ─────────────────────────────────────────────────────────────────────────────
// Strategic Formulas Reference
// Key military science formulas used in BP model
// Documented for transparency and verification
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FormulaDefinition {
  id: string;
  name: string;
  nameRu: string;
  formula: string;         // LaTeX-like notation
  formulaDisplay: string;  // Russian display text
  variables: Array<{
    symbol: string;
    name: string;
    nameRu: string;
    unit: string;
    range?: string;
  }>;
  source: string;          // Academic/military source
  description: string;     // Russian explanation
  bpComponent: string;     // Which BP component uses this
}

// ─── Formula Database ─────────────────────────────────────────────────────────
export const FORMULAS: FormulaDefinition[] = [
  {
    id: "bp_total",
    name: "Combat Potential Index",
    nameRu: "Индекс Боевого Потенциала",
    formula: "BP = W×0.20 + M×0.15 + L×0.12 + C2×0.10 + E×0.15 + D×0.08 + R×0.10 + T×0.10",
    formulaDisplay: "БП = W×20% + M×15% + L×12% + ЦУР×10% + E×15% + D×8% + R×10% + T×10%",
    variables: [
      { symbol: "W", name: "Weapon Score", nameRu: "Оружие", unit: "0-100" },
      { symbol: "M", name: "Manpower Score", nameRu: "Люди", unit: "0-100" },
      { symbol: "L", name: "Logistics Score", nameRu: "Логистика", unit: "0-100" },
      { symbol: "C2", name: "Command & Control", nameRu: "Управление", unit: "0-100" },
      { symbol: "E", name: "Economy Score", nameRu: "Экономика", unit: "0-100" },
      { symbol: "D", name: "Doctrine Score", nameRu: "Доктрина", unit: "0-100" },
      { symbol: "R", name: "Readiness Score", nameRu: "Боеготовность", unit: "0-100" },
      { symbol: "T", name: "Terrain Score", nameRu: "География", unit: "0-100" },
    ],
    source: "Энциклопедия РВСН; адаптация модели Creveld (Fighting Power, 1982)",
    description: "Основная формула БП. Веса определены на основе анализа военной науки: Оружие и Экономика — по 20% и 15% как крупнейшие драйверы; Люди — 15%; Логистика 12%; Управление и Боеготовность по 10%; География 10%; Доктрина 8% (наименее измеримый компонент).",
    bpComponent: "all",
  },
  {
    id: "weapon_raw",
    name: "Weapon Raw Score",
    nameRu: "Сырой балл Оружия",
    formula: "W_raw = (ground + air + naval) × quality + nuke",
    formulaDisplay: "W = (танки+БМП×0.5+арт×0.3+РСЗО×0.4 + самолёты+вертолёты×0.4 + флот×0.5+ПЛ×3+авианосцы×15) × techLevel/5 + warheads/1000×30",
    variables: [
      { symbol: "ground", name: "Ground forces composite", nameRu: "Сухопутная составная", unit: "count", range: "0-15000" },
      { symbol: "air", name: "Air forces composite", nameRu: "Воздушная составная", unit: "count", range: "0-5000" },
      { symbol: "naval", name: "Naval forces composite", nameRu: "Морская составная", unit: "count", range: "0-500" },
      { symbol: "quality", name: "Tech level factor", nameRu: "Фактор технологии", unit: "0-2", range: "techLevel/5" },
      { symbol: "nuke", name: "Nuclear bonus", nameRu: "Ядерный бонус", unit: "0-30" },
    ],
    source: "GFP methodology + SIPRI Military Balance",
    description: "Сырой расчёт оружейного потенциала. Наземные силы доминируют (танки ×1, БМП ×0.5). Подлодки получают ×3 вес (стратегическая значимость), авианосцы ×15 (уникальная проекция силы). Ядерный бонус макс. 30 баллов. Качество = techLevel/5 (модификатор поколения).",
    bpComponent: "weaponScore",
  },
  {
    id: "manpower_raw",
    name: "Manpower Raw Score",
    nameRu: "Сырой балл Людей",
    formula: "M_raw = personnel×0.4 + reserve×0.3 + quality×0.3",
    formulaDisplay: "M = актив×0.4 + резерв×0.3 + (мораль × соотношение пригодности)×0.3",
    variables: [
      { symbol: "personnel", name: "Active personnel", nameRu: "Активный состав", unit: "0-2M" },
      { symbol: "reserve", name: "Reserve personnel", nameRu: "Резерв", unit: "0-3M" },
      { symbol: "quality", name: "Quality proxy", nameRu: "Прокси качества", unit: "0-1M", range: "morale × fitForService/population × 1M" },
    ],
    source: "Creveld Fighting Power; NATO manpower weighting",
    description: "Активный состав — основной элемент (40%). Резерв — стратегическая глубина (30%). Качество — прокси из морального индекса и доли пригодного населения. Мотивация = мораль × пригодность.以色列 демонстрирует: малое количество × высокое качество = высокий БП.",
    bpComponent: "manpowerScore",
  },
  {
    id: "logistics_raw",
    name: "Logistics Raw Score",
    nameRu: "Сырой балл Логистики",
    formula: "L_raw = ports×0.25 + airfields×0.25 + fuel×0.3 + fleet×0.2",
    formulaDisplay: "L = порты×0.25 + аэродромы×0.25 + нефтедобыча×0.3 + торговый флот×0.2",
    variables: [
      { symbol: "ports", name: "Major ports", nameRu: "Порты", unit: "0-100" },
      { symbol: "airfields", name: "Airfields", nameRu: "Аэродромы", unit: "0-500" },
      { symbol: "fuel", name: "Oil production", nameRu: "Нефтедобыча", unit: "K barrel/day" },
      { symbol: "fleet", name: "Merchant fleet", nameRu: "Торговый флот", unit: "0-6000" },
    ],
    source: "US DoD Logistics Assessment; GFP methodology",
    description: "Нефтедобыча получает 30% вес — стратегический ресурс для войны (Германия WWII потеряла войну из-за нехватки нефти). Порты и аэродромы — по 25% (точки снабжения). Торговый флот — 20% (мобилизационный резерв для морской логистики).",
    bpComponent: "logisticsScore",
  },
  {
    id: "c2_raw",
    name: "C2 Raw Score",
    nameRu: "Сырой балл Управления",
    formula: "C2_raw = c4i×0.4 + ew×0.3 + tech×0.3",
    formulaDisplay: "ЦУР = C4ISR×0.4 + РЭБ×0.3 + технологии×0.3",
    variables: [
      { symbol: "c4i", name: "C4ISR capability", nameRu: "C4ISR системы", unit: "1-10" },
      { symbol: "ew", name: "EW capability", nameRu: "РЭБ возможности", unit: "1-10" },
      { symbol: "tech", name: "Technology level", nameRu: "Технологический уровень", unit: "1-10" },
    ],
    source: "NATO C4ISR Assessment; СВО уроки РЭБ",
    description: "C4ISR — 40% (информационное превосходство = победа). РЭБ — 30% (СВО показала: РЭБ = жизнь, без РЭБ дроны = мишени). Технологический уровень — 30% (прокси для качества всех цифровых систем).",
    bpComponent: "c2Score",
  },
  {
    id: "economy_raw",
    name: "Economy Raw Score",
    nameRu: "Сырой балл Экономики",
    formula: "E_raw = gdp×0.3 + budget×0.35 + defpct×0.2 + eff×0.15",
    formulaDisplay: "E = ВВП(ППС)×0.3 + военный бюджет×0.35 + доля обороны×0.2 + эффективность×0.15",
    variables: [
      { symbol: "gdp", name: "GDP PPP", nameRu: "ВВП ППС", unit: "0-30000 млрд$" },
      { symbol: "budget", name: "Military budget", nameRu: "Военный бюджет", unit: "0-900 млрд$" },
      { symbol: "defpct", name: "Defense % GDP", nameRu: "Доля обороны в ВВП", unit: "0-15%" },
      { symbol: "eff", name: "Budget efficiency", nameRu: "Эффективность бюджета", unit: "%", range: "budget/GDP × 100" },
    ],
    source: "SIPRI; World Bank; GFP methodology",
    description: "Военный бюджет — 35% (самый прямой индикатор военной мощи). ВВП — 30% (экономическая база). Доля обороны — 20% (приоритетность военных расходов: Саудовская Аравия 6%+, США 3.4%, Германия 1.5%). Эффективность — 15% (насколько бюджет конвертируется в военную силу).",
    bpComponent: "economyScore",
  },
  {
    id: "log_normalize",
    name: "Logarithmic Normalization",
    nameRu: "Логарифмическая нормализация",
    formula: "norm(v) = log₁₀(v+1) / log₁₀(cap+1) × 100",
    formulaDisplay: "норм(знач) = log₁₀(знач+1) / log₁₀(макс+1) × 100",
    variables: [
      { symbol: "v", name: "Value", nameRu: "Значение", unit: "≥0" },
      { symbol: "cap", name: "Maximum in cohort", nameRu: "Максимум когорты", unit: ">0" },
    ],
    source: "Standard statistical normalization for heavy-tailed distributions",
    description: "Используется для данных с огромным разбросом (ВВП: 0.1-30000 млрд, танки: 0-13000). Логарифмическая шкала даёт более справедливое сравнение: США (ВВП 25000) не получает 250× баллов против Уругвая (ВВП 100), а примерно 2×. Это реалистично: экономика США НЕ в 250 раз мощнее для военных целей.",
    bpComponent: "all normalization",
  },
  {
    id: "terrain_landlocked",
    name: "Landlocked Penalty",
    nameRu: "Штраф за отсутствие моря",
    formula: "T_raw = (territory×0.5 + coast×0.5) × landlocked_factor",
    formulaDisplay: "T = (площадь×0.5 + побережье×0.5) × (0.5 если нет моря, иначе 1.0)",
    variables: [
      { symbol: "territory", name: "Area km²", nameRu: "Площадь", unit: "0-17M km²" },
      { symbol: "coast", name: "Coastline km", nameRu: "Побережье", unit: "0-200000 km" },
      { symbol: "landlocked_factor", name: "Landlocked multiplier", nameRu: "Множитель сухопутности", unit: "0.5 or 1.0" },
    ],
    source: "Mahan (The Influence of Sea Power upon History); strategic depth theory",
    description: "Страны без выхода к морю получают 50% штраф. Обоснование: невозможность морской проекции силы, зависимость от соседей для торговли, уязвимость к блокаде. Пример: Швейцария — нейтралитет компенсирует, но Казахстан — уязвимость. Монголия — стратегическая изоляция.",
    bpComponent: "terrainScore",
  },
  {
    id: "nuke_scoring",
    name: "Nuclear Bonus Calculation",
    nameRu: "Расчёт ядерного бонуса",
    formula: "nuke_bonus = min(warheads / 1000 × 30, 30)",
    formulaDisplay: "ядерный_бонус = мин(боеголовки / 1000 × 30, 30)",
    variables: [
      { symbol: "warheads", name: "Nuclear warheads", nameRu: "Боеголовки", unit: "0-14000" },
    ],
    source: "FAS Nuclear Notebook; SIPRI",
    description: "Ядерный бонус макс. 30 баллов из 100 в компоненте Оружие. Логика: ядерное оружие — 'великий уравнитель'. Пакистан (170 боеголовок) получает ~5 баллов, Россия (5580) — макс 30, но разница в реальном потенциале огромна. Макс в 30 баллов предотвращает доминирование ядерного фактора: конвенциональные силы всё ещё важнее для реальных конфликтов.",
    bpComponent: "weaponScore",
  },
  {
    id: "alliance_modifier",
    name: "Alliance Membership Modifier",
    nameRu: "Модификатор альянсовой принадлежности",
    formula: "Δ(C2) = alliance_c2_bonus; Δ(EW) = alliance_tech_bonus; Δ(Doctrine) = alliance_doctrine_bonus",
    formulaDisplay: "НАТО: ЦУР+1.5, РЭБ+1, Доктрина+2; ОДКБ: ЦУР+1, РЭБ+0.5, Доктрина+1; БРИКС: ЦУР+0.5, Доктрина+0.5",
    variables: [
      { symbol: "alliance_c2_bonus", name: "C2 bonus from alliance", nameRu: "Бонус ЦУР от альянса", unit: "0-2" },
      { symbol: "alliance_tech_bonus", name: "Tech/EW bonus", nameRu: "Бонус технологий/РЭБ", unit: "0-1.5" },
      { symbol: "alliance_doctrine_bonus", name: "Doctrine bonus", nameRu: "Бонус доктрины", unit: "0-2" },
    ],
    source: "NATO interoperability standards; CSTO joint exercises data",
    description: "Альянсы увеличивают качественные оценки. НАТО — максимальный бонус: общие стандарты связи (Link 16), РЭБ, разведка (Five Eyes), логистика. ОДКБ — скромнее: совместные учения, но слабая interoperability. БРИКС — экономический блок, военная координация минимальна. Нейтральные страны — нет бонуса.",
    bpComponent: "c2Score + doctrineScore",
  },
];

// ─── Query functions ──────────────────────────────────────────────────────────
export function getFormulaById(id: string): FormulaDefinition | undefined {
  return FORMULAS.find((f) => f.id === id);
}

export function getFormulasByComponent(component: string): FormulaDefinition[] {
  return FORMULAS.filter((f) =>
    f.bpComponent.toLowerCase().includes(component.toLowerCase())
  );
}

export function getAllFormulas(): FormulaDefinition[] {
  return FORMULAS;
}
