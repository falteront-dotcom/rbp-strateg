// ─────────────────────────────────────────────────────────────────────────────
// API /api/analytics — Analytics data endpoints
// GET ?type=ranking|distribution|anomalies|correlation|trend&iso=XXX
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
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

    // Dynamic import for better-sqlite3
    const Database = (await import("better-sqlite3")).default;
    const db = new Database("sqlite.db", { readonly: true });
    const allRows = db.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    db.close();

    // Convert to analytics-compatible format
    const countries = allRows.map((row) => ({
      isoCode: row.isoCode as string,
      name: row.name as string,
      nameRu: row.nameRu as string,
      side: row.side as string,
      bpTotal: (row.bpTotal as number) ?? 0,
      bpWeapon: (row.bpWeapon as number) ?? 0,
      bpManpower: (row.bpManpower as number) ?? 0,
      bpLogistics: (row.bpLogistics as number) ?? 0,
      bpC2: (row.bpC2 as number) ?? 0,
      bpEconomy: (row.bpEconomy as number) ?? 0,
      bpDoctrine: (row.bpDoctrine as number) ?? 0,
      bpReadiness: (row.bpReadiness as number) ?? 0,
      bpTerrain: (row.bpTerrain as number) ?? 0,
      gdpPppBn: (row.gdpPppBn as number) ?? 0,
      militaryBudgetBn: (row.militaryBudgetBn as number) ?? 0,
      defensePctGdp: (row.defensePctGdp as number) ?? 0,
      totalTanks: (row.totalTanks as number) ?? 0,
      totalAircraft: (row.totalAircraft as number) ?? 0,
      totalNavy: (row.totalNavy as number) ?? 0,
      activePersonnel: (row.activePersonnel as number) ?? 0,
      oilProductionKbd: (row.oilProductionKbd as number) ?? 0,
      populationM: (row.populationM as number) ?? 0,
      areaKm2: (row.areaKm2 as number) ?? 0,
    }));

    let data: unknown;

    switch (type) {
      case "ranking": {
        data = getBPRanking(countries as any);
        break;
      }
      case "distribution": {
        data = getBPDistribution(countries as any);
        break;
      }
      case "anomalies": {
        data = getAnomalies(countries as any);
        break;
      }
      case "correlation": {
        data = getCorrelationMatrix(countries as any);
        break;
      }
      case "trend": {
        if (!iso) {
          return NextResponse.json({ error: "Missing iso parameter for trend" }, { status: 400 });
        }
        data = getTrendData(iso, countries as any);
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
