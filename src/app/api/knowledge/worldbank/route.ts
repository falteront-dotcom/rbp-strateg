// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/worldbank — REAL authoritative data (World Bank Open Data)
// GET ?iso=USA — показатели страны; GET — все страны
// Источник: api.worldbank.org, индикаторы MS.MIL.* (см. WORLD_BANK_INDICATORS)
// РБП-Стратег · real-data layer
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  WORLD_BANK_DATA,
  WORLD_BANK_INDEX,
  WORLD_BANK_SOURCE,
  WORLD_BANK_INDICATORS,
} from "@/lib/data/world-bank.generated";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");

    const meta = {
      source: WORLD_BANK_SOURCE,
      indicators: WORLD_BANK_INDICATORS,
      kind: "real",
    };

    if (iso) {
      const row = WORLD_BANK_INDEX[iso.toUpperCase()];
      return NextResponse.json({
        ...meta,
        iso: iso.toUpperCase(),
        data: row ?? null,
        note: row ? undefined : "Для этой страны нет показателей World Bank.",
      });
    }

    return NextResponse.json({
      ...meta,
      count: WORLD_BANK_DATA.length,
      data: WORLD_BANK_DATA,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
