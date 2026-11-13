// ─────────────────────────────────────────────────────────────────────────────
// Построитель Markdown-досье страны (модель БП 3.0).
//
// Вынесен из роута /api/v3/dossier, чтобы публичное API v1 и v3-экспорт
// собирали документ одной чистой функцией без расхождения формата.
// Контроль целостности: e2e/methodology-dossier.spec.ts (v3) и
// e2e/public-api.spec.ts (v1) — оба формата обязаны совпадать посимвольно.
// ─────────────────────────────────────────────────────────────────────────────

import type { FacadeBP3Row } from "@/lib/v3-facade";

/** Минимальная часть getBP3Detail, нужная досье. */
export interface DossierSource {
  row: FacadeBP3Row;
  tornado: { label: string; low: number; high: number; swing: number }[];
  grades: Record<string, string>;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Собрать Markdown-досье: итог с интервалами, ранг и его устойчивость,
 * компоненты с провенансом, торнадо-чувствительность, методология.
 *
 * @param detail  результат getBP3Detail(iso) (уже проверен на null роутом)
 * @param rank    место страны в рейтинге (1-индексация)
 * @param cohortSize размер когорты рейтинга
 * @param date    дата генерации (YYYY-MM-DD) — определяет роут
 */
export function buildDossierMarkdown(
  detail: DossierSource,
  rank: number,
  cohortSize: number,
  date: string,
): string {
  const { row, tornado, grades } = detail;
  const rs = row.rankStability;

  const lines = [
    `# Досье: ${row.name} (${row.iso})`,
    "",
    `Сгенерировано: ${date} · Модель: БП 3.0 · РБП-Стратег 2.0`,
    "",
    "## Итог",
    "",
    `- **БП 3.0:** ${fmt(row.total)} (P10–P90: ${fmt(row.p10)}–${fmt(row.p90)})`,
    `- **Ранг:** ${rank} из ${cohortSize} · ранг P10–P90: ${rs.rankP10}–${rs.rankP90}`,
    `- **P(выше следующего соседа):** ${rs.pAboveNext === null ? "— (последняя строка)" : fmt(rs.pAboveNext * 100, 1) + "%"}`,
    `- **Δ к модели 2.0:** ${row.deltaV2 > 0 ? "+" : ""}${fmt(row.deltaV2)}`,
    `- **Данные U/P:** ${row.hasUP ? "полный профиль (БПЛА + боеприпасы)" : "нулевая базовая линия — оценка по 8 компонентам, не полностью сопоставима"}`,
    "",
    "Интервалы и ранг учитывают весовую неопределённость: веса экспертные,",
    "тянутся из Dirichlet(κ=100) на каждой итерации Монте-Карло (4000 итераций).",
    "",
    "## Компоненты",
    "",
    "| Компонент | Балл (0–100) | Вес | Вклад | Грейд входов |",
    "|---|---|---|---|---|",
    ...row.components.map(
      (c) =>
        `| ${c.label} | ${fmt(c.score)} | ${c.weight.toFixed(2)} | ${fmt(c.score * c.weight)} | ${grades[c.key] ?? "—"} |`,
    ),
    "",
    "Грейды провенанса: A — официальная отчётность, B — признанные базы",
    "(IISS/SIPRI), C–E — оценки и экспертные шкалы (убывание надёжности).",
    "",
    "## Чувствительность (торнадо, OAT ±20%)",
    "",
    "| Компонент | Итог при −20% | Итог при +20% | Размах |",
    "|---|---|---|---|",
    ...tornado.map(
      (t) => `| ${t.label} | ${fmt(t.low)} | ${fmt(t.high)} | ${fmt(t.swing)} |`,
    ),
    "",
    "## Методология и ограничения",
    "",
    "- Веса — экспертные (elicitation), не калиброваны по исходам конфликтов;",
    "  происхождение и процедура пересмотра: docs/weights-elicitation.md.",
    "- Источники данных: SIPRI, GFP 2025 (снапшот), World Bank, IISS Military",
    "  Balance; провенанс каждого входа хранится в модели.",
    "- GFP-ранги используются как диагностика (Spearman), не калибровка:",
    "  подгонка к чужому композиту циркулярна.",
    "- Свежесть прод-данных ограничена коммитными сидами (Render free);",
    "  живой pipeline проверяется еженедельно (pipeline-refresh.yml).",
    "",
    `Полная методология: /v3/methodology · Карточка: /v3/country/${row.iso}`,
  ];

  return lines.join("\n") + "\n";
}
