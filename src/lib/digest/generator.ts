// ─────────────────────────────────────────────────────────────────────────────
// Еженедельный аналитический дайджест (путь B: контент без инфраструктуры).
//
// Чистые функции без обращений к БД и сети: вход — уже собранные данные
// фасада v3 (getBP3Ranking, getAlertsFeed), выход — Markdown или структура
// секций для страницы /v3/digest. Одни и те же выборки (selectDigestData)
// кормят и Markdown-файл (src/scripts/generate-digest.ts), и страницу —
// представления не расходятся.
//
// Все числа берутся из переданных данных, ничего не выдумывается.
// ─────────────────────────────────────────────────────────────────────────────

import type { FacadeBP3Row } from "../v3-facade";
import type { Alert } from "../monitor/alerts";

/** Дефолты объёма дайджеста: топ рейтинга, пары, алерты. */
export const DIGEST_DEFAULTS = {
  topCount: 10,
  pairsCount: 3,
  alertsCount: 10,
} as const;

/** Вход генератора: собранные данные + дата. */
export interface DigestInput {
  /** Дата генерации (ISO, YYYY-MM-DD) — попадает в заголовок и футер. */
  dateIso: string;
  /** Полный рейтинг БП 3.0 из getBP3Ranking(). */
  ranking: FacadeBP3Row[];
  /** Лента мониторинга из getAlertsFeed() (уже отсортирована). */
  alerts: Alert[];
}

/** Соседняя пара рейтинга, чей порядок статистически неотличим. */
export interface DigestPair {
  /** Позиция верхней страны пары по медиане (1-based). */
  pos: number;
  upper: FacadeBP3Row;
  lower: FacadeBP3Row;
  /** P(верхняя страна выше соседа) из rank-stability, 0–1. */
  pAboveNext: number;
}

/** Структурированные секции дайджеста: общий вход для MD и страницы. */
export interface DigestData {
  dateIso: string;
  top: FacadeBP3Row[];
  totalCountries: number;
  pairs: DigestPair[];
  alerts: Alert[];
  alertsTotal: number;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Отбор секций дайджеста из сырых данных фасада. Чистая. */
export function selectDigestData(input: DigestInput): DigestData {
  const { ranking, alerts } = input;
  const top = ranking.slice(0, DIGEST_DEFAULTS.topCount);

  // Пары с наименьшим pAboveNext: порядок по медиане ближе всего к броску
  // монеты. У последней строки рейтинга pAboveNext === null — исключается.
  const pairs: DigestPair[] = ranking
    .map((row, i) => {
      const next = ranking[i + 1];
      const p = row.rankStability.pAboveNext;
      if (next === undefined || p === null) return null;
      return { pos: i + 1, upper: row, lower: next, pAboveNext: p };
    })
    .filter((p): p is DigestPair => p !== null)
    .sort((a, b) => a.pAboveNext - b.pAboveNext)
    .slice(0, DIGEST_DEFAULTS.pairsCount);

  return {
    dateIso: input.dateIso,
    top,
    totalCountries: ranking.length,
    pairs,
    alerts: alerts.slice(0, DIGEST_DEFAULTS.alertsCount),
    alertsTotal: alerts.length,
  };
}

/** Сборка Markdown-дайджеста. Чистая: без БД, сети и текущего времени. */
export function buildDigest(input: DigestInput): string {
  const d = selectDigestData(input);
  const lines: string[] = [
    `# Дайджест РБП-Стратег · ${d.dateIso}`,
    "",
    "Еженедельная аналитическая сводка по модели боевого потенциала 3.0:",
    "рейтинг с интервалами неопределённости, статистически неотличимые пары,",
    "лента мониторинга.",
    "",
    `Сгенерировано: ${d.dateIso} · Модель: БП 3.0 · стран в рейтинге: ${d.totalCountries}`,
    "",
  ];

  // ── Топ рейтинга ──
  lines.push(`## Топ-${d.top.length} рейтинга БП 3.0`, "");
  if (d.top.length === 0) {
    lines.push("Рейтинг пуст: данных нет.");
  } else {
    lines.push(
      "| # | Страна | БП 3.0 | Интервал P10–P90 | Ранг P10–P90 | P(выше соседа) |",
      "|---|---|---|---|---|---|",
      ...d.top.map((row, i) => {
        const rs = row.rankStability;
        return `| ${i + 1} | ${row.name} | ${fmt(row.total)} | ${fmt(row.p10)}–${fmt(row.p90)} | ${rs.rankP10}–${rs.rankP90} | ${rs.pAboveNext === null ? "—" : fmt(rs.pAboveNext * 100) + "%"} |`;
      }),
    );
    lines.push(
      "",
      "Интервал P10–P90 учитывает весовую неопределённость: веса экспертные,",
      "тянутся из Dirichlet(κ=100) на каждой итерации Монте-Карло.",
      "Ранг — не точка: колонка «Ранг P10–P90» показывает ожидаемый разбег места.",
    );
  }
  lines.push("");

  // ── Неопределённые пары ──
  lines.push("## Самые неопределённые соседние пары", "");
  if (d.pairs.length === 0) {
    lines.push(
      "Пары не определены: rank-stability не рассчитан (нет итераций Монте-Карло).",
    );
  } else {
    lines.push(
      "Соседи по рейтингу, чей порядок статистически неотличим —",
      "P(верхняя страна выше соседа) ближе всего к 50%:",
      "",
      "| Место | Страна | БП 3.0 | Сосед снизу | БП 3.0 | P(выше соседа) |",
      "|---|---|---|---|---|---|",
      ...d.pairs.map(
        (p) =>
          `| ${p.pos} | ${p.upper.name} | ${fmt(p.upper.total)} | ${p.lower.name} | ${fmt(p.lower.total)} | ${fmt(p.pAboveNext * 100)}% |`,
      ),
    );
  }
  lines.push("");

  // ── Лента мониторинга ──
  lines.push("## Лента мониторинга", "");
  if (d.alerts.length === 0) {
    lines.push(
      "Алертов нет: на текущих рядах мониторинга не сработало ни одно правило.",
    );
  } else {
    lines.push(
      `Сработавших алертов: ${d.alertsTotal}. Ниже — первые ${d.alerts.length}`,
      "по уровню и величине изменения (каждый алерт — гипотеза для проверки,",
      "не свершившийся факт):",
      "",
      ...d.alerts.flatMap((a) => [
        // titleRu алерта уже начинается с названия страны — не дублируем
        `- **[${levelLabelRu(a.level)}] ${a.titleRu}**`,
        `  ${a.explanationRu}`,
        `  Проверить: ${a.followUpRu}`,
      ]),
    );
  }
  lines.push("");

  // ── Методология ──
  lines.push(
    "## Методология и ограничения",
    "",
    "- Веса — экспертные (elicitation), не калиброваны по исходам конфликтов;",
    "  происхождение и процедура пересмотра: docs/weights-elicitation.md.",
    "- Интервалы P10–P90 и устойчивость ранга — Монте-Карло (4000 итераций),",
    "  веса тянутся из Dirichlet(κ=100) на каждой итерации.",
    "- Свежесть прод-данных ограничена коммитными сидами; живой pipeline",
    "  проверяется еженедельным smoke-тестом (pipeline-refresh.yml).",
    "",
    "Полная методология: /v3/methodology · История дайджестов: docs/digests/",
  );

  return lines.join("\n") + "\n";
}

/** Подпись уровня алерта (дублируется, чтобы не тянуть runtime-модуль). */
function levelLabelRu(level: Alert["level"]): string {
  switch (level) {
    case "critical":
      return "Критический";
    case "warning":
      return "Предупреждение";
    case "watch":
      return "Наблюдение";
  }
}
