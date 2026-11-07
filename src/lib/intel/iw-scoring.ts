// ─────────────────────────────────────────────────────────────────────────────
// Скоринг Indicators & Warnings по стране
// Наблюдаемые индикаторы → уровень предупреждения и вклады по категориям
// РБП-Стратег 3.0 · Волна 2 «Разведывательный инструментарий» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// Принципы скоринга:
// — паттерн важнее суммы: три категории с умеренными сигналами опаснее,
//   чем одна категория с сильным (подготовка к войне — системное явление);
// — медицина и логистика — «честные» категории: их трудно имитировать
//   впустую, поэтому их вес в паттерне повышен;
// — ядерная категория работает как эскалационный множитель, а не слагаемое;
// — уровень CRITICAL недостижим по одной категории: это защита от паники
//   по одиночному громкому индикатору.

import {
  IW_CATALOG,
  findIndicator,
  type IWCategory,
  type IWIndicator,
} from "./iw-catalog";

export type WarningLevel = "ROUTINE" | "ELEVATED" | "HIGH" | "CRITICAL";

export const WARNING_LEVEL_LABELS_RU: Record<WarningLevel, string> = {
  ROUTINE: "Фоновый уровень",
  ELEVATED: "Повышенное внимание",
  HIGH: "Высокий уровень предупреждения",
  CRITICAL: "Критический уровень предупреждения",
};

export interface ObservedIndicator {
  indicatorId: string;
  /** Сила наблюдения 0..1: насколько полно проявлен признак. */
  strength: number;
  /** Confidence наблюдения 0..1 (из адмиралтейского грейда сообщения). */
  sourceConfidence: number;
  observedAt: string;
}

export interface CategoryScore {
  category: IWCategory;
  /** Скоринг категории 0..100. */
  score: number;
  observedCount: number;
  strongestIndicatorId: string | null;
  contribution: number;
}

export interface IWScoringResult {
  countryIso: string;
  totalScore: number;
  level: WarningLevel;
  categoryScores: CategoryScore[];
  topContributors: Array<{ indicatorId: string; contribution: number }>;
  /** Категории с нулевым покрытием наблюдением — слепые зоны оценки. */
  blindCategories: IWCategory[];
  activeCategories: number;
  assessmentRu: string;
  caveatsRu: string[];
}

interface CategoryProfile {
  category: IWCategory;
  /** Вес категории в паттерне предупреждения. */
  patternWeight: number;
  /** Насыщение: сколько «полных» индикаторов дают максимум категории. */
  saturationCount: number;
  honestyNoteRu: string;
}

export const IW_CATEGORY_SCORING_PROFILES: CategoryProfile[] = [
  {
    category: "mobilization",
    patternWeight: 1.1,
    saturationCount: 6,
    honestyNoteRu: "Мобилизацию трудно скрыть, но легко объявить демонстративно: сверять призыв с формированием частей.",
  },
  {
    category: "logistics",
    patternWeight: 1.25,
    saturationCount: 6,
    honestyNoteRu: "Самая честная категория: топливо и боеприпасы не развёртывают ради блефа в полном объёме.",
  },
  {
    category: "medical",
    patternWeight: 1.3,
    saturationCount: 4,
    honestyNoteRu: "Кровь и госпитали — сильнейший одиночный класс сигналов: мирных причин у полного паттерна почти нет.",
  },
  {
    category: "ew-cyber",
    patternWeight: 0.9,
    saturationCount: 5,
    honestyNoteRu: "Кибер- и РЭБ-подготовка малозаметна и обратима: отсутствие сигнала не означает отсутствия подготовки.",
  },
  {
    category: "nuclear",
    patternWeight: 1.0,
    saturationCount: 3,
    honestyNoteRu: "Работает множителем эскалации: ядерные сигналы без конвенциональной подготовки — чаще риторика.",
  },
  {
    category: "defense-industry",
    patternWeight: 0.8,
    saturationCount: 6,
    honestyNoteRu: "Медленная категория: показывает готовность к длинной войне, а не дату начала.",
  },
  {
    category: "finance",
    patternWeight: 0.7,
    saturationCount: 5,
    honestyNoteRu: "Финансовая подготовка шумна: экономические кризисы имитируют половину паттерна.",
  },
  {
    category: "diplomacy",
    patternWeight: 0.75,
    saturationCount: 5,
    honestyNoteRu: "Эвакуации дипломатов — поздний и дорогой сигнал; риторика без эвакуаций — дешёвый.",
  },
  {
    category: "information",
    patternWeight: 0.7,
    saturationCount: 5,
    honestyNoteRu: "Информационная подготовка необходима, но недостаточна: она предшествует и блефу, и войне.",
  },
  {
    category: "space",
    patternWeight: 0.65,
    saturationCount: 4,
    honestyNoteRu: "Космическая подготовка видна по орбитам, но атрибуция заказчиков съёмки часто неполна.",
  },
];

const ALL_CATEGORIES: IWCategory[] = [
  "mobilization",
  "logistics",
  "medical",
  "ew-cyber",
  "nuclear",
  "defense-industry",
  "finance",
  "diplomacy",
  "information",
  "space",
];

function levelFromScore(totalScore: number, activeCategories: number, nuclearScore: number): WarningLevel {
  if (totalScore >= 62 && activeCategories >= 4) {
    return "CRITICAL";
  }
  if (totalScore >= 40 || (totalScore >= 30 && nuclearScore >= 50)) {
    return "HIGH";
  }
  if (totalScore >= 18) {
    return "ELEVATED";
  }
  return "ROUTINE";
}

/** Скоринг предупреждения по набору наблюдений за страной. */
export function scoreIW(countryIso: string, observations: ObservedIndicator[]): IWScoringResult {
  const byCategory = new Map<IWCategory, CategoryScore>();
  const contributions: Array<{ indicatorId: string; contribution: number }> = [];

  for (const cat of ALL_CATEGORIES) {
    byCategory.set(cat, {
      category: cat,
      score: 0,
      observedCount: 0,
      strongestIndicatorId: null,
      contribution: 0,
    });
  }

  const rawByCategory = new Map<IWCategory, number>();
  for (const obs of observations) {
    const indicator: IWIndicator | undefined = findIndicator(obs.indicatorId);
    if (!indicator) {
      continue;
    }
    const value = indicator.weight * obs.strength * obs.sourceConfidence;
    contributions.push({ indicatorId: obs.indicatorId, contribution: value });
    rawByCategory.set(indicator.category, (rawByCategory.get(indicator.category) ?? 0) + value);
    const catScore = byCategory.get(indicator.category);
    if (catScore) {
      catScore.observedCount += 1;
      const current = findIndicator(catScore.strongestIndicatorId ?? "");
      if (!current || indicator.weight > current.weight) {
        catScore.strongestIndicatorId = indicator.id;
      }
    }
  }

  let weightedSum = 0;
  let weightTotal = 0;
  for (const profile of IW_CATEGORY_SCORING_PROFILES) {
    const raw = rawByCategory.get(profile.category) ?? 0;
    const normalized = Math.min(100, (raw / profile.saturationCount) * 100);
    const catScore = byCategory.get(profile.category);
    if (catScore) {
      catScore.score = normalized;
      catScore.contribution = normalized * profile.patternWeight;
    }
    weightedSum += normalized * profile.patternWeight;
    weightTotal += profile.patternWeight;
  }

  let totalScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // Эскалационный множитель ядерной категории.
  const nuclearScore = byCategory.get("nuclear")?.score ?? 0;
  if (nuclearScore > 0) {
    totalScore = Math.min(100, totalScore * (1 + nuclearScore / 400));
  }

  const categoryScores = ALL_CATEGORIES.map((c) => byCategory.get(c)).filter(
    (s): s is CategoryScore => s !== undefined,
  );
  const activeCategories = categoryScores.filter((s) => s.observedCount > 0 && s.score >= 10).length;
  const blindCategories = categoryScores
    .filter((s) => s.observedCount === 0)
    .map((s) => s.category);
  const level = levelFromScore(totalScore, activeCategories, nuclearScore);

  const topContributors = [...contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 8);

  const caveatsRu: string[] = [];
  if (blindCategories.includes("medical")) {
    caveatsRu.push("Медицинская категория не покрыта наблюдением: отсутствие данных о крови и госпиталях — слепая зона, а не отсутствие подготовки.");
  }
  if (blindCategories.includes("logistics")) {
    caveatsRu.push("Логистика не покрыта: без данных о топливе и боеприпасах уровень предупреждения занижен по построению.");
  }
  if (activeCategories <= 1 && level !== "ROUTINE") {
    caveatsRu.push("Уровень поднят одной категорией: проверьте мирное объяснение и признаки целенаправленной демонстрации (см. модуль deception).");
  }
  if (observations.some((o) => o.sourceConfidence < 0.4)) {
    caveatsRu.push("Часть наблюдений имеет низкий confidence источников: их вклад в скоринг должен перепроверяться в первую очередь.");
  }

  const assessmentRu =
    `Уровень предупреждения по стране ${countryIso}: ${WARNING_LEVEL_LABELS_RU[level]} ` +
    `(интегральный скоринг ${totalScore.toFixed(1)}, активных категорий: ${activeCategories}). ` +
    `Сильнейшие категории: ${[...categoryScores].sort((a, b) => b.score - a.score).slice(0, 3).map((s) => `${s.category} (${s.score.toFixed(0)})`).join(", ")}.`;

  return {
    countryIso,
    totalScore,
    level,
    categoryScores,
    topContributors,
    blindCategories,
    activeCategories,
    assessmentRu,
    caveatsRu,
  };
}

/** Быстрый конструктор наблюдения из индикатора каталога. */
export function observe(
  indicatorId: string,
  strength: number,
  sourceConfidence: number,
  observedAt: string,
): ObservedIndicator {
  return { indicatorId, strength, sourceConfidence, observedAt };
}

export { IW_CATALOG };
