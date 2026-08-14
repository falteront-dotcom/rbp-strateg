// ─────────────────────────────────────────────────────────────────────────────
// API /api/analytics — Analytics data endpoints
// GET ?type=ranking|distribution|anomalies|correlation|trend&iso=XXX
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import {
  getBPRanking,
  getBPDistribution,
  getAnomalies,
  getCorrelationMatrix,
  getTrendData,
} from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "ranking";
    const iso = searchParams.get("iso") ?? undefined;

    // Read every country through the shared mapper so snake_case SQLite columns
    // (e.g. bp_total, iso_code) become the camelCase shape the analytics library
    // and the public API expect. `region` is derived, not read from SQL.
    let countries;
    {
      const db = openReadonlyDatabase();
      try {
        const rows = db.prepare("SELECT * FROM countries").all() as RawCountryRow[];
        countries = mapCountryRows(rows).map((c, i) => ({ ...c, bpRank: i + 1 }));
      } finally {
        db.close();
      }
    }

    let data: unknown;

    switch (type) {
      case "ranking": {
        data = getBPRanking(countries);
        break;
      }
      case "distribution": {
        data = getBPDistribution(countries);
        break;
      }
      case "anomalies": {
        data = getAnomalies(countries);
        break;
      }
      case "correlation": {
        data = getCorrelationMatrix(countries);
        break;
      }
      case "trend": {
        if (!iso) {
          return NextResponse.json({ error: "Missing iso parameter for trend" }, { status: 400 });
        }
        data = getTrendData(iso, countries);
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    return NextResponse.json({ type, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
