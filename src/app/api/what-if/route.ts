// ─────────────────────────────────────────────────────────────────────────────
// API /api/what-if — What-If Scenario Analysis
// POST: { iso, params } → { base, scenario }
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { calculateWhatIf, type ScenarioParams, DEFAULT_SCENARIO_PARAMS } from "@/lib/what-if-engine";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRow, mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import { getDatasetHealth, getPublishedDataset } from "@/db/dataset-repository";
import { computeMissingFields } from "@/lib/data-quality";
import { buildConfidenceSummary, buildScenarioExplanation } from "@/lib/analysis/explainability";
import type { ChangedInput } from "@/lib/analysis/types";

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
      const dataset = getPublishedDataset(db);
      const health = getDatasetHealth(db);
      const confidence = buildConfidenceSummary(computeMissingFields(row), health.status);
      const suppliedParams = body.params && typeof body.params === "object" ? body.params as Partial<ScenarioParams> : {};
      const changedInputs: ChangedInput[] = Object.entries(suppliedParams)
        .filter(([field, value]) => DEFAULT_SCENARIO_PARAMS[field as keyof ScenarioParams] !== value)
        .map(([field, value]) => ({
          field,
          before: DEFAULT_SCENARIO_PARAMS[field as keyof ScenarioParams],
          after: value,
        }));
      const explanation = buildScenarioExplanation(result, confidence, changedInputs);
      const metadata = {
        datasetVersion: dataset?.version ?? null,
        formulaVersion: "bp-v2",
        calculatedAt: new Date().toISOString(),
        confidence,
        warnings: confidence.warnings,
      };

      return NextResponse.json({
        metadata,
        explanation,
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
