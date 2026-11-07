// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/iw — каталог Indicators & Warnings по категориям (intel)
// GET → { totalIndicators, categories: [{ id, code, nameRu, indicators }] }
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getIWBoard } from "@/lib/v3-facade";

/** GET /api/v3/iw — доска каталога I&W, сгруппированная по категориям. */
export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(getIWBoard());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
