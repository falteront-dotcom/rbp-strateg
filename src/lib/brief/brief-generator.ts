// ─────────────────────────────────────────────────────────────────────────────
// Генератор разведывательных сводок
// BLUF → ключевые суждения (ICD 203) → источники (адмиралтейская шкала) →
// альтернативы → «что изменит оценку» → экспорт в Markdown
// РБП-Стратег 3.0 · Волна 5 «Мониторинг и аналитический продукт» (ROADMAP-3.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// Дисциплина формата:
// — BLUF (Bottom Line Up Front) пишется первым и читается отдельно:
//   потребитель, прочитавший только BLUF, получил главный вывод и его цену
//   (вероятность + уверенность);
// — каждое ключевое суждение несёт вероятностную формулировку шкалы
//   ICD 203 и уровень аналитической уверенности — по отдельности:
//   вероятность отвечает «насколько вероятно событие», уверенность —
//   «насколько можно верить самой оценке»;
// — утверждения опираются на сноски с адмиралтейскими грейдами источников:
//   читатель видит, где вывод держится на B2, а где — на D4;
// — раздел альтернатив обязателен: сводка без альтернативной гипотезы
//   не проходит валидатор ICD 203 и не должна уходить потребителю;
// — раздел «что изменит оценку» превращает сводку в живой документ:
//   перечисленные наблюдения — это задачи на сбор, а не риторика.

import {
  confidenceFromGrade,
  formatAdmiraltyCode,
  type AdmiraltyGrade,
} from "../intel/admiralty";
import {
  ANALYTIC_CONFIDENCE_PROFILES,
  probabilityToBand,
  validateBriefing,
  type AnalyticConfidence,
  type BriefingValidation,
} from "../intel/icd203";

/** Тип сводки. */
export type BriefKind = "country" | "coalition" | "scenario" | "iw";

/** Подписи типов сводок. */
export const BRIEF_KIND_LABELS_RU: Record<BriefKind, string> = {
  country: "Страновая сводка",
  coalition: "Коалиционная сводка",
  scenario: "Сценарная сводка",
  iw: "Сводка I&W (индикаторы и предупреждение)",
};

/** Источник сводки с адмиралтейским грейдом. */
export interface BriefSource {
  /** Короткое имя источника для сносок. */
  nameRu: string;
  /** Грейд по адмиралтейской шкале (надёжность × достоверность). */
  grade: AdmiraltyGrade;
  /** Что именно источник даёт сводке. */
  contributionRu: string;
}

/** Ключевое суждение сводки. */
export interface KeyJudgment {
  /** Формулировка суждения (без вероятностных слов — их добавит генератор). */
  statementRu: string;
  /** Оценка вероятности, % (0–100); полоса ICD 203 выводится из числа. */
  probabilityPct: number;
  /** Уровень аналитической уверенности. */
  confidence: AnalyticConfidence;
  /** Обоснование: факты и логика, на которых стоит суждение. */
  basisRu: string;
  /** Индексы источников в BriefInput.sources, поддерживающих суждение. */
  sourceIndexes: number[];
}

/** Альтернативная гипотеза / иное объяснение. */
export interface BriefAlternative {
  /** Формулировка альтернативы. */
  statementRu: string;
  /** Почему альтернативу нельзя отбросить. */
  whyPlausibleRu: string;
  /** Какое наблюдение различит основную оценку и альтернативу. */
  discriminatorRu: string;
}

/** Полный вход генератора сводки. */
export interface BriefInput {
  /** Тип сводки. */
  kind: BriefKind;
  /** Заголовок. */
  titleRu: string;
  /** Дата сводки (ISO, YYYY-MM-DD). */
  dateIso: string;
  /** Горизонт оценки, например «12 месяцев». */
  horizonRu: string;
  /** Главный вывод одной-двумя фразами (ядро BLUF). */
  blufRu: string;
  /** Вероятность главного вывода, %. */
  blufProbabilityPct: number;
  /** Уверенность в главном выводе. */
  blufConfidence: AnalyticConfidence;
  /** Ключевые суждения. */
  judgments: KeyJudgment[];
  /** Источники (сноски нумеруются по порядку этого списка). */
  sources: BriefSource[];
  /** Альтернативы (обязательны по ICD 203). */
  alternatives: BriefAlternative[];
  /** Наблюдения, которые изменят оценку. */
  whatWouldChange: string[];
  /** Пробелы в знаниях, честно заявленные потребителю. */
  gapsRu: string[];
}

/** Сгенерированная сводка: Markdown + результат валидации. */
export interface GeneratedBrief {
  /** Заголовок сводки. */
  titleRu: string;
  /** Тип сводки. */
  kind: BriefKind;
  /** Полный Markdown-текст. */
  markdown: string;
  /** Валидация ICD 203 по сгенерированному тексту. */
  validation: BriefingValidation;
}

/** Форматирование грейда источника для сноски: «B2 (уверенность 0.78)». */
export function formatSourceFootnote(source: BriefSource): string {
  const code = formatAdmiraltyCode(source.grade);
  const confidence = confidenceFromGrade(source.grade);
  return `${code} (уверенность ${confidence.toFixed(2)})`;
}

/** Ссылки-сноски суждения: [^1][^3]. */
function judgmentFootnotes(
  judgment: KeyJudgment,
  sources: BriefSource[],
): string {
  const refs: string[] = [];
  for (const index of judgment.sourceIndexes) {
    if (index >= 0 && index < sources.length) {
      refs.push(`[^${index + 1}]`);
    }
  }
  return refs.length > 0 ? ` ${refs.join("")}` : "";
}

/** Одна строка ключевого суждения в каноничной форме ICD 203. */
export function formatJudgmentLine(
  judgment: KeyJudgment,
  sources: BriefSource[],
): string {
  const band = probabilityToBand(judgment.probabilityPct);
  const conf = ANALYTIC_CONFIDENCE_PROFILES[judgment.confidence];
  const notes = judgmentFootnotes(judgment, sources);
  return (
    `**${judgment.statementRu}** — ${band.termRu} ` +
    `(${band.minPct}–${band.maxPct}%). ` +
    `Аналитическая уверенность: ${conf.labelRu.toLowerCase()}.${notes} ` +
    `${judgment.basisRu}`
  );
}

/** BLUF-блок сводки. */
export function formatBluf(input: BriefInput): string {
  const band = probabilityToBand(input.blufProbabilityPct);
  const conf = ANALYTIC_CONFIDENCE_PROFILES[input.blufConfidence];
  return [
    "## BLUF — главный вывод",
    "",
    `${input.blufRu}`,
    "",
    `Итоговая оценка: ${band.termRu} (${band.minPct}–${band.maxPct}%). ` +
      `Аналитическая уверенность: ${conf.labelRu.toLowerCase()}. ` +
      `Горизонт оценки: ${input.horizonRu}.`,
  ].join("\n");
}

/** Раздел источников со сносками и грейдами. */
export function formatSourcesSection(sources: BriefSource[]): string {
  const lines: string[] = [
    "## Источники и грейды (адмиралтейская шкала)",
    "",
  ];
  sources.forEach((source, index) => {
    lines.push(
      `[^${index + 1}]: ${source.nameRu} — грейд ` +
        `${formatSourceFootnote(source)}. ${source.contributionRu}`,
    );
  });
  return lines.join("\n");
}

/** Раздел альтернатив. */
export function formatAlternativesSection(
  alternatives: BriefAlternative[],
): string {
  const lines: string[] = [
    "## Альтернативы и иные объяснения",
    "",
  ];
  alternatives.forEach((alternative, index) => {
    lines.push(
      `${index + 1}. **Альтернатива: ${alternative.statementRu}** ` +
        `${alternative.whyPlausibleRu} ` +
        `Различающее наблюдение: ${alternative.discriminatorRu}`,
    );
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

/** Раздел «что изменит оценку». */
export function formatWhatWouldChangeSection(items: string[]): string {
  const lines: string[] = [
    "## Что изменит оценку",
    "",
    "Оценка будет пересмотрена при наблюдении любого из следующих событий:",
    "",
  ];
  for (const item of items) {
    lines.push(`- ${item}`);
  }
  return lines.join("\n");
}

/** Раздел пробелов. */
export function formatGapsSection(gaps: string[]): string {
  const lines: string[] = [
    "## Пробелы и ограничения",
    "",
  ];
  for (const gap of gaps) {
    lines.push(`- ${gap}`);
  }
  return lines.join("\n");
}

/**
 * Генерация полной сводки в Markdown с последующей валидацией ICD 203.
 * Генератор не «чинит» невалидный вход молча: результат валидации
 * возвращается потребителю вместе с текстом.
 */
export function generateBrief(input: BriefInput): GeneratedBrief {
  const kindLabel = BRIEF_KIND_LABELS_RU[input.kind];
  const judgmentLines = input.judgments.map(
    (judgment, index) =>
      `${index + 1}. ${formatJudgmentLine(judgment, input.sources)}`,
  );
  const markdown = [
    `# ${input.titleRu}`,
    "",
    `*${kindLabel} · РБП-Стратег 3.0 · ${input.dateIso} · ` +
      `горизонт: ${input.horizonRu}*`,
    "",
    formatBluf(input),
    "",
    "## Ключевые суждения",
    "",
    ...judgmentLines,
    "",
    formatSourcesSection(input.sources),
    "",
    formatAlternativesSection(input.alternatives),
    "",
    formatWhatWouldChangeSection(input.whatWouldChange),
    "",
    formatGapsSection(input.gapsRu),
    "",
  ].join("\n");
  const validation = validateBriefing(markdown, {
    hasAlternative: input.alternatives.length > 0,
    hasConfidenceStatement: true,
  });
  return {
    titleRu: input.titleRu,
    kind: input.kind,
    markdown: markdown,
    validation: validation,
  };
}

/** Проверка: сводка готова к потребителю (валидатор ICD 203 чист). */
export function briefReadyForConsumer(brief: GeneratedBrief): boolean {
  return brief.validation.valid;
}

/** Короткая текстовая версия сводки (BLUF + суждения без Markdown-разметки сносок). */
export function generatePlainTextBrief(input: BriefInput): string {
  const brief = generateBrief(input);
  return brief.markdown.replace(/\[\^\d+\]/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Дайджест мониторинга как сводка: алерты и дельты → вход генератора
// ─────────────────────────────────────────────────────────────────────────────
//
// Мост между мониторингом (Волна 5, monitor) и продуктом (brief):
// топ изменений и сработавшие алерты превращаются в черновик сводки,
// который аналитик правит, а не пишет с нуля. Автоматика не ставит
// вероятности за аналитика: черновик использует консервативные значения
// и низкую уверенность там, где суждение опирается только на дельты.

import type { Alert } from "../monitor/alerts";
import type { MetricDelta } from "../monitor/delta";

/** Параметры дайджест-сводки. */
export interface DigestOptions {
  /** Дата сводки (ISO). */
  dateIso: string;
  /** Период мониторинга, например «2024 → 2025». */
  periodRu: string;
  /** Сколько главных изменений включить в суждения. */
  maxJudgments: number;
}

/** Уровень алерта → консервативная вероятность черновика суждения. */
function alertProbabilityPct(alert: Alert): number {
  switch (alert.level) {
    case "critical":
      return 70;
    case "warning":
      return 60;
    case "watch":
      return 50;
    default:
      return 50;
  }
}

/** Уровень алерта → уверенность черновика (только дельты — не выше moderate). */
function alertConfidence(alert: Alert): AnalyticConfidence {
  return alert.level === "watch" ? "low" : "moderate";
}

/**
 * Черновик сводки из алертов мониторинга и топа дельт.
 * Возвращаемый BriefInput намеренно помечен как черновик в заголовке:
 * потребитель не должен получать машинный текст за аналитический продукт.
 */
export function buildDigestBriefInput(
  alerts: Alert[],
  topChanges: MetricDelta[],
  options: DigestOptions,
): BriefInput {
  const judgments: KeyJudgment[] = [];
  for (const alert of alerts.slice(0, options.maxJudgments)) {
    judgments.push({
      statementRu: alert.titleRu,
      probabilityPct: alertProbabilityPct(alert),
      confidence: alertConfidence(alert),
      basisRu: alert.explanationRu,
      sourceIndexes: [0, 1],
    });
  }
  if (judgments.length === 0 && topChanges.length > 0) {
    const first = topChanges[0];
    judgments.push({
      statementRu:
        `Крупнейшее изменение периода: ${first.nameRu} — ${first.summaryRu}`,
      probabilityPct: 55,
      confidence: "low",
      basisRu:
        "Суждение построено только на дельтах рядов мониторинга без дополнительной проверки по первоисточникам.",
      sourceIndexes: [0],
    });
  }
  const changeLines = topChanges
    .slice(0, 5)
    .map((d) => `${d.nameRu}: ${d.summaryRu}`)
    .join("; ");
  return {
    kind: "iw",
    titleRu: `Дайджест мониторинга изменений (ЧЕРНОВИК): ${options.periodRu}`,
    dateIso: options.dateIso,
    horizonRu: "до следующего цикла мониторинга",
    blufRu:
      `За период ${options.periodRu} мониторинг зафиксировал ` +
      `${alerts.length} срабатываний правил, из них критических — ` +
      `${alerts.filter((a) => a.level === "critical").length}. ` +
      `Крупнейшие изменения: ${changeLines}. ` +
      "Текст является машинным черновиком и требует аналитической редакции.",
    blufProbabilityPct: 60,
    blufConfidence: "low",
    judgments: judgments,
    sources: [
      {
        nameRu: "Ряды мониторинга РБП-Стратег (снапшоты стран)",
        grade: {
          source: "C",
          info: 3,
        },
        contributionRu:
          "Дельты бюджетов, численности, производства и выносливости, по которым построены алерты дайджеста.",
      },
      {
        nameRu: "Правила алертов мониторинга (каталог порогов)",
        grade: {
          source: "C",
          info: 3,
        },
        contributionRu:
          "Пороги и объяснения срабатываний; правила прозрачны и воспроизводимы по рядам.",
      },
    ],
    alternatives: [
      {
        statementRu:
          "Часть зафиксированных изменений является артефактом ревизий источников, а не изменением реального мира",
        whyPlausibleRu:
          "SIPRI и IISS пересматривают ряды задним числом; дельта между выпусками разных лет смешивает ревизию методики с динамикой стран.",
        discriminatorRu:
          "Сравнение дельты по двум соседним выпускам одного источника: исчезновение изменения в следующем выпуске укажет на ревизию.",
      },
    ],
    whatWouldChange: [
      "Подтверждение любого критического алерта вторым независимым источником — перевод пункта из черновика в полноценную сводку.",
      "Опровержение дельты следующим выпуском источника — снятие пункта и пометка ряда как ревизионного.",
    ],
    gapsRu: [
      "Дайджест не проверяет первоисточники: он агрегирует дельты и алерты, а не факты.",
      "Вероятности и уверенность в черновике — консервативные заглушки до аналитической редакции.",
    ],
  };
}
