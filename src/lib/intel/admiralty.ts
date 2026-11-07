// ─────────────────────────────────────────────────────────────────────────────
// Адмиралтейская система оценки источников и информации
// Надёжность источника A–F × достоверность информации 1–6 (практика НАТО)
// РБП-Стратег 3.0 · Волна 2 «Разведывательный инструментарий» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────

export type SourceReliability = "A" | "B" | "C" | "D" | "E" | "F";
export type InfoCredibility = 1 | 2 | 3 | 4 | 5 | 6;

export interface AdmiraltyGrade {
  source: SourceReliability;
  info: InfoCredibility;
}

export interface SourceReliabilityProfile {
  code: SourceReliability;
  labelRu: string;
  labelEn: string;
  descriptionRu: string;
  baseTrust: number;
  examplesRu: string[];
  cautionRu: string;
}

export interface InfoCredibilityProfile {
  code: InfoCredibility;
  labelRu: string;
  labelEn: string;
  descriptionRu: string;
  examplesRu: string[];
}

export interface CombinedAssessment {
  code: string;
  source: SourceReliability;
  info: InfoCredibility;
  confidence: number;
  confidenceLabelRu: string;
  handlingRu: string;
}

// ─── Профили надёжности источника (A–F) ─────────────────────────────────────
export const SOURCE_RELIABILITY_ORDER: SourceReliability[] = ["A", "B", "C", "D", "E", "F"];

export const SOURCE_RELIABILITY_PROFILES: Record<SourceReliability, SourceReliabilityProfile> = {
  A: {
    code: "A",
    labelRu: "Полностью надёжный",
    labelEn: "Completely reliable",
    descriptionRu: "Источник с безупречной историей: все прошлые сообщения подтверждались независимой проверкой.",
    baseTrust: 0.95,
    examplesRu: [
      "Официальные реестры с аудируемой методологией",
      "Собственные технические средства сбора с известной точностью",
    ],
    cautionRu: "Даже A-источник оценивается по каждому сообщению отдельно: надёжность источника не заменяет оценку информации.",
  },
  B: {
    code: "B",
    labelRu: "Обычно надёжный",
    labelEn: "Usually reliable",
    descriptionRu: "Источник с хорошей историей: подавляющее большинство сообщений подтверждалось, ошибки единичны и несистематичны.",
    baseTrust: 0.85,
    examplesRu: [
      "Устоявшиеся аналитические центры с открытой методологией",
      "Государственная статистика развитых стран",
    ],
    cautionRu: "Следить за сменой владельца/финансирования: грейд B не наследуется автоматически при смене редакции.",
  },
  C: {
    code: "C",
    labelRu: "Достаточно надёжный",
    labelEn: "Fairly reliable",
    descriptionRu: "Источник со смешанной историей: значимая доля сообщений подтверждалась, но есть систематические искажения по отдельным темам.",
    baseTrust: 0.68,
    examplesRu: [
      "Крупные медиа с редакционной проверкой фактов",
      "Коммерческие базы данных без полного аудита методики",
    ],
    cautionRu: "По чувствительным темам (потери, запасы) фактический грейд может быть ниже базового.",
  },
  D: {
    code: "D",
    labelRu: "Не всегда надёжный",
    labelEn: "Not usually reliable",
    descriptionRu: "Источник с проблемной историей: сообщения часто не подтверждаются, заметна заинтересованность в определённой картине.",
    baseTrust: 0.5,
    examplesRu: [
      "Партийные/государственные медиа в условиях конфликта",
      "Анонимные каналы с непроверяемой историей",
    ],
    cautionRu: "Использовать только как наводку для перепроверки другими средствами.",
  },
  E: {
    code: "E",
    labelRu: "Ненадёжный",
    labelEn: "Unreliable",
    descriptionRu: "Источник с плохой историей: большинство проверяемых сообщений оказалось ложными или существенно искажёнными.",
    baseTrust: 0.32,
    examplesRu: [
      "Каналы, ранее уличённые в фабрикации «документов»",
      "Источники с признаками управляемой дезинформации",
    ],
    cautionRu: "Сообщение E-источника само по себе — данные о возможной операции влияния, а не о фактах.",
  },
  F: {
    code: "F",
    labelRu: "Надёжность не может быть оценена",
    labelEn: "Reliability cannot be judged",
    descriptionRu: "Новый или анонимный источник без истории проверки. F — не «плохой», а «неизвестный»: грейд обязан пересматриваться после первых перепроверок.",
    baseTrust: 0.45,
    examplesRu: [
      "Впервые появившийся канал/инсайдер",
      "Источник, к которому нет доступа для верификации",
    ],
    cautionRu: "Запрещено повышать F выше C без минимум двух подтверждённых сообщений.",
  },
};

// ─── Профили достоверности информации (1–6) ─────────────────────────────────
export const INFO_CREDIBILITY_PROFILES: Record<InfoCredibility, InfoCredibilityProfile> = {
  1: {
    code: 1,
    labelRu: "Подтверждено",
    labelEn: "Confirmed",
    descriptionRu: "Информация подтверждена независимыми источниками другого типа сбора; противоречий нет.",
    examplesRu: [
      "Совпадение IMINT и SIGINT по одному событию",
      "Официальные данные, сверенные с коммерческими снимками",
    ],
  },
  2: {
    code: 2,
    labelRu: "Вероятно истинно",
    labelEn: "Probably true",
    descriptionRu: "Информация согласуется с известной картиной и частично подтверждена, но независимого подтверждения другого типа нет.",
    examplesRu: [
      "Логичное продолжение ранее подтверждённого тренда",
    ],
  },
  3: {
    code: 3,
    labelRu: "Возможно истинно",
    labelEn: "Possibly true",
    descriptionRu: "Информация правдоподобна, не противоречит известному, но и не подтверждена; возможны альтернативные объяснения.",
    examplesRu: [
      "Единичное сообщение хорошего источника без деталей",
    ],
  },
  4: {
    code: 4,
    labelRu: "Сомнительно",
    labelEn: "Doubtfully true",
    descriptionRu: "Информация вызывает вопросы: есть противоречия с известными данными или признаки заинтересованности источника.",
    examplesRu: [
      "Цифры, расходящиеся с торговыми/спутниковыми данными",
    ],
  },
  5: {
    code: 5,
    labelRu: "Неправдоподобно",
    labelEn: "Improbable",
    descriptionRu: "Информация противоречит твёрдо установленным фактам или физическим ограничениям.",
    examplesRu: [
      "Заявленные темпы производства выше мощностей заводов",
    ],
  },
  6: {
    code: 6,
    labelRu: "Достоверность не может быть оценена",
    labelEn: "Truth cannot be judged",
    descriptionRu: "Недостаточно данных даже для оценки правдоподобия: нет контекста, нет аналогов, нет способа проверки.",
    examplesRu: [
      "Сообщение о закрытых решениях без каких-либо внешних признаков",
    ],
  },
};

// ─── Матрица перевода грейда в числовой confidence (0..1) ───────────────────
// Калибровка: A1 — эталон; F (нельзя судить) не обнуляет оценку, а возвращает
// её к умеренному уровню неопределённости; 5 (неправдоподобно) — минимум шкалы.
export const ADMIRALTY_CONFIDENCE_MATRIX: Record<SourceReliability, Record<InfoCredibility, number>> = {
  A: {
    1: 0.98,
    2: 0.93,
    3: 0.85,
    4: 0.7,
    5: 0.5,
    6: 0.6,
  },
  B: {
    1: 0.92,
    2: 0.87,
    3: 0.78,
    4: 0.62,
    5: 0.44,
    6: 0.53,
  },
  C: {
    1: 0.82,
    2: 0.76,
    3: 0.66,
    4: 0.52,
    5: 0.36,
    6: 0.44,
  },
  D: {
    1: 0.68,
    2: 0.62,
    3: 0.53,
    4: 0.42,
    5: 0.28,
    6: 0.35,
  },
  E: {
    1: 0.52,
    2: 0.47,
    3: 0.4,
    4: 0.31,
    5: 0.2,
    6: 0.26,
  },
  F: {
    1: 0.6,
    2: 0.54,
    3: 0.46,
    4: 0.36,
    5: 0.24,
    6: 0.3,
  },
};

// ─── Комбинированные оценки по всем 36 сочетаниям ───────────────────────────
export const COMBINED_ASSESSMENTS: CombinedAssessment[] = [
  {
    code: "A1",
    source: "A",
    info: 1,
    confidence: 0.98,
    confidenceLabelRu: "Высокая уверенность",
    handlingRu: "Допустимо использовать как основание вывода с указанием грейда.",
  },
  {
    code: "A2",
    source: "A",
    info: 2,
    confidence: 0.93,
    confidenceLabelRu: "Высокая уверенность",
    handlingRu: "Допустимо использовать как основание вывода с указанием грейда.",
  },
  {
    code: "A3",
    source: "A",
    info: 3,
    confidence: 0.85,
    confidenceLabelRu: "Высокая уверенность",
    handlingRu: "Допустимо использовать как основание вывода с указанием грейда.",
  },
  {
    code: "A4",
    source: "A",
    info: 4,
    confidence: 0.7,
    confidenceLabelRu: "Уверенность выше средней",
    handlingRu: "Использовать в выводах с обязательной ссылкой на грейд и поиском подтверждения.",
  },
  {
    code: "A5",
    source: "A",
    info: 5,
    confidence: 0.5,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "A6",
    source: "A",
    info: 6,
    confidence: 0.6,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "B1",
    source: "B",
    info: 1,
    confidence: 0.92,
    confidenceLabelRu: "Высокая уверенность",
    handlingRu: "Допустимо использовать как основание вывода с указанием грейда.",
  },
  {
    code: "B2",
    source: "B",
    info: 2,
    confidence: 0.87,
    confidenceLabelRu: "Высокая уверенность",
    handlingRu: "Допустимо использовать как основание вывода с указанием грейда.",
  },
  {
    code: "B3",
    source: "B",
    info: 3,
    confidence: 0.78,
    confidenceLabelRu: "Уверенность выше средней",
    handlingRu: "Использовать в выводах с обязательной ссылкой на грейд и поиском подтверждения.",
  },
  {
    code: "B4",
    source: "B",
    info: 4,
    confidence: 0.62,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "B5",
    source: "B",
    info: 5,
    confidence: 0.44,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "B6",
    source: "B",
    info: 6,
    confidence: 0.53,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "C1",
    source: "C",
    info: 1,
    confidence: 0.82,
    confidenceLabelRu: "Уверенность выше средней",
    handlingRu: "Использовать в выводах с обязательной ссылкой на грейд и поиском подтверждения.",
  },
  {
    code: "C2",
    source: "C",
    info: 2,
    confidence: 0.76,
    confidenceLabelRu: "Уверенность выше средней",
    handlingRu: "Использовать в выводах с обязательной ссылкой на грейд и поиском подтверждения.",
  },
  {
    code: "C3",
    source: "C",
    info: 3,
    confidence: 0.66,
    confidenceLabelRu: "Уверенность выше средней",
    handlingRu: "Использовать в выводах с обязательной ссылкой на грейд и поиском подтверждения.",
  },
  {
    code: "C4",
    source: "C",
    info: 4,
    confidence: 0.52,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "C5",
    source: "C",
    info: 5,
    confidence: 0.36,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "C6",
    source: "C",
    info: 6,
    confidence: 0.44,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "D1",
    source: "D",
    info: 1,
    confidence: 0.68,
    confidenceLabelRu: "Уверенность выше средней",
    handlingRu: "Использовать в выводах с обязательной ссылкой на грейд и поиском подтверждения.",
  },
  {
    code: "D2",
    source: "D",
    info: 2,
    confidence: 0.62,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "D3",
    source: "D",
    info: 3,
    confidence: 0.53,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "D4",
    source: "D",
    info: 4,
    confidence: 0.42,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "D5",
    source: "D",
    info: 5,
    confidence: 0.28,
    confidenceLabelRu: "Очень низкая уверенность",
    handlingRu: "Только как повод для постановки задачи сбора; в выводы не включать.",
  },
  {
    code: "D6",
    source: "D",
    info: 6,
    confidence: 0.35,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "E1",
    source: "E",
    info: 1,
    confidence: 0.52,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "E2",
    source: "E",
    info: 2,
    confidence: 0.47,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "E3",
    source: "E",
    info: 3,
    confidence: 0.4,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "E4",
    source: "E",
    info: 4,
    confidence: 0.31,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "E5",
    source: "E",
    info: 5,
    confidence: 0.2,
    confidenceLabelRu: "Очень низкая уверенность",
    handlingRu: "Только как повод для постановки задачи сбора; в выводы не включать.",
  },
  {
    code: "E6",
    source: "E",
    info: 6,
    confidence: 0.26,
    confidenceLabelRu: "Очень низкая уверенность",
    handlingRu: "Только как повод для постановки задачи сбора; в выводы не включать.",
  },
  {
    code: "F1",
    source: "F",
    info: 1,
    confidence: 0.6,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "F2",
    source: "F",
    info: 2,
    confidence: 0.54,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "F3",
    source: "F",
    info: 3,
    confidence: 0.46,
    confidenceLabelRu: "Средняя уверенность",
    handlingRu: "Использовать как рабочую оценку; в сводку — только с оговоркой о грейде.",
  },
  {
    code: "F4",
    source: "F",
    info: 4,
    confidence: 0.36,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
  {
    code: "F5",
    source: "F",
    info: 5,
    confidence: 0.24,
    confidenceLabelRu: "Очень низкая уверенность",
    handlingRu: "Только как повод для постановки задачи сбора; в выводы не включать.",
  },
  {
    code: "F6",
    source: "F",
    info: 6,
    confidence: 0.3,
    confidenceLabelRu: "Низкая уверенность",
    handlingRu: "Не использовать как единственное основание вывода; задача на перепроверку обязательна.",
  },
];

// ─── Правила понижения грейда (downgrade rules) ─────────────────────────────
// Грейд никогда не повышается автоматически; понижение — обязательно при
// срабатывании любого правила. Контекст собирается аналитиком при оценке.

export interface AdmiraltyContext {
  /** Источник ранее проверялся (есть история сообщений). */
  sourcePreviouslyTested: boolean;
  /** Число подтверждённых сообщений источника за историю наблюдения. */
  confirmedReports: number;
  /** Число опровергнутых сообщений источника за историю наблюдения. */
  refutedReports: number;
  /** Число независимых источников другого типа, подтверждающих сообщение. */
  corroboratingSources: number;
  /** Возраст исходных данных в месяцах на момент оценки. */
  dataAgeMonths: number;
  /** Источник замечен в операциях дезинформации. */
  deceptionHistory: boolean;
  /** Сообщение — пересказ другого источника, а не первичное наблюдение. */
  isSecondHand: boolean;
  /** Информация получена прямым наблюдением/измерением, а не выводом. */
  directlyObserved: boolean;
}

export interface DowngradeRule {
  id: string;
  titleRu: string;
  conditionRu: string;
  actionRu: string;
}

export const DOWNGRADE_RULES: DowngradeRule[] = [
  {
    id: "DG-01",
    titleRu: "Непроверенный источник",
    conditionRu: "sourcePreviouslyTested = false",
    actionRu: "Надёжность фиксируется как F независимо от репутации канала: репутация без истории проверки грейдом не является.",
  },
  {
    id: "DG-02",
    titleRu: "Слабый послужной список",
    conditionRu: "refutedReports > confirmedReports при сумме ≥ 3",
    actionRu: "Надёжность понижается минимум до D; при доле опровергнутых > 2/3 — до E.",
  },
  {
    id: "DG-03",
    titleRu: "История дезинформации",
    conditionRu: "deceptionHistory = true",
    actionRu: "Надёжность не выше E для сообщений, выгодных предполагаемому оператору дезинформации.",
  },
  {
    id: "DG-04",
    titleRu: "Единственный источник",
    conditionRu: "corroboratingSources = 0 и сообщение влияет на вывод сводки",
    actionRu: "Достоверность не выше 3: единичное сообщение не может быть «подтверждённым» (1) или «вероятно истинным» (2) для ключевых выводов.",
  },
  {
    id: "DG-05",
    titleRu: "Устаревание данных",
    conditionRu: "dataAgeMonths > 12 для быстро меняющихся величин (запасы, дислокация, темпы производства)",
    actionRu: "Достоверность понижается на одну ступень за каждый год сверх первого, но не ниже 5.",
  },
  {
    id: "DG-06",
    titleRu: "Вторичность сообщения",
    conditionRu: "isSecondHand = true",
    actionRu: "Достоверность понижается на одну ступень: пересказ теряет детали и добавляет искажения посредника.",
  },
  {
    id: "DG-07",
    titleRu: "Непрямое наблюдение",
    conditionRu: "directlyObserved = false для количественных утверждений",
    actionRu: "Достоверность не выше 3, пока вывод не подкреплён измерением (снимок, статистика, документ).",
  },
  {
    id: "DG-08",
    titleRu: "Потолок для F-источника",
    conditionRu: "source = F после применения DG-01",
    actionRu: "Достоверность не выше 2 даже при внешнем правдоподобии: неизвестный источник не даёт «почти подтверждённых» сообщений.",
  },
];

const SOURCE_INDEX: Record<SourceReliability, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
};

function capSource(grade: AdmiraltyGrade, max: SourceReliability): AdmiraltyGrade {
  if (SOURCE_INDEX[grade.source] < SOURCE_INDEX[max]) {
    return { source: max, info: grade.info };
  }
  return grade;
}

function worsenInfo(grade: AdmiraltyGrade, steps: number, floor: InfoCredibility): AdmiraltyGrade {
  const next = Math.min(floor, grade.info + steps);
  return { source: grade.source, info: next as InfoCredibility };
}

function capInfo(grade: AdmiraltyGrade, max: InfoCredibility): AdmiraltyGrade {
  if (grade.info < max) {
    return { source: grade.source, info: max };
  }
  return grade;
}

export interface DowngradeResult {
  original: AdmiraltyGrade;
  adjusted: AdmiraltyGrade;
  appliedRuleIds: string[];
  confidenceBefore: number;
  confidenceAfter: number;
}

/** Применяет правила понижения к исходному грейду по контексту оценки. */
export function applyDowngrades(grade: AdmiraltyGrade, ctx: AdmiraltyContext): DowngradeResult {
  const applied: string[] = [];
  let g: AdmiraltyGrade = { source: grade.source, info: grade.info };

  if (!ctx.sourcePreviouslyTested) {
    g = { source: "F", info: g.info };
    applied.push("DG-01");
  }
  const total = ctx.confirmedReports + ctx.refutedReports;
  if (total >= 3 && ctx.refutedReports > ctx.confirmedReports) {
    g = capSource(g, ctx.refutedReports / total > 2 / 3 ? "E" : "D");
    applied.push("DG-02");
  }
  if (ctx.deceptionHistory) {
    g = capSource(g, "E");
    applied.push("DG-03");
  }
  if (ctx.corroboratingSources === 0) {
    g = capInfo(g, 3);
    applied.push("DG-04");
  }
  if (ctx.dataAgeMonths > 12) {
    const steps = Math.floor((ctx.dataAgeMonths - 12) / 12);
    if (steps > 0) {
      g = worsenInfo(g, steps, 5);
      applied.push("DG-05");
    }
  }
  if (ctx.isSecondHand) {
    g = worsenInfo(g, 1, 6);
    applied.push("DG-06");
  }
  if (!ctx.directlyObserved) {
    g = capInfo(g, 3);
    applied.push("DG-07");
  }
  if (g.source === "F") {
    const before = g.info;
    g = capInfo(g, 2);
    if (g.info !== before && !applied.includes("DG-08")) {
      applied.push("DG-08");
    }
  }

  return {
    original: grade,
    adjusted: g,
    appliedRuleIds: applied,
    confidenceBefore: confidenceFromGrade(grade),
    confidenceAfter: confidenceFromGrade(g),
  };
}

/** Числовой confidence (0..1) по грейду из матрицы. */
export function confidenceFromGrade(grade: AdmiraltyGrade): number {
  return ADMIRALTY_CONFIDENCE_MATRIX[grade.source][grade.info];
}

/** Код грейда в стандартной записи, например "B2". */
export function formatAdmiraltyCode(grade: AdmiraltyGrade): string {
  return `${grade.source}${grade.info}`;
}

/** Разбор кода вида "B2" (допустим разделитель: "B-2", "B 2"). */
export function parseAdmiraltyCode(code: string): AdmiraltyGrade | null {
  const m = /^([A-F])\s*-?\s*([1-6])$/.exec(code.trim().toUpperCase());
  if (!m) {
    return null;
  }
  return {
    source: m[1] as SourceReliability,
    info: Number(m[2]) as InfoCredibility,
  };
}

/** Полная оценка: грейд + confidence + правила обращения с сообщением. */
export function assessAdmiralty(
  grade: AdmiraltyGrade,
  ctx?: AdmiraltyContext,
): CombinedAssessment & { appliedRuleIds: string[] } {
  const downgrade = ctx ? applyDowngrades(grade, ctx) : null;
  const effective = downgrade ? downgrade.adjusted : grade;
  const found = COMBINED_ASSESSMENTS.find(
    (a) => a.source === effective.source && a.info === effective.info,
  );
  const base: CombinedAssessment = found ?? {
    code: formatAdmiraltyCode(effective),
    source: effective.source,
    info: effective.info,
    confidence: confidenceFromGrade(effective),
    confidenceLabelRu: "Не определена",
    handlingRu: "Требуется ручная оценка аналитика.",
  };
  return { ...base, appliedRuleIds: downgrade ? downgrade.appliedRuleIds : [] };
}

/** Грубая обратная оценка: ближайший к заданному confidence грейд в матрице. */
export function gradeFromConfidence(confidence: number): AdmiraltyGrade {
  let best: AdmiraltyGrade = { source: "F", info: 6 };
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const s of SOURCE_RELIABILITY_ORDER) {
    for (let i = 1 as InfoCredibility; i <= 6; i = (i + 1) as InfoCredibility) {
      const delta = Math.abs(ADMIRALTY_CONFIDENCE_MATRIX[s][i] - confidence);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = { source: s, info: i };
      }
    }
  }
  return best;
}
