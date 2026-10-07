// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/navy — корабельный состав флотов (БД знаний)
// GET ?iso=USA — флот страны; GET без параметров — все классы
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getNavyByIso, getNavyAll } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const rows = iso ? getNavyByIso(iso.toUpperCase()) : getNavyAll();
    return NextResponse.json({ count: rows.length, ships: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
