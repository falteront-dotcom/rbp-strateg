// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/order-of-battle — оргструктура ВС (БД знаний)
// GET ?iso=USA — формирования страны; GET — все
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getOrderByIso, getOrderAll } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const rows = iso ? getOrderByIso(iso.toUpperCase()) : getOrderAll();
    return NextResponse.json({ count: rows.length, formations: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
