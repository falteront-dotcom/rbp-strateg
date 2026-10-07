// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/dossier — страновые досье (БД знаний)
// GET ?iso=USA — досье страны; GET без параметров — все досье
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getDossier, getDossiersAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");

    if (iso) {
      const row = getDossier(iso.toUpperCase());
      if (!row) {
        return NextResponse.json({
          iso: iso.toUpperCase(),
          dossier: null,
          note: "Досье для этой страны ещё не собрано.",
        });
      }
      return NextResponse.json({
        iso: iso.toUpperCase(),
        dossier: { ...row, keyFactsRu: parseArray(row.keyFactsRu) },
      });
    }

    const rows = getDossiersAll();
    return NextResponse.json({
      count: rows.length,
      dossiers: rows.map((d) => ({ ...d, keyFactsRu: parseArray(d.keyFactsRu) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
