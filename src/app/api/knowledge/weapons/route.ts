// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/weapons — детальные ТТХ образцов вооружений (БД знаний)
// GET ?category=tank — по категории; ?origin=USA — по стране-производителю
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import {
  getWeaponsByCategory,
  getWeaponsByOrigin,
  getWeaponsAll,
} from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const origin = searchParams.get("origin");

    let rows;
    if (category) rows = getWeaponsByCategory(category);
    else if (origin) rows = getWeaponsByOrigin(origin.toUpperCase());
    else rows = getWeaponsAll();

    return NextResponse.json({ count: rows.length, weapons: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
