// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/v1/ranking — публичный рейтинг модели БП 3.0.
// Источник — getBP3Ranking из @/lib/v3-facade (кэш на процесс): медиана,
// интервалы P10–P90 (весовая неопределённость Dirichlet κ=100) и
// rankStability каждой страны. Контракт: docs/API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getBP3Ranking } from "@/lib/v3-facade";
import { clientIp, rateLimitResponse, PUBLIC_CACHE_CONTROL } from "../guard";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const limited = rateLimitResponse(clientIp(request));
  if (limited) return limited;

  try {
    const rows = getBP3Ranking();
    const ranking = rows.map((row, index) => ({
      iso: row.iso,
      name: row.name,
      rank: index + 1,
      total: row.total,
      p10: row.p10,
      p90: row.p90,
      deltaV2: row.deltaV2,
      hasUP: row.hasUP,
      components: row.components,
      rankStability: row.rankStability,
    }));

    return NextResponse.json(
      { apiVersion: "v1", model: "bp3", count: ranking.length, ranking },
      { headers: { "cache-control": PUBLIC_CACHE_CONTROL } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
