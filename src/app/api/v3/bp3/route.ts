// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/bp3 — модель боевого потенциала 3.0 (фасад: lib/v3-facade)
// GET без параметров → рейтинг всех стран; ?iso=XXX → деталь страны или 404
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getBP3Detail, getBP3Ranking } from "@/lib/v3-facade";

/** GET /api/v3/bp3 — ranking; GET /api/v3/bp3?iso=USA — detail. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    if (iso) {
      const detail = getBP3Detail(iso);
      if (!detail) {
        return NextResponse.json(
          { error: "Country not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(detail);
    }
    return NextResponse.json(getBP3Ranking());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
