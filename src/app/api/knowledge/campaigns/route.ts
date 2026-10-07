// ─────────────────────────────────────────────────────────────────────────────
// API /api/knowledge/campaigns — военные кампании и операции (БД знаний)
// GET ?iso=RUS — кампании с участием страны; GET — все кампании
// РБП-Стратег · knowledge pack
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getCampaignsInvolving, getCampaignsAll, parseArray } from "@/db/queries-knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const iso = searchParams.get("iso");
    const rows = iso ? getCampaignsInvolving(iso.toUpperCase()) : getCampaignsAll();
    return NextResponse.json({
      count: rows.length,
      campaigns: rows.map((c) => ({ ...c, isoCodes: parseArray(c.isoCodes) })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
