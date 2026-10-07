// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/industry — компании оборонно-промышленного комплекса
// GET ?iso=USA — компании страны; ?top=1 — сортировка по выручке
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getCompaniesByIso, getCompaniesAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");

    const rows = iso ? getCompaniesByIso(iso.toUpperCase()) : getCompaniesAll();
    return NextResponse.json({
      count: rows.length,
      companies: rows.map((c) => ({ ...c, productsRu: parseArray(c.productsRu) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
