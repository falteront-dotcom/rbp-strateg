// ─────────────────────────────────────────────────────────────────────────────
// Военные расходы 2025 года по SIPRI (Волна 4 дорожной карты 3.0)
// Факт-лист SIPRI «Trends in World Military Expenditure 2025»,
// опубликован в апреле 2026 года; база SIPRI Military Expenditure
// Database (релиз апреля 2026) заменяет все ранее публиковавшиеся ряды.
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────
//
// ЧЕСТНАЯ ОГОВОРКА О ЗНАЧЕНИЯХ.
// В файл включены только широко опубликованные значения факт-листа и
// его открытых пересказов (пресс-релиз SIPRI, профильная пресса).
// Ключевые цифры ряда — мировой итог $2 887 млрд (+2,9% в реальном
// выражении, 11-й год роста подряд, 2,5% мирового ВВП), США ~$921 млрд,
// Китай ~$336 млрд, Россия ~$190 млрд, Индия ~$92 млрд — опубликованы
// SIPRI напрямую. Значения ниже топ-5 восстановлены по открытым
// пересказам факт-листа и смежным публикациям IISS/SIPRI: они помечены
// estimated: true и пониженным грейдом, пока не сверены с самой базой
// SIPRI построчно. Грейды — адмиралтейские (надёжность × достоверность).
//
// МЕТОДОЛОГИЯ SIPRI (важно для интерпретации).
// Расходы — в текущих долларах США по рыночным курсам, включают
// расходы на личный состав, операции, закупки, военные НИОКР и
// строительство; по ряду стран (Россия, Китай, Саудовская Аравия)
// SIPRI даёт собственную оценку, а не официальную цифру бюджета.
// Поэтому «военные расходы по SIPRI» ≠ «официальный военный бюджет»:
// для России расхождение с национальными публикациями — норма метода,
// а не ошибка данных. Процент изменения — в реальном выражении
// (постоянные цены 2024 года), доля ВВП — по оценкам МВФ.

import type { Data3Grade } from "./verify-engine.js";

/** Одна строка ряда военных расходов SIPRI-2025 */
export interface SipriSpendingEntry {
  /** ISO 3166-1 alpha-3; WORLD — мировой итог, не страна */
  iso3: string;
  /** Название страны (EN) */
  name: string;
  /** Название страны (RU) */
  nameRu: string;
  /** Место в мировом рейтинге расходов (null для мирового итога) */
  rank: number | null;
  /** Военные расходы 2025, млрд долл. США (текущие цены) */
  spendingBn: number;
  /** Доля военных расходов в ВВП страны, % */
  pctGdp: number | null;
  /** Изменение к 2024 году в реальном выражении, % */
  changePct: number | null;
  /** Доля в мировых военных расходах, % */
  worldSharePct: number | null;
  /** Источник значения */
  source: string;
  /** Год данных */
  year: 2025;
  /** Значение — оценка (SIPRI или пересказ), а не прямая публикация базы */
  estimated: boolean;
  /** Адмиралтейский грейд значения */
  grade: Data3Grade;
  /** Пометка RU: метод, оговорки, контекст */
  noteRu: string;
}

/** Источник ряда одним именем — для сносок */
export const SIPRI_2025_SOURCE_NAME: string =
  "SIPRI, Trends in World Military Expenditure 2025 (факт-лист, апрель 2026)";

/** Мировой итог военных расходов 2025 года */
export const WORLD_MILITARY_SPENDING_2025: SipriSpendingEntry = {
  iso3: "WORLD",
  name: "World total",
  nameRu: "Мир в целом",
  rank: null,
  spendingBn: 2887,
  pctGdp: 2.5,
  changePct: 2.9,
  worldSharePct: 100,
  source: "SIPRI Military Expenditure Database, релиз апреля 2026",
  year: 2025,
  estimated: false,
  grade: {
    source: "B",
    info: 1,
  },
  noteRu:
    "Мировые военные расходы выросли 11-й год подряд и достигли максимума за всю историю наблюдений SIPRI; рост без США составил +9,2%.",
};

/** Рейтинг стран по военным расходам 2025 года (по убыванию) */
export const SIPRI_SPENDING_2025: SipriSpendingEntry[] = [
  {
    iso3: "USA",
    name: "United States",
    nameRu: "США",
    rank: 1,
    spendingBn: 921,
    pctGdp: 3.1,
    changePct: null,
    worldSharePct: 32,
    source: "SIPRI, факт-лист по расходам 2025 (апрель 2026)",
    year: 2025,
    estimated: true,
    grade: {
      source: "B",
      info: 2,
    },
    noteRu:
      "Крупнейший военный бюджет мира; оценка SIPRI ниже номинального оборонного бюджета США из-за методологических исключений. Тройка США–Китай–Россия даёт около половины мировых расходов.",
  },
  {
    iso3: "CHN",
    name: "China",
    nameRu: "Китай",
    rank: 2,
    spendingBn: 336,
    pctGdp: 1.7,
    changePct: null,
    worldSharePct: 12,
    source: "SIPRI, факт-лист по расходам 2025 (апрель 2026)",
    year: 2025,
    estimated: true,
    grade: {
      source: "B",
      info: 2,
    },
    noteRu:
      "Оценка SIPRI существенно выше официального бюджета КНР: включает внебюджетные статьи, НИОКР и военизированные формирования. Рост расходов — более трёх десятилетий подряд.",
  },
  {
    iso3: "RUS",
    name: "Russia",
    nameRu: "Россия",
    rank: 3,
    spendingBn: 190,
    pctGdp: 7.5,
    changePct: null,
    worldSharePct: 6.6,
    source: "SIPRI, факт-лист по расходам 2025 (апрель 2026)",
    year: 2025,
    estimated: true,
    grade: {
      source: "B",
      info: 3,
    },
    noteRu:
      "Оценка SIPRI по военной экономике военного времени: включает расходы, проходящие вне статьи «Национальная оборона». Официальные российские публикации дают меньшие числа — расхождение методологическое.",
  },
  {
    iso3: "DEU",
    name: "Germany",
    nameRu: "Германия",
    rank: 4,
    spendingBn: 107,
    pctGdp: 2.4,
    changePct: null,
    worldSharePct: 3.7,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Германия впервые в пятёрке крупнейших: рост финансируется в том числе специальным фондом бундесвера (Sondervermögen). Значение восстановлено по пересказам — подлежит построчной сверке с базой SIPRI.",
  },
  {
    iso3: "IND",
    name: "India",
    nameRu: "Индия",
    rank: 5,
    spendingBn: 92,
    pctGdp: 2.3,
    changePct: null,
    worldSharePct: 3.2,
    source: "SIPRI, факт-лист по расходам 2025 (апрель 2026)",
    year: 2025,
    estimated: true,
    grade: {
      source: "B",
      info: 2,
    },
    noteRu:
      "Пятое место мира; значимая часть бюджета — пенсии военнослужащих, поэтому доля собственно закупок и операций ниже, чем у соседей по рейтингу.",
  },
  {
    iso3: "GBR",
    name: "United Kingdom",
    nameRu: "Великобритания",
    rank: 6,
    spendingBn: 86,
    pctGdp: 2.3,
    changePct: null,
    worldSharePct: 3.0,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Великобритания заявила курс на 2,5% ВВП к 2027 году; значение 2025 года восстановлено по пересказам факт-листа и подлежит сверке с базой.",
  },
  {
    iso3: "UKR",
    name: "Ukraine",
    nameRu: "Украина",
    rank: 7,
    spendingBn: 84,
    pctGdp: 40,
    changePct: null,
    worldSharePct: 2.9,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Самая высокая военная нагрузка на экономику в мире: расходы военного времени без учёта иностранной военной помощи, которая учитывается у доноров. Доля ВВП — порядок величины, а не точная цифра.",
  },
  {
    iso3: "SAU",
    name: "Saudi Arabia",
    nameRu: "Саудовская Аравия",
    rank: 8,
    spendingBn: 83,
    pctGdp: 7.0,
    changePct: null,
    worldSharePct: 2.9,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка SIPRI",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Крупнейший spender Ближнего Востока; SIPRI традиционно оценивает саудовские расходы выше публикуемого бюджета из-за внебюджетных закупок.",
  },
  {
    iso3: "FRA",
    name: "France",
    nameRu: "Франция",
    rank: 9,
    spendingBn: 72,
    pctGdp: 2.2,
    changePct: null,
    worldSharePct: 2.5,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Расходы растут в рамках закона о военном программировании 2024–2030; включает содержание ядерного сдерживания.",
  },
  {
    iso3: "JPN",
    name: "Japan",
    nameRu: "Япония",
    rank: 10,
    spendingBn: 66,
    pctGdp: 1.6,
    changePct: null,
    worldSharePct: 2.3,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Япония продолжает наращивание в рамках курса на 2% ВВП к 2027 году; курс иены сильно влияет на долларовое значение ряда.",
  },
  {
    iso3: "ISR",
    name: "Israel",
    nameRu: "Израиль",
    rank: 11,
    spendingBn: 52,
    pctGdp: 9.0,
    changePct: null,
    worldSharePct: 1.8,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Расходы военного времени: операции в Газе и Ливане, перехват ракетных и дроновых атак. Американская военная помощь учитывается у США, а не здесь.",
  },
  {
    iso3: "KOR",
    name: "South Korea",
    nameRu: "Республика Корея",
    rank: 12,
    spendingBn: 50,
    pctGdp: 2.6,
    changePct: null,
    worldSharePct: 1.7,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Стабильные ~2,6% ВВП при растущем экспортном ВПК; одновременно крупнейший мировой экспортёр артиллерийских систем последних лет.",
  },
  {
    iso3: "ITA",
    name: "Italy",
    nameRu: "Италия",
    rank: 13,
    spendingBn: 48,
    pctGdp: 2.4,
    changePct: null,
    worldSharePct: 1.7,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Скачок ряда частично методологический (расширение периметра учитываемых статей); значение требует построчной сверки с базой SIPRI.",
  },
  {
    iso3: "CAN",
    name: "Canada",
    nameRu: "Канада",
    rank: 14,
    spendingBn: 46,
    pctGdp: 2.2,
    changePct: null,
    worldSharePct: 1.6,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Канада заявила о достижении 2% ВВП по методологии НАТО раньше обещанных сроков; значение требует сверки с базой SIPRI.",
  },
  {
    iso3: "POL",
    name: "Poland",
    nameRu: "Польша",
    rank: 15,
    spendingBn: 44,
    pctGdp: 4.5,
    changePct: null,
    worldSharePct: 1.5,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Самая высокая доля ВВП среди стран НАТО; масштабная закупочная программа (Корея, США) делает Польшу крупнейшим военным строительством Европы.",
  },
  {
    iso3: "AUS",
    name: "Australia",
    nameRu: "Австралия",
    rank: 16,
    spendingBn: 42,
    pctGdp: 2.0,
    changePct: null,
    worldSharePct: 1.5,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 3,
    },
    noteRu:
      "Рост связан с программой AUKUS (атомные подлодки) и перевооружением на дальнобойные средства поражения.",
  },
  {
    iso3: "ESP",
    name: "Spain",
    nameRu: "Испания",
    rank: 17,
    spendingBn: 38,
    pctGdp: 2.0,
    changePct: null,
    worldSharePct: 1.3,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Испания в 2025 году форсированно выходила на 2% ВВП по периметру НАТО; значение требует сверки с базой SIPRI.",
  },
  {
    iso3: "TUR",
    name: "Türkiye",
    nameRu: "Турция",
    rank: 18,
    spendingBn: 35,
    pctGdp: 2.6,
    changePct: null,
    worldSharePct: 1.2,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Долларовое значение крайне чувствительно к курсу лиры и инфляции; национальные публикации и SIPRI по Турции расходятся заметно.",
  },
  {
    iso3: "NLD",
    name: "Netherlands",
    nameRu: "Нидерланды",
    rank: 19,
    spendingBn: 30,
    pctGdp: 2.4,
    changePct: null,
    worldSharePct: 1.0,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Нидерланды закрепили оборонные расходы выше 2% ВВП законом; значение требует сверки с базой SIPRI.",
  },
  {
    iso3: "DZA",
    name: "Algeria",
    nameRu: "Алжир",
    rank: 20,
    spendingBn: 25,
    pctGdp: 8.0,
    changePct: null,
    worldSharePct: 0.9,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Крупнейший военный бюджет Африки при закрытой отчётности: оценка опирается на бюджетные публикации без детализации статей.",
  },
  {
    iso3: "BRA",
    name: "Brazil",
    nameRu: "Бразилия",
    rank: 21,
    spendingBn: 23,
    pctGdp: 1.1,
    changePct: null,
    worldSharePct: 0.8,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Большая часть расходов — личный состав и пенсии; закупочные программы (подлодки PROSUB, Gripen) дают меньшую долю ряда.",
  },
  {
    iso3: "TWN",
    name: "Taiwan",
    nameRu: "Тайвань",
    rank: 22,
    spendingBn: 19,
    pctGdp: 2.4,
    changePct: null,
    worldSharePct: 0.7,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Включая специальные бюджеты на закупки у США ряд заметно выше базового оборонного бюджета; SIPRI учитывает большую часть специальных статей.",
  },
  {
    iso3: "THA",
    name: "Thailand",
    nameRu: "Таиланд",
    rank: 23,
    spendingBn: 18,
    pctGdp: 1.3,
    changePct: null,
    worldSharePct: 0.6,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Значение восстановлено по пересказам; по Таиланду ряды SIPRI и национальных публикаций традиционно близки, но построчная сверка не проведена.",
  },
  {
    iso3: "MEX",
    name: "Mexico",
    nameRu: "Мексика",
    rank: 24,
    spendingBn: 17,
    pctGdp: 0.9,
    changePct: null,
    worldSharePct: 0.6,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Включая Национальную гвардию и военные функции внутриполитической безопасности; периметр учёта по Мексике у SIPRI шире формального бюджета SEDENA.",
  },
  {
    iso3: "SGP",
    name: "Singapore",
    nameRu: "Сингапур",
    rank: 25,
    spendingBn: 15,
    pctGdp: 2.8,
    changePct: null,
    worldSharePct: 0.5,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "C",
      info: 4,
    },
    noteRu:
      "Высокие удельные расходы города-государства: ставка на технологии и авиацию вместо массы.",
  },
  {
    iso3: "IDN",
    name: "Indonesia",
    nameRu: "Индонезия",
    rank: 26,
    spendingBn: 14,
    pctGdp: 0.9,
    changePct: null,
    worldSharePct: 0.5,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Заявленные планы модернизации (Rafale, подлодки) пока дают малую долю текущих расходов; значение требует сверки с базой.",
  },
  {
    iso3: "PAK",
    name: "Pakistan",
    nameRu: "Пакистан",
    rank: 27,
    spendingBn: 13,
    pctGdp: 2.5,
    changePct: null,
    worldSharePct: 0.45,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Официальный бюджет не включает часть военных пенсий и закупок; SIPRI добавляет оценки по смежным статьям.",
  },
  {
    iso3: "PHL",
    name: "Philippines",
    nameRu: "Филиппины",
    rank: 28,
    spendingBn: 9,
    pctGdp: 1.4,
    changePct: null,
    worldSharePct: 0.3,
    source: "SIPRI 2025, открытые пересказы факт-листа; оценка",
    year: 2025,
    estimated: true,
    grade: {
      source: "D",
      info: 4,
    },
    noteRu:
      "Рост программы Horizon 3 (береговая оборона и авиация) пока слабо виден в годовом ряде; значение требует сверки с базой.",
  },
];

/** Топ-N стран рейтинга (без мирового итога). */
export function sipriTopN(n: number): SipriSpendingEntry[] {
  return SIPRI_SPENDING_2025.slice(0, Math.max(0, n));
}

/** Запись по ISO3 из рейтинга или мирового итога. */
export function sipriEntryByIso3(iso3: string): SipriSpendingEntry | undefined {
  if (iso3 === WORLD_MILITARY_SPENDING_2025.iso3) {
    return WORLD_MILITARY_SPENDING_2025;
  }
  return SIPRI_SPENDING_2025.find((entry) => entry.iso3 === iso3);
}

/** Сумма расходов топ-N как доля мирового итога, %. */
export function sipriTopSharePct(n: number): number {
  const sum = sipriTopN(n).reduce((acc, entry) => acc + entry.spendingBn, 0);
  return (sum / WORLD_MILITARY_SPENDING_2025.spendingBn) * 100;
}

/** Ключевые факты ряда SIPRI-2025 для сводок и шапки UI. */
export const SIPRI_2025_KEY_FACTS_RU: string[] = [
  "Мировые военные расходы 2025 года — $2 887 млрд: максимум за историю наблюдений SIPRI.",
  "Рост +2,9% в реальном выражении — 11-й год роста подряд; военная нагрузка — 2,5% мирового ВВП.",
  "Пять крупнейших: США, Китай, Россия, Германия, Индия — вместе около 58% мировых расходов по оценкам факт-листа.",
  "Расходы Европы выросли примерно на 14% за год — главный вклад в мировой рост вне США.",
  "Значения ряда — методология SIPRI, а не официальные бюджеты: по закрытым странам это оценки института.",
];
