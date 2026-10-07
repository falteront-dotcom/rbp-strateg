// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/missiles — ракетные арсеналы государств (БД знаний)
// GET ?iso=RUS — ракеты страны; GET без параметров — все системы
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getMissilesByIso, getMissilesAll } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const rows = iso ? getMissilesByIso(iso.toUpperCase()) : getMissilesAll();
    return NextResponse.json({ count: rows.length, missiles: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
