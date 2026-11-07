// ─────────────────────────────────────────────────────────────────────────────
// API /api/v3/alerts — лента алертов мониторинга (monitor: дельты + пороги)
// GET → Alert[] по всем странам рядов 2023–2025, сортировка уровень ↓
// РБП-Стратег 3.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getAlertsFeed } from "@/lib/v3-facade";

/** GET /api/v3/alerts — все сработавшие правила мониторинга. */
export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(getAlertsFeed());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
