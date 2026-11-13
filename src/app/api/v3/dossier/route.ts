// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/dossier?iso=XXX — экспорт досье страны в Markdown.
//
// Шаг 4 дорожной карты (пузырь 2026-11-13): мост к продукту без цены
// публичного API. Досье собирается из тех же данных, что карточка страны
// (фасад v3), и несёт провенанс: грейд каждого компонента, интервалы,
// устойчивость ранга, методологию и ограничения. PDF — печатью страницы
// досье браузером; нативный PDF-рендер не добавлялся (цена зависимости).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getBP3Detail, getBP3Ranking } from "@/lib/v3-facade";

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const iso = (searchParams.get("iso") ?? "").trim().toUpperCase();
  if (!iso) {
    return NextResponse.json({ error: "iso parameter required" }, { status: 400 });
  }
  const detail = getBP3Detail(iso);
  if (!detail) {
    return NextResponse.json({ error: "Country not found" }, { status: 404 });
  }

  const { row, tornado, grades } = detail;
  const ranking = getBP3Ranking();
  const rank = ranking.findIndex((r) => r.iso === iso) + 1;
  const rs = row.rankStability;
  const date = new Date().toISOString().slice(0, 10);

  const lines = [
    `# Досье: ${row.name} (${row.iso})`,
    "",
    `Сгенерировано: ${date} · Модель: БП 3.0 · РБП-Стратег 2.0`,
    "",
    "## Итог",
    "",
    `- **БП 3.0:** ${fmt(row.total)} (P10–P90: ${fmt(row.p10)}–${fmt(row.p90)})`,
    `- **Ранг:** ${rank} из ${ranking.length} · ранг P10–P90: ${rs.rankP10}–${rs.rankP90}`,
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

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="dossier-${row.iso}-${date}.md"`,
      "cache-control": "no-store",
    },
  });
}
