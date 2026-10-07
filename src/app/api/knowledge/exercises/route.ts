// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/exercises — военные учения и миротворческие миссии
// GET ?iso=USA — учения с участием страны; ?pk=1 — миротворческие миссии
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getExercisesInvolving,
  getExercisesAll,
  getPeacekeepingAll,
  parseArray,
} from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const pk = searchParams.get("pk") === "1";

    if (pk) {
      const rows = getPeacekeepingAll();
      return NextResponse.json({ count: rows.length, peacekeeping: rows });
    }

    const rows = iso ? getExercisesInvolving(iso.toUpperCase()) : getExercisesAll();
    return NextResponse.json({
      count: rows.length,
      exercises: rows.map((e) => ({ ...e, participantsIso: parseArray(e.participantsIso) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
