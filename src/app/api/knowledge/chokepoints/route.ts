// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/chokepoints — узкие места и коридоры мировой логистики
// GET без параметров — все точки, отсортированы по стратегической значимости
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getChokepointsAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = getChokepointsAll();
    return NextResponse.json({
      count: rows.length,
      chokepoints: rows.map((c) => ({ ...c, controlledByIso: parseArray(c.controlledByIso) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
