// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/doctrines — доктринальные карточки государств
// GET ?iso=USA — карточка страны; GET без параметров — все карточки
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getDoctrine, getDoctrinesAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");

    if (iso) {
      const row = getDoctrine(iso.toUpperCase());
      if (!row) {
        return NextResponse.json({
          iso: iso.toUpperCase(),
          doctrine: null,
          note: "Доктринальная карточка для этой страны ещё не собрана.",
        });
      }
      return NextResponse.json({
        iso: iso.toUpperCase(),
        doctrine: { ...row, principlesRu: parseArray(row.principlesRu) },
      });
    }

    const rows = getDoctrinesAll();
    return NextResponse.json({
      count: rows.length,
      doctrines: rows.map((d) => ({ ...d, principlesRu: parseArray(d.principlesRu) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
