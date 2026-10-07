// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/conflicts — история вооружённых конфликтов 1945–2025
// GET ?iso=USA — конфликты с участием страны; GET ?id=<slug> — один конфликт
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getConflictsInvolving,
  getConflictsAll,
  getConflictById,
  parseArray,
} from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

function decorate(row: ReturnType<typeof getConflictsAll>[number]) {
  return {
    ...row,
    belligerents: parseArray(row.belligerents),
    isoCodes: parseArray(row.isoCodes),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (id) {
      const row = getConflictById(id);
      if (!row) {
        return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
      }
      return NextResponse.json({ conflict: decorate(row) });
    }

    let rows = iso ? getConflictsInvolving(iso.toUpperCase()) : getConflictsAll();
    if (type) {
      rows = rows.filter((r) => r.type === type);
    }

    return NextResponse.json({
      count: rows.length,
      conflicts: rows.map(decorate),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
