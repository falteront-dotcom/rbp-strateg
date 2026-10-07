// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/equipment — модельный состав вооружений (БД знаний)
// GET ?iso=USA — парк моделей страны; GET ?summary=1 — сводка по странам
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getEquipmentByIso,
  getEquipmentAll,
  getEquipmentSummary,
} from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const summary = searchParams.get("summary") === "1";

    if (summary) {
      const rows = getEquipmentSummary();
      return NextResponse.json({ count: rows.length, summary: rows });
    }

    if (iso) {
      const rows = getEquipmentByIso(iso.toUpperCase());
      return NextResponse.json({
        iso: iso.toUpperCase(),
        count: rows.length,
        equipment: rows,
        note:
          rows.length === 0
            ? "Модельный состав для этой страны отсутствует в базе (см. суммарные показатели в /api/countries)."
            : undefined,
      });
    }

    const rows = getEquipmentAll();
    return NextResponse.json({ count: rows.length, equipment: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
