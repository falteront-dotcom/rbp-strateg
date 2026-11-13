// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/v1/countries — публичный список стран с БП (модель 2.0,
// платформенная карта). Читает ту же БД тем же маппером, что /api/countries
// (src/db/country-mapper), добавляет bpRank; отличие публичного роута —
// envelope с apiVersion/count, кэш 5 минут и rate-limit. Контракт: docs/API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import { clientIp, rateLimitResponse, PUBLIC_CACHE_CONTROL } from "../guard";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const limited = rateLimitResponse(clientIp(request));
  if (limited) return limited;

  try {
    const db = openReadonlyDatabase();
    try {
      const rows = db
        .prepare("SELECT * FROM countries ORDER BY bp_total DESC")
        .all() as RawCountryRow[];

      const countries = mapCountryRows(rows).map((country, index) => ({
        ...country,
        bpRank: index + 1,
      }));

      return NextResponse.json(
        { apiVersion: "v1", count: countries.length, countries },
        { headers: { "cache-control": PUBLIC_CACHE_CONTROL } },
      );
    } finally {
      db.close();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
