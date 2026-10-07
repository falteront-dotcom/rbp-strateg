// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/battles — исторические сражения (БД знаний)
// GET ?iso=RUS — сражения с участием страны; GET — все сражения
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getBattlesInvolving, getBattlesAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const rows = iso ? getBattlesInvolving(iso.toUpperCase()) : getBattlesAll();
    return NextResponse.json({
      count: rows.length,
      battles: rows.map((b) => ({ ...b, isoCodes: parseArray(b.isoCodes) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
