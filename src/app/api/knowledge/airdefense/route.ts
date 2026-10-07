// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/airdefense — системы ПВО/ПРО (БД знаний)
// GET ?iso=RUS — ПВО страны; GET без параметров — все системы
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getAirDefenseByIso, getAirDefenseAll } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const rows = iso ? getAirDefenseByIso(iso.toUpperCase()) : getAirDefenseAll();
    return NextResponse.json({ count: rows.length, systems: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
