// ─────────────────────────────────────────────────────────────────────────────
// API /api/what-if — What-If Scenario Analysis
// POST: { iso, params } → { base, scenario }
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { calculateWhatIf, DEFAULT_SCENARIO_PARAMS, type ScenarioParams } from "@/lib/what-if-engine";
import { validateScenarioParams } from "@/lib/what-if-validation";
import { openReadonlyDatabase } from "@/db/runtime";
import { mapCountryRow, mapCountryRows, type RawCountryRow } from "@/db/country-mapper";
import { getDatasetHealth, getPublishedDataset } from "@/db/dataset-repository";
import { computeMissingFields } from "@/lib/data-quality";
import { buildConfidenceSummary, buildScenarioExplanation } from "@/lib/analysis/explainability";
import type { ChangedInput } from "@/lib/analysis/types";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    const { iso, params: rawParams } = body as { iso?: unknown; params?: unknown };

    if (typeof iso !== "string" || iso.length === 0) {
      return NextResponse.json({ error: "Missing iso parameter" }, { status: 400 });
    }

    // Неизвестный ключ или неверный тип — 400, а не тихий «сценарий = база».
    const validation = validateScenarioParams(rawParams);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const params = validation.params;

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
      const suppliedParams = validation.supplied;
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
