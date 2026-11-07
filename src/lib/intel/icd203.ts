// ─────────────────────────────────────────────────────────────────────────────
// Язык оценочных суждений по ICD 203
// Шкала вероятностей словами, аналитическая уверенность, валидатор сводок
// РБП-Стратег 3.0 · Волна 2 «Разведывательный инструментарий» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// ICD 203 (Intelligence Community Directive 203, ODNI) требует:
// — вероятностные суждения выражаются стандартизованными терминами шкалы,
//   а не свободными словами («возможно» без шкалы запрещено как оценка);
// — уровень аналитической уверенности заявляется отдельно от вероятности;
// — ключевые выводы сопровождаются альтернативами и указанием на пробелы;
// — абсолютные формулировки требуют уровня доказательности, которого у
//   разведывательной оценки по определению почти никогда нет.

export interface ProbabilityBand {
  termEn: string;
  termRu: string;
  minPct: number;
  maxPct: number;
  midPct: number;
}

export const PROBABILITY_SCALE: ProbabilityBand[] = [
  {
    termEn: "almost no chance",
    termRu: "почти исключено",
    minPct: 1,
    maxPct: 5,
    midPct: 3,
  },
  {
    termEn: "very unlikely",
    termRu: "очень маловероятно",
    minPct: 5,
    maxPct: 20,
    midPct: 12,
  },
  {
    termEn: "unlikely",
    termRu: "маловероятно",
    minPct: 20,
    maxPct: 45,
    midPct: 32,
  },
  {
    termEn: "roughly even chance",
    termRu: "шансы примерно равны",
    minPct: 45,
    maxPct: 55,
    midPct: 50,
  },
  {
    termEn: "likely",
    termRu: "вероятно",
    minPct: 55,
    maxPct: 80,
    midPct: 67,
  },
  {
    termEn: "very likely",
    termRu: "весьма вероятно",
    minPct: 80,
    maxPct: 95,
    midPct: 87,
  },
  {
    termEn: "almost certain",
    termRu: "почти наверняка",
    minPct: 95,
    maxPct: 99,
    midPct: 97,
  },
];

// ─── Лексикон фраз → полоса шкалы (bandIndex = -1: фраза вне шкалы) ─────────
export interface ProbabilityPhrase {
  phrase: string;
  bandIndex: number;
}
export const PROBABILITY_LEXICON: ProbabilityPhrase[] = [
  {
    phrase: "почти исключено",
    bandIndex: 0,
  },
  {
    phrase: "практически невозможно",
    bandIndex: 0,
  },
  {
    phrase: "almost no chance",
    bandIndex: 0,
  },
  {
    phrase: "очень маловероятно",
    bandIndex: 1,
  },
  {
    phrase: "крайне маловероятно",
    bandIndex: 1,
  },
  {
    phrase: "very unlikely",
    bandIndex: 1,
  },
  {
    phrase: "highly unlikely",
    bandIndex: 1,
  },
  {
    phrase: "маловероятно",
    bandIndex: 2,
  },
  {
    phrase: "вряд ли",
    bandIndex: 2,
  },
  {
    phrase: "unlikely",
    bandIndex: 2,
  },
  {
    phrase: "probably not",
    bandIndex: 2,
  },
  {
    phrase: "шансы примерно равны",
    bandIndex: 3,
  },
  {
    phrase: "пятьдесят на пятьдесят",
    bandIndex: 3,
  },
  {
    phrase: "roughly even chance",
    bandIndex: 3,
  },
  {
    phrase: "even chance",
    bandIndex: 3,
  },
  {
    phrase: "вероятно",
    bandIndex: 4,
  },
  {
    phrase: "скорее всего",
    bandIndex: 4,
  },
  {
    phrase: "likely",
    bandIndex: 4,
  },
  {
    phrase: "probably",
    bandIndex: 4,
  },
  {
    phrase: "весьма вероятно",
    bandIndex: 5,
  },
  {
    phrase: "с высокой вероятностью",
    bandIndex: 5,
  },
  {
    phrase: "very likely",
    bandIndex: 5,
  },
  {
    phrase: "highly likely",
    bandIndex: 5,
  },
  {
    phrase: "почти наверняка",
    bandIndex: 6,
  },
  {
    phrase: "почти несомненно",
    bandIndex: 6,
  },
  {
    phrase: "almost certain",
    bandIndex: 6,
  },
  {
    phrase: "almost certainly",
    bandIndex: 6,
  },
  {
    phrase: "возможно",
    bandIndex: -1,
  },
  {
    phrase: "не исключено",
    bandIndex: -1,
  },
  {
    phrase: "может произойти",
    bandIndex: -1,
  },
  {
    phrase: "possibly",
    bandIndex: -1,
  },
];

// ─── Абсолютные формулировки, запрещённые без особого обоснования ───────────
export const ABSOLUTE_PHRASES: string[] = [
  "несомненно",
  "гарантированно",
  "стопроцентно",
  "100%",
  "абсолютно точно",
  "вне всякого сомнения",
  "однозначно доказывает",
  "неопровержимо",
  "совершенно очевидно",
  "не вызывает сомнений",
  "точно известно",
  "безусловно произойдёт",
  "неминуемо",
  "предрешено",
  "certainly will",
  "undoubtedly",
  "guaranteed",
  "proves conclusively",
  "no doubt",
  "definitely will happen",
  "ironclad",
  "incontrovertible",
];

// ─── Уровни аналитической уверенности ────────────────────────────────────────

export type AnalyticConfidence = "high" | "moderate" | "low";

export interface AnalyticConfidenceProfile {
  level: AnalyticConfidence;
  labelRu: string;
  basisRu: string;
  requirementsRu: string[];
}

export const ANALYTIC_CONFIDENCE_PROFILES: Record<AnalyticConfidence, AnalyticConfidenceProfile> = {
  high: {
    level: "high",
    labelRu: "Высокая уверенность",
    basisRu: "Оценки хорошо обоснованы: качественные источники нескольких типов, предположения проверены, альтернативы рассмотрены и отвергнуты по существу.",
    requirementsRu: [
      "Минимум два независимых типа сбора по ключевому факту",
      "Средний confidence источников по адмиралтейской шкале ≥ 0.7",
      "Проведён ACH или эквивалентная проверка альтернатив",
      "Нет признаков целенаправленного обмана по ключевым каналам",
    ],
  },
  moderate: {
    level: "moderate",
    labelRu: "Умеренная уверенность",
    basisRu: "Источники правдоподобны, но есть пробелы, единичные противоречия или непроверенные предположения; альтернативы возможны.",
    requirementsRu: [
      "Ключевой факт подтверждён минимум одним надёжным типом сбора",
      "Средний confidence источников 0.45–0.7",
      "Альтернативы названы, но не все проверены до конца",
    ],
  },
  low: {
    level: "low",
    labelRu: "Низкая уверенность",
    basisRu: "Источники фрагментарны или сомнительны, предположения критичны для вывода, вероятен обман или самообман аналитика.",
    requirementsRu: [
      "Допустима при любом наборе данных, если честно заявлена",
      "Обязательна постановка задач сбора на закрытие пробелов",
      "Вывод формулируется как рабочая гипотеза, а не оценка",
    ],
  },
};

/** Термин шкалы ICD 203 для числовой вероятности (проценты 0..100). */
export function probabilityToBand(pct: number): ProbabilityBand {
  const clamped = Math.max(0, Math.min(100, pct));
  for (const band of PROBABILITY_SCALE) {
    if (clamped >= band.minPct && clamped <= band.maxPct) {
      return band;
    }
  }
  return PROBABILITY_SCALE[PROBABILITY_SCALE.length - 1];
}

/** Поиск фразы шкалы в тексте; возвращает полосу или null. */
export function findProbabilityPhrase(text: string): { phrase: string; band: ProbabilityBand | null } | null {
  const lower = text.toLowerCase();
  let best: { phrase: string; bandIndex: number } | null = null;
  for (const entry of PROBABILITY_LEXICON) {
    if (lower.includes(entry.phrase)) {
      if (!best || entry.phrase.length > best.phrase.length) {
        best = entry;
      }
    }
  }
  if (!best) {
    return null;
  }
  return {
    phrase: best.phrase,
    band: best.bandIndex >= 0 ? PROBABILITY_SCALE[best.bandIndex] : null,
  };
}

/** Оценка уровня уверенности по качеству источников и проверке альтернатив. */
export function deriveAnalyticConfidence(input: {
  avgSourceConfidence: number;
  independentSourceTypes: number;
  alternativesChecked: boolean;
  deceptionRisk: boolean;
}): AnalyticConfidence {
  if (input.deceptionRisk || input.avgSourceConfidence < 0.45) {
    return "low";
  }
  if (
    input.avgSourceConfidence >= 0.7 &&
    input.independentSourceTypes >= 2 &&
    input.alternativesChecked
  ) {
    return "high";
  }
  return "moderate";
}

// ─── Валидатор сводки ────────────────────────────────────────────────────────

export interface BriefingValidationOptions {
  /** В тексте есть явно сформулированная альтернативная гипотеза/оценка. */
  hasAlternative: boolean;
  /** В тексте заявлен уровень аналитической уверенности. */
  hasConfidenceStatement: boolean;
}

export interface BriefingIssue {
  ruleId: string;
  severity: "error" | "warning";
  messageRu: string;
  excerpt: string;
}

export interface BriefingValidation {
  valid: boolean;
  issues: BriefingIssue[];
  probabilityBand: ProbabilityBand | null;
}

const CONFIDENCE_MARKERS: string[] = [
  "уверенность",
  "confidence",
  "уверены",
  "уверенностью",
];

const ALTERNATIVE_MARKERS: string[] = [
  "альтернатив",
  "alternative",
  "другая гипотеза",
  "иное объяснение",
  "нельзя исключить сценарий",
];

/** Проверка текста сводки на соответствие базовым требованиям ICD 203. */
export function validateBriefing(
  text: string,
  options: BriefingValidationOptions,
): BriefingValidation {
  const issues: BriefingIssue[] = [];
  const lower = text.toLowerCase();

  for (const phrase of ABSOLUTE_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push({
        ruleId: "ICD-ABS",
        severity: "error",
        messageRu: `Абсолютная формулировка «${phrase}» без доказательной базы уровня судебного факта. ICD 203 требует вероятностного языка.`,
        excerpt: phrase,
      });
    }
  }

  const found = findProbabilityPhrase(text);
  if (!found) {
    issues.push({
      ruleId: "ICD-PROB",
      severity: "error",
      messageRu: "В сводке нет вероятностного суждения шкалы ICD 203: вывод не отвечает на вопрос «насколько вероятно».",
      excerpt: "",
    });
  } else if (found.band === null) {
    issues.push({
      ruleId: "ICD-VAGUE",
      severity: "error",
      messageRu: `Фраза «${found.phrase}» не входит в шкалу ICD 203 и не несёт числового смысла: замените на термин шкалы.`,
      excerpt: found.phrase,
    });
  }

  const hasConfidenceInText =
    options.hasConfidenceStatement ||
    CONFIDENCE_MARKERS.some((m) => lower.includes(m));
  if (!hasConfidenceInText) {
    issues.push({
      ruleId: "ICD-CONF",
      severity: "error",
      messageRu: "Не заявлен уровень аналитической уверенности: вероятность события и уверенность в оценке — разные вещи, нужны обе.",
      excerpt: "",
    });
  }

  const hasAlternativeInText =
    options.hasAlternative ||
    ALTERNATIVE_MARKERS.some((m) => lower.includes(m));
  if (!hasAlternativeInText) {
    issues.push({
      ruleId: "ICD-ALT",
      severity: "error",
      messageRu: "Нет альтернативной гипотезы или иного объяснения: ICD 203 требует показать, что рассматривалось, кроме основного вывода.",
      excerpt: "",
    });
  }

  if (found && found.band && (found.band.termEn === "almost certain" || found.band.termEn === "almost no chance")) {
    issues.push({
      ruleId: "ICD-EDGE",
      severity: "warning",
      messageRu: "Крайняя полоса шкалы: проверьте, не является ли оценка артефактом группового мышления; крайние вероятности требуют сильнейших оснований.",
      excerpt: found.phrase,
    });
  }

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
    probabilityBand: found ? found.band : null,
  };
}

/** Каноничная формулировка оценочного суждения для генератора сводок. */
export function formatEstimate(input: {
  judgmentRu: string;
  probabilityPct: number;
  confidence: AnalyticConfidence;
  alternativeRu: string;
}): string {
  const band = probabilityToBand(input.probabilityPct);
  const conf = ANALYTIC_CONFIDENCE_PROFILES[input.confidence];
  return [
    `Оценка: ${input.judgmentRu} — ${band.termRu} (${band.minPct}–${band.maxPct}%).`,
    `Аналитическая уверенность: ${conf.labelRu.toLowerCase()}.`,
    `Альтернатива: ${input.alternativeRu}`,
  ].join(" ");
}
