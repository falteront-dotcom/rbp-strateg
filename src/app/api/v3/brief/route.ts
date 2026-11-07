// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/brief — страновая разведсводка BLUF (plain text, ICD 203)
// GET ?iso=XXX → { iso, text }; страна не найдена → 404
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getBP3Detail } from "@/lib/v3-facade";

/** GET /api/v3/brief?iso=USA — текстовая сводка по стране. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    if (!iso) {
      return NextResponse.json(
        { error: "Missing iso parameter" },
        { status: 400 },
      );
    }
    const detail = getBP3Detail(iso);
    if (!detail) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 },
      );
    }
    if (detail.briefText === null) {
      return NextResponse.json(
        { error: "Brief generation failed for this country" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      iso: detail.row.iso,
      text: detail.briefText,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
