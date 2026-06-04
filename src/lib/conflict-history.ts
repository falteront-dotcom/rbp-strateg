// ─────────────────────────────────────────────────────────────────────────────
// Conflict History Database
// Major conflicts since 1945 with outcome analysis
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export type ConflictOutcome = "victory" | "defeat" | "draw" | "ongoing";
export type ConflictType = "conventional" | "asymmetric" | "civil" | "proxy" | "nuclear_threat" | "hybrid";

export interface ConflictParticipant {
  isoCode: string;
  side: "attacker" | "defender" | "intervener" | "supporter";
  role: string;
  forcesCommitted: number;  // estimated troop count
  casualties: number;       // estimated
  outcome: ConflictOutcome;
}

export interface ConflictEntry {
  id: string;
  name: string;
  nameRu: string;
  startDate: string;        // ISO date or year
  endDate: string | null;   // null = ongoing
  type: ConflictType;
  location: string;
  locationRu: string;
  participants: ConflictParticipant[];
  outcome: ConflictOutcome | null; // null = ongoing
  durationDays: number;
  intensity: number;        // 1-10 scale
  significance: number;     // 1-10 strategic significance
  lessonsLearned: string[]; // Key military lessons
  description: string;
}

export interface ConflictStats {
  totalConflicts: number;
  wins: number;
  losses: number;
  draws: number;
  ongoing: number;
  winRate: number;
  avgIntensity: number;
  avgSignificance: number;
  totalCasualties: number;
  recentConflicts: ConflictEntry[];
  dominantType: ConflictType;
}

// ─── Conflict Database ────────────────────────────────────────────────────────
const CONFLICT_DATABASE: ConflictEntry[] = [
  {
    id: "korea_1950",
    name: "Korean War",
    nameRu: "Корейская война",
    startDate: "1950-06-25",
    endDate: "1953-07-27",
    type: "conventional",
    location: "Korean Peninsula",
    locationRu: "Корейский полуостров",
    participants: [
      { isoCode: "PRK", side: "attacker", role: "Главные силы", forcesCommitted: 260000, casualties: 500000, outcome: "draw" },
      { isoCode: "KOR", side: "defender", role: "Оборона", forcesCommitted: 600000, casualties: 300000, outcome: "draw" },
      { isoCode: "USA", side: "intervener", role: "Командование ООН", forcesCommitted: 300000, casualties: 36574, outcome: "draw" },
      { isoCode: "CHN", side: "intervener", role: "Добровольцы", forcesCommitted: 700000, casualties: 400000, outcome: "draw" },
    ],
    outcome: "draw",
    durationDays: 1128,
    intensity: 8,
    significance: 9,
    lessonsLearned: [
      "Ограниченная война при ядерном превосходстве",
      "Значимость логистики в горной местности",
      "Роль воздушного превосходства",
    ],
    description: "Первый крупный конфликт холодной войны. Демонстрация ограниченной войны при наличии ядерного оружия.",
  },
  {
    id: "vietnam_1955",
    name: "Vietnam War",
    nameRu: "Вьетнамская война",
    startDate: "1955-11-01",
    endDate: "1975-04-30",
    type: "asymmetric",
    location: "Vietnam",
    locationRu: "Вьетнам",
    participants: [
      { isoCode: "VNM", side: "attacker", role: "Северный Вьетнам", forcesCommitted: 500000, casualties: 1000000, outcome: "victory" },
      { isoCode: "USA", side: "intervener", role: "Поддержка Юга", forcesCommitted: 550000, casualties: 58220, outcome: "defeat" },
      { isoCode: "VNM", side: "defender", role: "Южный Вьетнам", forcesCommitted: 700000, casualties: 300000, outcome: "defeat" },
    ],
    outcome: "victory",
    durationDays: 7078,
    intensity: 9,
    significance: 10,
    lessonsLearned: [
      "Асимметричная война — техническое превосходство не гарантирует победы",
      "Моральный фактор и общественная поддержка критичны",
      "Партизанская война истощает превосходящего противника",
    ],
    description: "Классический пример поражения технологически превосходящей стороны в асимметричном конфликте.",
  },
  {
    id: "yomkippur_1973",
    name: "Yom Kippur War",
    nameRu: "Война Судного дня",
    startDate: "1973-10-06",
    endDate: "1973-10-25",
    type: "conventional",
    location: "Sinai, Golan Heights",
    locationRu: "Синай, Голанские высоты",
    participants: [
      { isoCode: "EGY", side: "attacker", role: "Наступление на Синае", forcesCommitted: 200000, casualties: 15000, outcome: "draw" },
      { isoCode: "SYR", side: "attacker", role: "Наступление на Голанах", forcesCommitted: 150000, casualties: 30000, outcome: "defeat" },
      { isoCode: "ISR", side: "defender", role: "Оборона", forcesCommitted: 400000, casualties: 2600, outcome: "draw" },
    ],
    outcome: "draw",
    durationDays: 19,
    intensity: 10,
    significance: 8,
    lessonsLearned: [
      "Эффективность ПТУР против танков (ранние ПТУР)",
      "ЗРК ограничивают воздушное превосходство",
      "Внезапность — ключевой фактор начального успеха",
    ],
    description: "Демонстрация уязвимости танков от ПТУР и роли ПВО в ограничении авиации.",
  },
  {
    id: "falklands_1982",
    name: "Falklands War",
    nameRu: "Фолклендская война",
    startDate: "1982-04-02",
    endDate: "1982-06-14",
    type: "conventional",
    location: "Falkland Islands",
    locationRu: "Фолклендские острова",
    participants: [
      { isoCode: "ARG", side: "attacker", role: "Оккупация", forcesCommitted: 13000, casualties: 649, outcome: "defeat" },
      { isoCode: "GBR", side: "defender", role: "Возвращение", forcesCommitted: 28000, casualties: 255, outcome: "victory" },
    ],
    outcome: "victory",
    durationDays: 73,
    intensity: 7,
    significance: 7,
    lessonsLearned: [
      "Морская проекция силы на 13000 км",
      "Роль авианосцев и подводных лодок",
      "Противокорабельные ракеты (Exocet) — новая угроза",
    ],
    description: "Уникальная морская экспедиционная операция на большой дистанции.",
  },
  {
    id: "gulf_1991",
    name: "Gulf War",
    nameRu: "Война в Персидском заливе",
    startDate: "1991-01-17",
    endDate: "1991-02-28",
    type: "conventional",
    location: "Iraq, Kuwait",
    locationRu: "Ирак, Кувейт",
    participants: [
      { isoCode: "IRQ", side: "defender", role: "Оборона Кувейта", forcesCommitted: 650000, casualties: 30000, outcome: "defeat" },
      { isoCode: "USA", side: "attacker", role: "Коалиция", forcesCommitted: 700000, casualties: 292, outcome: "victory" },
      { isoCode: "GBR", side: "attacker", role: "Коалиция", forcesCommitted: 53000, casualties: 47, outcome: "victory" },
      { isoCode: "FRA", side: "attacker", role: "Коалиция", forcesCommitted: 20000, casualties: 2, outcome: "victory" },
    ],
    outcome: "victory",
    durationDays: 42,
    intensity: 9,
    significance: 10,
    lessonsLearned: [
      "Воздушная кампания — 38 дней перед наземным наступлением",
      "Точечное оружие изменяет характер войны",
      "Коалиционная война — дипломатия + военная мощь",
      "C4ISR — информационное превосходство решает",
    ],
    description: "Революция в военном деле: демонстрация информационной войны и высокоточного оружия.",
  },
  {
    id: "chechnya1_1994",
    name: "First Chechen War",
    nameRu: "Первая чеченская война",
    startDate: "1994-12-11",
    endDate: "1996-08-31",
    type: "asymmetric",
    location: "Chechnya",
    locationRu: "Чечня",
    participants: [
      { isoCode: "RUS", side: "attacker", role: "Федеральные силы", forcesCommitted: 70000, casualties: 6000, outcome: "defeat" },
    ],
    outcome: "defeat",
    durationDays: 629,
    intensity: 8,
    significance: 7,
    lessonsLearned: [
      "Городские бои нейтрализуют техническое превосходство",
      "Слабая подготовка личного состава после распада СССР",
      "Роль морального фактора и политической воли",
    ],
    description: "Поражение регулярной армии в городском бою против партизан.",
  },
  {
    id: "chechnya2_1999",
    name: "Second Chechen War",
    nameRu: "Вторая чеченская война",
    startDate: "1999-08-26",
    endDate: "2009-04-16",
    type: "asymmetric",
    location: "Chechnya",
    locationRu: "Чечня",
    participants: [
      { isoCode: "RUS", side: "attacker", role: "Федеральные силы", forcesCommitted: 100000, casualties: 7200, outcome: "victory" },
    ],
    outcome: "victory",
    durationDays: 3525,
    intensity: 7,
    significance: 6,
    lessonsLearned: [
      "Изменение тактики: блокирование + зачистка",
      "Спецназ вместо массовых штурмов",
      "Политическое управление конфликтом",
    ],
    description: "Успешная адаптация тактики после поражения в первой войне.",
  },
  {
    id: "afghan_2001",
    name: "War in Afghanistan",
    nameRu: "Война в Афганистане (2001)",
    startDate: "2001-10-07",
    endDate: "2021-08-30",
    type: "asymmetric",
    location: "Afghanistan",
    locationRu: "Афганистан",
    participants: [
      { isoCode: "USA", side: "attacker", role: "NATO ISAF", forcesCommitted: 100000, casualties: 2461, outcome: "defeat" },
      { isoCode: "AFG", side: "defender", role: "Талибан", forcesCommitted: 60000, casualties: 51000, outcome: "victory" },
    ],
    outcome: "defeat",
    durationDays: 7256,
    intensity: 7,
    significance: 9,
    lessonsLearned: [
      "20 лет войны без решающей победы",
      "Государство не строится военной силой",
      "Коррупция в афганской армии — крах за дни",
    ],
    description: "Самая длинная война США. Повторение вьетнамского синдрома в другом формате.",
  },
  {
    id: "iraq_2003",
    name: "Iraq War",
    nameRu: "Иракская война (2003)",
    startDate: "2003-03-20",
    endDate: "2011-12-18",
    type: "conventional",
    location: "Iraq",
    locationRu: "Ирак",
    participants: [
      { isoCode: "IRQ", side: "defender", role: "Регулярная армия", forcesCommitted: 375000, casualties: 7600, outcome: "defeat" },
      { isoCode: "USA", side: "attacker", role: "Коалиция", forcesCommitted: 250000, casualties: 4497, outcome: "draw" },
      { isoCode: "GBR", side: "attacker", role: "Коалиция", forcesCommitted: 46000, casualties: 179, outcome: "draw" },
    ],
    outcome: "draw",
    durationDays: 3195,
    intensity: 8,
    significance: 8,
    lessonsLearned: [
      "Быстрая победа над регулярной армией → партизанская война",
      "Постконфликтная стабилизация сложнее войны",
      "Разведывательные ошибки (WMD)",
    ],
    description: "Классический 'two-front war': быстрое поражение армии → затяжная партизанская.",
  },
  {
    id: "georgia_2008",
    name: "Russo-Georgian War",
    nameRu: "Пятидневная война",
    startDate: "2008-08-08",
    endDate: "2008-08-12",
    type: "conventional",
    location: "South Ossetia, Georgia",
    locationRu: "Южная Осетия, Грузия",
    participants: [
      { isoCode: "GEO", side: "attacker", role: "Наступление на Цхинвал", forcesCommitted: 15000, casualties: 170, outcome: "defeat" },
      { isoCode: "RUS", side: "defender", role: "Контрнаступление", forcesCommitted: 30000, casualties: 67, outcome: "victory" },
    ],
    outcome: "victory",
    durationDays: 5,
    intensity: 6,
    significance: 7,
    lessonsLearned: [
      "Быстрое наращивание сил — ключ к победе",
      "Информационная война параллельно с боевой",
      "Кибератаки на инфраструктуру Грузии",
    ],
    description: "Первая война с масштабной кибер-составляющей параллельно с боем.",
  },
  {
    id: "syria_2011",
    name: "Syrian Civil War",
    nameRu: "Гражданская война в Сирии",
    startDate: "2011-03-15",
    endDate: null,
    type: "civil",
    location: "Syria",
    locationRu: "Сирия",
    participants: [
      { isoCode: "SYR", side: "defender", role: "Правительственные войска", forcesCommitted: 300000, casualties: 80000, outcome: "ongoing" },
      { isoCode: "RUS", side: "intervener", role: "Авиация + советники", forcesCommitted: 6000, casualties: 200, outcome: "ongoing" },
      { isoCode: "USA", side: "intervener", role: "SDF поддержка", forcesCommitted: 5000, casualties: 30, outcome: "ongoing" },
      { isoCode: "IRN", side: "supporter", role: "Кудс + Хезболла", forcesCommitted: 15000, casualties: 2000, outcome: "ongoing" },
    ],
    outcome: null,
    durationDays: 5562,
    intensity: 9,
    significance: 8,
    lessonsLearned: [
      "Прокси-война: множественные внешние акторы",
      "Воздушная кампания России — перелом хода войны",
      "Химическое оружие — красная линия без последствий",
    ],
    description: "Классическая прокси-война с множеством региональных и глобальных акторов.",
  },
  {
    id: "crimea_2014",
    name: "Annexation of Crimea",
    nameRu: "Присоединение Крыма",
    startDate: "2014-02-20",
    endDate: "2014-03-21",
    type: "hybrid",
    location: "Crimea",
    locationRu: "Крым",
    participants: [
      { isoCode: "RUS", side: "attacker", role: "\"Вежливые люди\"", forcesCommitted: 20000, casualties: 0, outcome: "victory" },
      { isoCode: "UKR", side: "defender", role: "Украинские войска", forcesCommitted: 20000, casualties: 0, outcome: "defeat" },
    ],
    outcome: "victory",
    durationDays: 29,
    intensity: 3,
    significance: 9,
    lessonsLearned: [
      "Гибридная война: военные без знаков различия",
      "Информационная операция параллельно с военной",
      "Отсутствие сопротивления = победа без боя",
    ],
    description: "Образец гибридной войны: бескровное присоединение через спецоперацию.",
  },
  {
    id: "ukraine_2022",
    name: "Russo-Ukrainian War (2022)",
    nameRu: "СВО (2022)",
    startDate: "2022-02-24",
    endDate: null,
    type: "conventional",
    location: "Ukraine",
    locationRu: "Украина",
    participants: [
      { isoCode: "RUS", side: "attacker", role: "Специальная военная операция", forcesCommitted: 400000, casualties: 300000, outcome: "ongoing" },
      { isoCode: "UKR", side: "defender", role: "Оборона", forcesCommitted: 1000000, casualties: 200000, outcome: "ongoing" },
      { isoCode: "USA", side: "supporter", role: "Поставки оружия", forcesCommitted: 0, casualties: 0, outcome: "ongoing" },
      { isoCode: "NATO", side: "supporter", role: "Поддержка + разведка", forcesCommitted: 0, casualties: 0, outcome: "ongoing" },
    ],
    outcome: null,
    durationDays: 1561,
    intensity: 10,
    significance: 10,
    lessonsLearned: [
      "Дроны изменили тактику: разведка + удар в реальном времени",
      "Артиллерийская война: расход 5000-10000 снарядов/день",
      "Электронная война критична: РЭБ = жизнь",
      "Логистика определяет всё: NATO снабжение vs российское",
      "Мобилизация: качество > количество",
    ],
    description: "Крупнейший конвенциональный конфликт в Европе с 1945. Дроновая война нового типа.",
  },
  {
    id: "nagorno_2020",
    name: "Nagorno-Karabakh War (2020)",
    nameRu: "Война в Нагорном Карабахе (2020)",
    startDate: "2020-09-27",
    endDate: "2020-11-10",
    type: "conventional",
    location: "Nagorno-Karabakh",
    locationRu: "Нагорный Карабах",
    participants: [
      { isoCode: "AZE", side: "attacker", role: "Наступление", forcesCommitted: 70000, casualties: 2800, outcome: "victory" },
      { isoCode: "ARM", side: "defender", role: "Оборона", forcesCommitted: 50000, casualties: 3700, outcome: "defeat" },
    ],
    outcome: "victory",
    durationDays: 44,
    intensity: 8,
    significance: 7,
    lessonsLearned: [
      "Ударные дроны (Bayraktar TB2) против бронетехники",
      "Артиллерийские удары по точкам снабжения",
      "Малая страна с дронами может победить укрепившуюся",
    ],
    description: "Первая 'дроновая война' — ударные БПЛА определили исход.",
  },
  {
    id: "gaza_2023",
    name: "Israel-Gaza War (2023)",
    nameRu: "Война Израиль-Газа (2023)",
    startDate: "2023-10-07",
    endDate: null,
    type: "asymmetric",
    location: "Gaza Strip, Israel",
    locationRu: "Сектор Газа, Израиль",
    participants: [
      { isoCode: "ISR", side: "defender", role: "Контрнаступление", forcesCommitted: 500000, casualties: 1200, outcome: "ongoing" },
    ],
    outcome: null,
    durationDays: 607,
    intensity: 10,
    significance: 7,
    lessonsLearned: [
      "Неожиданная атака нарушает концепцию 'умной обороны'",
      "Туннельная война — новый тип подземного боя",
      "Информационная война: социальные сети = фронт",
    ],
    description: "Асимметричный конфликт с новыми формами войны: туннели, информационная война, дроны.",
  },
];

// ─── Query Functions ──────────────────────────────────────────────────────────
export function getConflictsByCountry(isoCode: string): ConflictEntry[] {
  return CONFLICT_DATABASE.filter((c) =>
    c.participants.some((p) => p.isoCode === isoCode)
  );
}

export function getConflictStats(isoCode: string): ConflictStats {
  const conflicts = getConflictsByCountry(isoCode);
  const participantEntries = conflicts.map((c) => {
    const p = c.participants.find((pp) => pp.isoCode === isoCode);
    return { conflict: c, participant: p };
  }).filter((e) => e.participant !== undefined);

  const wins = participantEntries.filter((e) => e.participant!.outcome === "victory").length;
  const losses = participantEntries.filter((e) => e.participant!.outcome === "defeat").length;
  const draws = participantEntries.filter((e) => e.participant!.outcome === "draw").length;
  const ongoing = participantEntries.filter((e) => e.participant!.outcome === "ongoing").length;
  const total = participantEntries.length;

  const totalCasualties = participantEntries.reduce((s, e) => s + e.participant!.casualties, 0);
  const avgIntensity = conflicts.length > 0
    ? conflicts.reduce((s, c) => s + c.intensity, 0) / conflicts.length
    : 0;
  const avgSignificance = conflicts.length > 0
    ? conflicts.reduce((s, c) => s + c.significance, 0) / conflicts.length
    : 0;

  // Determine dominant type
  const typeCounts: Record<string, number> = {};
  for (const c of conflicts) {
    typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1;
  }
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ConflictType ?? "conventional";

  // Recent conflicts (last 20 years)
  const recentConflicts = conflicts
    .filter((c) => {
      const year = parseInt(c.startDate.substring(0, 4));
      return year >= 2004;
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 5);

  return {
    totalConflicts: total,
    wins,
    losses,
    draws,
    ongoing,
    winRate: total > 0 ? wins / total : 0,
    avgIntensity,
    avgSignificance,
    totalCasualties,
    recentConflicts,
    dominantType,
  };
}

export function getConflictById(id: string): ConflictEntry | undefined {
  return CONFLICT_DATABASE.find((c) => c.id === id);
}

export function getAllConflicts(): ConflictEntry[] {
  return CONFLICT_DATABASE;
}

export function getConflictsByType(type: ConflictType): ConflictEntry[] {
  return CONFLICT_DATABASE.filter((c) => c.type === type);
}

export function getConflictsByDateRange(startYear: number, endYear: number): ConflictEntry[] {
  return CONFLICT_DATABASE.filter((c) => {
    const year = parseInt(c.startDate.substring(0, 4));
    return year >= startYear && year <= endYear;
  });
}

export function getOngoingConflicts(): ConflictEntry[] {
  return CONFLICT_DATABASE.filter((c) => c.outcome === null || c.endDate === null);
}

// ─── Experience Score ──────────────────────────────────────────────────────────
export function calculateConflictExperience(isoCode: string): number {
  const stats = getConflictStats(isoCode);
  const recentWeight = 2.0; // Recent conflicts weigh more
  const recentBonus = stats.recentConflicts.length * recentWeight * 5;
  const winBonus = stats.wins * 8;
  const intensityBonus = stats.avgIntensity * 3;
  const baseScore = stats.totalConflicts * 5;

  return Math.min(100, baseScore + winBonus + recentBonus + intensityBonus);
}
