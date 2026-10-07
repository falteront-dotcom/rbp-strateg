// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/treaties — договоры и союзы в сфере безопасности
// GET ?iso=USA — договоры с участием страны; ?type=defense — фильтр по типу
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getTreatiesFor, getTreatiesAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const type = searchParams.get("type");

    let rows = iso ? getTreatiesFor(iso.toUpperCase()) : getTreatiesAll();
    if (type) {
      rows = rows.filter((r) => r.type === type);
    }

    return NextResponse.json({
      count: rows.length,
      treaties: rows.map((t) => ({ ...t, membersIso: parseArray(t.membersIso) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
