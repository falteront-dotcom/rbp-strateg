// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/v1/dossier?iso=XXX — публичное Markdown-досье страны.
// Тот же построитель buildDossierMarkdown, что у /api/v3/dossier (контент
// идентичен); отличие публичного роута — rate-limit. Дата генерации «сегодня»
// и cache-control: no-store — досье не кэшируется прокси. Контракт: docs/API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getBP3Detail, getBP3Ranking } from "@/lib/v3-facade";
import { buildDossierMarkdown } from "@/lib/dossier";
import { clientIp, rateLimitResponse } from "../guard";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const limited = rateLimitResponse(clientIp(request));
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const iso = (searchParams.get("iso") ?? "").trim().toUpperCase();
  if (!iso) {
    return NextResponse.json(
      { error: "iso parameter required" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const detail = getBP3Detail(iso);
  if (!detail) {
    return NextResponse.json(
      { error: "Country not found" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
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
