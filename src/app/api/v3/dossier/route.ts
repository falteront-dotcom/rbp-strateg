// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/dossier?iso=XXX — экспорт досье страны в Markdown.
//
// Шаг 4 дорожной карты (пузырь 2026-11-13): мост к продукту без цены
// публичного API. Досье собирается из тех же данных, что карточка страны
// (фасад v3), и несёт провенанс: грейд каждого компонента, интервалы,
// устойчивость ранга, методологию и ограничения. PDF — печатью страницы
// досье браузером; нативный PDF-рендер не добавлялся (цена зависимости).
//
// Шаг «мост к продукту»: Markdown строит чистая buildDossierMarkdown
// (src/lib/dossier.ts) — тот же построитель, что и в /api/public/v1/dossier.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getBP3Detail, getBP3Ranking } from "@/lib/v3-facade";
import { buildDossierMarkdown } from "@/lib/dossier";

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

  const ranking = getBP3Ranking();
  const rank = ranking.findIndex((r) => r.iso === iso) + 1;
  const date = new Date().toISOString().slice(0, 10);
  const markdown = buildDossierMarkdown(detail, rank, ranking.length, date);

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="dossier-${detail.row.iso}-${date}.md"`,
      "cache-control": "no-store",
    },
  });
}
