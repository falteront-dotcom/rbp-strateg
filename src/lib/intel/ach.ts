// ─────────────────────────────────────────────────────────────────────────────
// Анализ конкурирующих гипотез (ACH) по Ричардсу Хойеру
// Матрица «гипотезы × свидетельства», фокус на опровержении, а не подтверждении
// РБП-Стратег 3.0 · Волна 2 «Разведывательный инструментарий» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// Метод (Heuer, Psychology of Intelligence Analysis, 1999):
// 1) перечисляются ВСЕ правдоподобные гипотезы, включая неудобные;
// 2) каждое свидетельство оценивается против каждой гипотезы;
// 3) выигрывает гипотеза с НАИМЕНЬШИМ опровержением, а не с наибольшим
//    подтверждением — подтверждения дешевы и часто совместимы со всеми
//    гипотезами сразу;
// 4) диагностично то свидетельство, которое различает гипотезы: одинаково
//    «согласующееся со всем» свидетельство не двигает вывод вообще;
// 5) обязателен анализ чувствительности: вывод, который переворачивается
//    от удаления одного свидетельства, — не вывод, а гипотеза о данных.

/** Оценка согласованности свидетельства с гипотезой. */
export type ACHRating = "CC" | "C" | "NA" | "I" | "II";

/** Числовой вклад оценки в опровержение: отрицательный — за гипотезу. */
export const ACH_RATING_INCONSISTENCY: Record<ACHRating, number> = {
  CC: -2,
  C: -1,
  NA: 0,
  I: 1,
  II: 2,
};

export const ACH_RATING_LABELS_RU: Record<ACHRating, string> = {
  CC: "Полностью согласуется",
  C: "Согласуется",
  NA: "Неприменимо / нейтрально",
  I: "Не согласуется",
  II: "Полностью не согласуется",
};

export interface ACHHypothesis {
  id: string;
  titleRu: string;
  descriptionRu: string;
  /** Априорная значимость гипотезы 0..1 (не вероятность; вес при равенстве опровержений). */
  priorWeight: number;
}

export interface ACHEvidence {
  id: string;
  titleRu: string;
  descriptionRu: string;
  /** Достоверность свидетельства 0..1 — сюда подаётся confidence адмиралтейского грейда. */
  credibility: number;
  /** Свидетельство наблюдаемо/проверяемо независимо от гипотез. */
  observable: boolean;
}

export type ACHMatrix = Record<string, Record<string, ACHRating>>;

export interface ACHHypothesisScore {
  hypothesisId: string;
  /** Суммарное опровержение (чем меньше, тем лучше по Хойеру). */
  inconsistencyScore: number;
  /** Взвешенное по достоверности опровержение. */
  weightedInconsistency: number;
  consistentCount: number;
  inconsistentCount: number;
  naCount: number;
  rank: number;
  /** Гипотеза не опровергнута ни одним сильным свидетельством (нет II). */
  surviving: boolean;
}

export interface ACHEvidenceDiagnostic {
  evidenceId: string;
  /** Диагностичность 0..1: насколько свидетельство различает гипотезы. */
  diagnosticity: number;
  consistentWith: string[];
  inconsistentWith: string[];
  neutralFor: string[];
  /** Свидетельство реально различает хотя бы две гипотезы. */
  discriminates: boolean;
  noteRu: string;
}

export interface ACHSensitivityEntry {
  removedEvidenceId: string;
  leaderBefore: string;
  leaderAfter: string;
  rankingChanged: boolean;
  leaderInconsistencyAfter: number;
}

export interface ACHAnalysis {
  scores: ACHHypothesisScore[];
  /** Гипотезы по возрастанию опровержения (первая — наименее опровергнутая). */
  ranking: string[];
  leaderHypothesisId: string;
  diagnostics: ACHEvidenceDiagnostic[];
  sensitivity: ACHSensitivityEntry[];
  mostDiagnosticEvidenceId: string | null;
  /** Вывод держится на одном свидетельстве и переворачивается при его удалении. */
  fragileConclusion: boolean;
  warningsRu: string[];
}

function ratingOf(matrix: ACHMatrix, evidenceId: string, hypothesisId: string): ACHRating {
  const row = matrix[evidenceId];
  if (!row) {
    return "NA";
  }
  return row[hypothesisId] ?? "NA";
}

function scoreHypotheses(
  hypotheses: ACHHypothesis[],
  evidence: ACHEvidence[],
  matrix: ACHMatrix,
  excludeEvidenceId?: string,
): ACHHypothesisScore[] {
  const scores: ACHHypothesisScore[] = hypotheses.map((h) => {
    let inconsistency = 0;
    let weighted = 0;
    let consistent = 0;
    let inconsistent = 0;
    let na = 0;
    let hasStrongRefutation = false;
    for (const e of evidence) {
      if (excludeEvidenceId !== undefined && e.id === excludeEvidenceId) {
        continue;
      }
      const rating = ratingOf(matrix, e.id, h.id);
      const value = ACH_RATING_INCONSISTENCY[rating];
      inconsistency += value;
      weighted += value * e.credibility;
      if (value < 0) {
        consistent += 1;
      } else if (value > 0) {
        inconsistent += 1;
      } else {
        na += 1;
      }
      if (rating === "II") {
        hasStrongRefutation = true;
      }
    }
    return {
      hypothesisId: h.id,
      inconsistencyScore: inconsistency,
      weightedInconsistency: weighted,
      consistentCount: consistent,
      inconsistentCount: inconsistent,
      naCount: na,
      rank: 0,
      surviving: !hasStrongRefutation,
    };
  });
  const sorted = [...scores].sort((a, b) => {
    if (a.weightedInconsistency !== b.weightedInconsistency) {
      return a.weightedInconsistency - b.weightedInconsistency;
    }
    const priorA = hypotheses.find((h) => h.id === a.hypothesisId)?.priorWeight ?? 0;
    const priorB = hypotheses.find((h) => h.id === b.hypothesisId)?.priorWeight ?? 0;
    return priorB - priorA;
  });
  sorted.forEach((s, idx) => {
    const target = scores.find((x) => x.hypothesisId === s.hypothesisId);
    if (target) {
      target.rank = idx + 1;
    }
  });
  return scores;
}

function diagnoseEvidence(
  hypotheses: ACHHypothesis[],
  evidence: ACHEvidence[],
  matrix: ACHMatrix,
): ACHEvidenceDiagnostic[] {
  return evidence.map((e) => {
    const values: number[] = [];
    const consistentWith: string[] = [];
    const inconsistentWith: string[] = [];
    const neutralFor: string[] = [];
    for (const h of hypotheses) {
      const rating = ratingOf(matrix, e.id, h.id);
      const value = ACH_RATING_INCONSISTENCY[rating];
      values.push(value);
      if (value < 0) {
        consistentWith.push(h.id);
      } else if (value > 0) {
        inconsistentWith.push(h.id);
      } else {
        neutralFor.push(h.id);
      }
    }
    const spread = values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
    const diagnosticity = Math.min(1, (spread / 4) * e.credibility + (e.observable ? 0.05 : 0));
    const discriminates = consistentWith.length > 0 && inconsistentWith.length > 0;
    let noteRu = "Свидетельство различает гипотезы и двигает вывод.";
    if (!discriminates && inconsistentWith.length === 0) {
      noteRu = "Согласуется со всеми гипотезами или нейтрально: диагностическая ценность низкая, подтверждением не является.";
    } else if (!discriminates && consistentWith.length === 0) {
      noteRu = "Опровергает все гипотезы: вероятна ошибка в самом свидетельстве или неполный набор гипотез.";
    }
    return {
      evidenceId: e.id,
      diagnosticity,
      consistentWith,
      inconsistentWith,
      neutralFor,
      discriminates,
      noteRu,
    };
  });
}

/** Полный ACH-анализ: скоринг, диагностика, чувствительность. */
export function analyzeACH(
  hypotheses: ACHHypothesis[],
  evidence: ACHEvidence[],
  matrix: ACHMatrix,
): ACHAnalysis {
  const scores = scoreHypotheses(hypotheses, evidence, matrix);
  const ranking = [...scores]
    .sort((a, b) => a.rank - b.rank)
    .map((s) => s.hypothesisId);
  const leaderHypothesisId = ranking[0] ?? "";
  const diagnostics = diagnoseEvidence(hypotheses, evidence, matrix);

  let mostDiagnostic: string | null = null;
  let bestDiag = -1;
  for (const d of diagnostics) {
    if (d.diagnosticity > bestDiag) {
      bestDiag = d.diagnosticity;
      mostDiagnostic = d.evidenceId;
    }
  }

  const sensitivity: ACHSensitivityEntry[] = evidence.map((e) => {
    const reduced = scoreHypotheses(hypotheses, evidence, matrix, e.id);
    const leaderAfter =
      [...reduced].sort((a, b) => a.rank - b.rank)[0]?.hypothesisId ?? "";
    const leaderScore = reduced.find((s) => s.hypothesisId === leaderAfter);
    return {
      removedEvidenceId: e.id,
      leaderBefore: leaderHypothesisId,
      leaderAfter,
      rankingChanged: leaderAfter !== leaderHypothesisId,
      leaderInconsistencyAfter: leaderScore ? leaderScore.weightedInconsistency : 0,
    };
  });

  const fragileConclusion = sensitivity.some((s) => s.rankingChanged);
  const warningsRu: string[] = [];
  if (hypotheses.length < 3) {
    warningsRu.push("Меньше трёх гипотез: ACH вырождается в подтверждение выбранной версии. Добавьте неудобные альтернативы.");
  }
  if (diagnostics.every((d) => !d.discriminates)) {
    warningsRu.push("Ни одно свидетельство не различает гипотезы: набор свидетельств не позволяет сделать вывод, нужен целевой сбор.");
  }
  if (fragileConclusion) {
    warningsRu.push("Вывод чувствителен к удалению одного свидетельства: в сводке обязательна оговорка о хрупкости и задача на перепроверку этого свидетельства.");
  }
  const leaderScore = scores.find((s) => s.hypothesisId === leaderHypothesisId);
  if (leaderScore && !leaderScore.surviving) {
    warningsRu.push("Наименее опровергнутая гипотеза имеет сильное опровержение (II): вероятно, истинная гипотеза не входит в набор.");
  }
  if (evidence.some((e) => e.credibility < 0.3)) {
    warningsRu.push("В матрице есть свидетельства с достоверностью < 0.3: их вклад в опровержение почти не должен влиять на вывод.");
  }

  return {
    scores,
    ranking,
    leaderHypothesisId,
    diagnostics,
    sensitivity,
    mostDiagnosticEvidenceId: mostDiagnostic,
    fragileConclusion,
    warningsRu,
  };
}

/** Пустая матрица NA по всем парам — стартовая заготовка для аналитика. */
export function buildEmptyMatrix(
  hypotheses: ACHHypothesis[],
  evidence: ACHEvidence[],
): ACHMatrix {
  const matrix: ACHMatrix = {};
  for (const e of evidence) {
    const row: Record<string, ACHRating> = {};
    for (const h of hypotheses) {
      row[h.id] = "NA";
    }
    matrix[e.id] = row;
  }
  return matrix;
}

/** Проверка полноты входных данных ACH перед анализом. */
export function validateACHInput(
  hypotheses: ACHHypothesis[],
  evidence: ACHEvidence[],
  matrix: ACHMatrix,
): string[] {
  const problems: string[] = [];
  const hIds = new Set(hypotheses.map((h) => h.id));
  if (hIds.size !== hypotheses.length) {
    problems.push("Дублирующиеся id гипотез.");
  }
  const eIds = new Set(evidence.map((e) => e.id));
  if (eIds.size !== evidence.length) {
    problems.push("Дублирующиеся id свидетельств.");
  }
  for (const e of evidence) {
    if (!matrix[e.id]) {
      problems.push(`Нет строки матрицы для свидетельства ${e.id}.`);
      continue;
    }
    for (const h of hypotheses) {
      if (matrix[e.id][h.id] === undefined) {
        problems.push(`Не заполнена ячейка: свидетельство ${e.id} × гипотеза ${h.id}.`);
      }
    }
  }
  return problems;
}

// ─── Учебный пример (используется в verify_intel.ts и документации) ──────────
// Сценарий: группировка у границы страны X. Три гипотезы, шесть свидетельств.

export const SAMPLE_ACH_HYPOTHESES: ACHHypothesis[] = [
  {
    id: "H1",
    titleRu: "Подготовка наступления в ближайшие 30 суток",
    descriptionRu: "Группировка создаётся для вторжения; развёртывание тылов и медицины соответствует наступательной операции.",
    priorWeight: 0.4,
  },
  {
    id: "H2",
    titleRu: "Демонстрация силы для принуждения к переговорам",
    descriptionRu: "Активность нарочито видима, тыловое обеспечение недостаточно для длительной операции, канал переговоров активен.",
    priorWeight: 0.35,
  },
  {
    id: "H3",
    titleRu: "Плановые учения без наступательного замысла",
    descriptionRu: "Активность укладывается в ежегодный цикл учений; сроки и состав соответствуют прошлым годам.",
    priorWeight: 0.25,
  },
];

export const SAMPLE_ACH_EVIDENCE: ACHEvidence[] = [
  {
    id: "E1",
    titleRu: "Развёрнуты полевые госпитали и запасы крови у границы",
    descriptionRu: "Медицинский индикатор: учения такого масштаба обеспечения обычно не требуют.",
    credibility: 0.85,
    observable: true,
  },
  {
    id: "E2",
    titleRu: "Активность широко освещается государственными медиа",
    descriptionRu: "Нарочитая видимость характерна для демонстрации, но возможна и как маскировка.",
    credibility: 0.7,
    observable: true,
  },
  {
    id: "E3",
    titleRu: "Запасы боеприпасов у группировки — менее 10 суток интенсивного боя",
    descriptionRu: "Оценка по спутниковым снимкам складов и интенсивности подвоза.",
    credibility: 0.6,
    observable: true,
  },
  {
    id: "E4",
    titleRu: "Сроки активности совпадают с ежегодными учениями прошлых лет",
    descriptionRu: "Календарное совпадение по открытым планам учений.",
    credibility: 0.75,
    observable: true,
  },
  {
    id: "E5",
    titleRu: "Идёт скрытая переброска второго эшелона ночью",
    descriptionRu: "Ночные эшелоны без публичного освещения, маскировка номеров техники.",
    credibility: 0.65,
    observable: true,
  },
  {
    id: "E6",
    titleRu: "Дипломатический канал передал условия «последнего предложения»",
    descriptionRu: "Сообщение источника о содержании закрытых консультаций.",
    credibility: 0.5,
    observable: false,
  },
];

// Калибровка учебного примера: лидер H2 должен оставаться лидером при
// удалении любого одного свидетельства (проверяется в verify_intel.ts).
// Логика оценок: публичность (E2) сильно противоречит наступлению ради
// внезапности; дефицит боеприпасов (E3) сильно согласуется с демонстрацией;
// скрытый второй эшелон (E5) противоречит и демонстрации, и учениям.
export const SAMPLE_ACH_MATRIX: ACHMatrix = {
  E1: { H1: "CC", H2: "I", H3: "II" },
  E2: { H1: "II", H2: "CC", H3: "C" },
  E3: { H1: "II", H2: "CC", H3: "C" },
  E4: { H1: "I", H2: "C", H3: "CC" },
  E5: { H1: "C", H2: "II", H3: "II" },
  E6: { H1: "NA", H2: "CC", H3: "II" },
};
