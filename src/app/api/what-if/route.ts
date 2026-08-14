// ─────────────────────────────────────────────────────────────────────────────
// API /api/what-if — What-If Scenario Analysis
// POST: { iso, params } → { base, scenario }
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { calculateWhatIf, type ScenarioParams, DEFAULT_SCENARIO_PARAMS } from "@/lib/what-if-engine";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRow, mapCountryRows, type RawCountryRow } from "@/db/country-mapper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const iso: string = body.iso;
    const params: ScenarioParams = { ...DEFAULT_SCENARIO_PARAMS, ...body.params };

    if (!iso) {
      return NextResponse.json({ error: "Missing iso parameter" }, { status: 400 });
    }

    const db = openReadonlyDatabase();
    try {
      // Query the canonical snake_case primary key and map through the shared
      // mapper. CountryApiData is structurally a CountryRawData, so the what-if
      // engine can recalculate BP from the real metric values.
      const row = db
        .prepare("SELECT * FROM countries WHERE iso_code = ?")
        .get(iso) as RawCountryRow | undefined;

      if (!row) {
        return NextResponse.json({ error: "Country not found" }, { status: 404 });
      }

      const allRows = db.prepare("SELECT * FROM countries").all() as RawCountryRow[];

      const country = mapCountryRow(row);
      const allCountries = mapCountryRows(allRows);

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
    } finally {
      db.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
