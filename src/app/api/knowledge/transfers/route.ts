// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/transfers — поставки вооружений (SIPRI-уровень оценок)
// GET ?iso=USA — сделки с участием страны; ?top=1 — крупнейшие экспортёры
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getTransfersInvolving,
  getTransfersAll,
  getTopExporters,
} from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const top = searchParams.get("top") === "1";

    if (top) {
      const rows = getTopExporters();
      return NextResponse.json({ count: rows.length, exporters: rows });
    }

    const rows = iso ? getTransfersInvolving(iso.toUpperCase()) : getTransfersAll();
    return NextResponse.json({ count: rows.length, transfers: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
