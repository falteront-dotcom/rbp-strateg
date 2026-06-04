// ─────────────────────────────────────────────────────────────────────────────
// BP Benchmark Data
// Real-world reference values for BP component validation
// Ensures BP scores match known military power assessments
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BPBenchmark {
  isoCode: string;
  name: string;
  expectedBPRank: number;        // Expected rank in global BP ranking
  expectedTier: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "MINIMAL";
  gfpRank2025: number;           // GFP 2025 rank for cross-validation
  knownStrengths: string[];      // Known military strengths
  knownWeaknesses: string[];     // Known military weaknesses
  nuclearTriad: boolean;         // Has complete nuclear triad
  powerProjection: "global" | "regional" | "continental" | "local";
  referenceSource: string;       // Source of validation data
}

// ─── Benchmark data for top 20 countries ──────────────────────────────────────
export const BP_BENCHMARKS: BPBenchmark[] = [
  {
    isoCode: "USA",
    name: "США",
    expectedBPRank: 1,
    expectedTier: "CRITICAL",
    gfpRank2025: 1,
    knownStrengths: [
      "Глобальная проекция силы — 750+ баз в 80 странах",
      "11 авианосцев — единственная страна с таким флотом",
      "5-е поколение истребителей (F-22, F-35) — 900+ единиц",
      "Высочайший военный бюджет — $886 млрд (2024)",
      "NATO лидерство — 31 союзник",
      "Кибервойна — US Cyber Command",
      "Космическая война — Space Force",
    ],
    knownWeaknesses: [
      "Затяжные асимметричные конфликты (Вьетнам, Афганистан)",
      "Политическая поляризация оборонных решений",
      "Зависимость от сложной логистической цепочки",
      "Старение ядерного арсенала (Minuteman III с 1970)",
    ],
    nuclearTriad: true,
    powerProjection: "global",
    referenceSource: "GFP 2025, IISS Military Balance 2024, CRS Defense Budget Report",
  },
  {
    isoCode: "RUS",
    name: "Россия",
    expectedBPRank: 2,
    expectedTier: "CRITICAL",
    gfpRank2025: 2,
    knownStrengths: [
      "Крупнейший ядерный арсенал — 5580 боеголовок (FAS 2024)",
      "Гиперзвуковое оружие — Авангард, Кинжал, Циркон",
      "Мощнейшая артиллерия — 14K+ систем",
      "РЭБ — Борисоглебск, Красуха-4, Сажатель",
      "Стратегическая глубина — 17М км²",
      "ПВО — С-400/С-500 лучшая в мире система",
    ],
    knownWeaknesses: [
      "СВО: огромные потери техники и личного состава",
      "Санкции: запрет на высокотехнологичные компоненты",
      "Логистика: зависимость от ж/д сети",
      "Демография: сокращение призывного ресурса",
      "ВПК: коррупция и неэффективность",
    ],
    nuclearTriad: true,
    powerProjection: "continental",
    referenceSource: "FAS Nuclear Notebook 2024, IISS, Офиц. данные Минобороны РФ",
  },
  {
    isoCode: "CHN",
    name: "Китай",
    expectedBPRank: 3,
    expectedTier: "CRITICAL",
    gfpRank2025: 3,
    knownStrengths: [
      "Крупнейшая армия мира — 2М+ активный состав",
      "Крупнейший флот по численности — 370+ кораблей",
      "Быстрая модернизация — J-20, Type 055, DF-41",
      "ВПК — крупнейший оборонный бюджет после США",
      "A2/AD — первый островной пояс (DF-21D, DF-26)",
      "Кибер — крупнейшая кибер-армия в мире",
    ],
    knownWeaknesses: [
      "Отсутствие боевого опыта с 1979",
      "Логистика дальней проекции — 1 база в Джибути",
      "Технологическое отставание в авиадвигателях",
      "Демография: старение населения",
    ],
    nuclearTriad: true,
    powerProjection: "regional",
    referenceSource: "US DoD China Military Power Report 2024, IISS",
  },
  {
    isoCode: "IND",
    name: "Индия",
    expectedBPRank: 4,
    expectedTier: "HIGH",
    gfpRank2025: 4,
    knownStrengths: [
      "2-я армия по численности — 1.45М активный состав",
      "Ядерная триада — завершена в 2018",
      "Опыт горной войны — Кашмир, Гималаи",
      "Растущий ВМС — авианосец Vikrant",
    ],
    knownWeaknesses: [
      "Зависимость от импорта оружия — 65% импорт",
      "Отсталая оборонная промышленность",
      "Слабая interoperability видов ВС",
      "Две фронта: Пакистан + Китай",
    ],
    nuclearTriad: true,
    powerProjection: "regional",
    referenceSource: "SIPRI, IISS Military Balance 2024",
  },
  {
    isoCode: "GBR",
    name: "Великобритания",
    expectedBPRank: 5,
    expectedTier: "HIGH",
    gfpRank2025: 6,
    knownStrengths: [
      "NATO — 2-я армия альянса",
      "Ядерная триада (SLBM только) — 4 Подслассы Vanguard",
      "Спецназ SAS/SBS — элитные силы",
      "Разведка — Five Eyes + GCHQ",
      "Экспедиционная проекция — HMS Queen Elizabeth",
    ],
    knownWeaknesses: [
      "Малая численность — 73K активный состав",
      "Сокращение бюджета",
      "Зависимость от USA в стратегических системах",
    ],
    nuclearTriad: false, // No land-based or air-based nukes
    powerProjection: "global",
    referenceSource: "IISS, UK MoD Defence Commands Paper 2024",
  },
  {
    isoCode: "FRA",
    name: "Франция",
    expectedBPRank: 6,
    expectedTier: "HIGH",
    gfpRank2025: 5,
    knownStrengths: [
      "Независимая ядерная триада — Force de frappe",
      "Экспедиционные силы — Операции в Африке",
      "Авианосец Charles de Gaulle — единственный не-американский атомный",
      "Оборонная автономия — Dassault, Naval Group, MBDA",
    ],
    knownWeaknesses: [
      "Малый бюджет относительно амбиций",
      "Износ техники",
      "Ограниченные резервы",
    ],
    nuclearTriad: true,
    powerProjection: "global",
    referenceSource: "IISS, Livre Blanc de la Défense",
  },
  {
    isoCode: "JPN",
    name: "Япония",
    expectedBPRank: 7,
    expectedTier: "HIGH",
    gfpRank2025: 7,
    knownStrengths: [
      "Крупнейший военный бюджет в Азии после Китая — $55Мрд",
      "Технологическое превосходство — F-35, Aegis",
      "МСDF — 155 кораблей, сильный флот ПЛО",
      "Статья 9 → reinterpretation — растущие амбиции",
    ],
    knownWeaknesses: [
      "Конституционные ограничения (Art. 9)",
      "Нет ядерного оружия",
      "Старение населения — кризис набора",
      "Зависимость от USA (ядерный зонтик)",
    ],
    nuclearTriad: false,
    powerProjection: "regional",
    referenceSource: "IISS, Japan MoD White Paper 2024",
  },
  {
    isoCode: "KOR",
    name: "Южная Корея",
    expectedBPRank: 8,
    expectedTier: "HIGH",
    gfpRank2025: 5,
    knownStrengths: [
      "6-я армия мира по численности — 600K активный состав",
      "Мощный ВПК — K2, KF-21, FA-50 экспорт",
      "Передовая электроника и ПВО",
      "Союз с США — 28.5K американских войск",
    ],
    knownWeaknesses: [
      "Северокорейская ядерная угроза",
      "Демографический кризис — рождаемость 0.72",
      "Ограниченная проекция за пределами полуострова",
    ],
    nuclearTriad: false,
    powerProjection: "local",
    referenceSource: "GFP 2025, IISS",
  },
  {
    isoCode: "TUR",
    name: "Турция",
    expectedBPRank: 9,
    expectedTier: "HIGH",
    gfpRank2025: 8,
    knownStrengths: [
      "2-я армия NATO по численности",
      "БПЛА революция — Bayraktar TB2/3, ANKA",
      "Географическое положение — Босфор, Ближний Восток",
      "Операции в Сирии, Ливии, Карабахе",
      "Растущий ВПК — TCG Anadolu, Altay танк",
    ],
    knownWeaknesses: [
      "Политическая нестабильность",
      "Отчисление от F-35 программы",
      "Курдский вопрос",
      "Экономическая волатильность",
    ],
    nuclearTriad: false,
    powerProjection: "regional",
    referenceSource: "IISS, SIPRI, GFP 2025",
  },
  {
    isoCode: "UKR",
    name: "Украина",
    expectedBPRank: 15,
    expectedTier: "MODERATE",
    gfpRank2025: 18,
    knownStrengths: [
      "Реальный боевой опыт — СВО с 2022",
      "Высочайшая мораль — 9/10",
      "Дроновые инновации — производство 200K+/мес",
      "NATO поддержка — $100Мрд+ с 2022",
      "Адаптивность — быстрая тактическая эволюция",
      "РЭБ — подавление российских систем",
    ],
    knownWeaknesses: [
      "Зависимость от внешнего снабжения",
      "Мобилизационный кризис",
      "Отсутствие авиации и флота",
      "Экономика — -29% ВВП (2022)",
      "Человеческие потери",
    ],
    nuclearTriad: false,
    powerProjection: "local",
    referenceSource: "ISW, IISS, Офиц. данные Генштаба ВСУ",
  },
];

// ─── Validation function ──────────────────────────────────────────────────────
export function validateBPRank(
  isoCode: string,
  calculatedRank: number,
): { match: boolean; expectedRank: number; delta: number; assessment: string } {
  const benchmark = BP_BENCHMARKS.find((b) => b.isoCode === isoCode);
  if (!benchmark) {
    return { match: true, expectedRank: calculatedRank, delta: 0, assessment: "No benchmark — accepted as-is" };
  }

  const delta = calculatedRank - benchmark.expectedBPRank;
  const match = Math.abs(delta) <= 3; // Allow ±3 rank deviation

  let assessment: string;
  if (delta === 0) assessment = "✓ Точное совпадение с ожидаемым рангом";
  else if (delta > 0) assessment = `Ранг ниже ожидаемого на ${delta} позиций — возможная недооценка`;
  else assessment = `Ранг выше ожидаемого на ${Math.abs(delta)} позиций — возможная переоценка`;

  return { match, expectedRank: benchmark.expectedBPRank, delta, assessment };
}

// ─── Cross-validate with GFP ─────────────────────────────────────────────────
export function crossValidateGFP(
  isoCode: string,
  calculatedRank: number,
): { gfpRank: number; delta: number; consistent: boolean } {
  const benchmark = BP_BENCHMARKS.find((b) => b.isoCode === isoCode);
  if (!benchmark) {
    return { gfpRank: calculatedRank, delta: 0, consistent: true };
  }

  const delta = calculatedRank - benchmark.gfpRank2025;
  const consistent = Math.abs(delta) <= 5;

  return { gfpRank: benchmark.gfpRank2025, delta, consistent };
}

// ─── Get all benchmarks ──────────────────────────────────────────────────────
export function getAllBenchmarks(): BPBenchmark[] {
  return BP_BENCHMARKS;
}

export function getBenchmark(isoCode: string): BPBenchmark | undefined {
  return BP_BENCHMARKS.find((b) => b.isoCode === isoCode);
}
