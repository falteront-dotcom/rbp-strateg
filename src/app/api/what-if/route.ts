// ─────────────────────────────────────────────────────────────────────────────
// API /api/what-if — What-If Scenario Analysis
// POST: { iso, params } → { base, scenario }
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { calculateWhatIf, type ScenarioParams, DEFAULT_SCENARIO_PARAMS } from "@/lib/what-if-engine";
import { normalizeIsoCode, toCountryRawData } from "@/lib/db/country-row-mapper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const iso = normalizeIsoCode(body.iso);
    const params: ScenarioParams = { ...DEFAULT_SCENARIO_PARAMS, ...body.params };

    if (!iso) {
      return NextResponse.json({ error: "Missing iso parameter" }, { status: 400 });
    }

    // Dynamic import for better-sqlite3 (Turbopack compatibility)
    const Database = (await import("better-sqlite3")).default;
    const db = new Database("sqlite.db", { readonly: true });

    const row = db.prepare("SELECT * FROM countries WHERE iso_code = ?").get(iso) as Record<string, unknown> | undefined;
    if (!row) {
      db.close();
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const allRows = db.prepare("SELECT * FROM countries").all() as Record<string, unknown>[];
    db.close();

    const country = toCountryRawData(row);
    const allCountries = allRows.map(toCountryRawData);

    const result = calculateWhatIf(country, allCountries, params);

    return NextResponse.json({
      base: { isoCode: result.baseBP.isoCode, totalBP: result.baseBP.totalBP, rank: result.baseRank },
      scenario: {
        totalBP: result.scenarioBP.totalBP,
        rank: result.scenarioRank,
        rankChange: result.rankChange,
        componentDeltas: result.componentDeltas,
        totalDelta: result.totalDelta,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
