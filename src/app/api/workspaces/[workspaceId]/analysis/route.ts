import { NextResponse } from 'next/server';
import { openDatabase } from '@/db/runtime';
import { getDatasetHealth, getPublishedDataset } from '@/db/dataset-repository';
import { mapCountryRow, mapCountryRows, type RawCountryRow } from '@/db/country-mapper';
import { computeMissingFields } from '@/lib/data-quality';
import { buildConfidenceSummary, buildScenarioExplanation } from '@/lib/analysis/explainability';
import { calculateWhatIf } from '@/lib/what-if-engine';
import { getScenario, getWorkspace } from '@/db/workspace-repository';

type Context = { params: Promise<{ workspaceId: string }> };

export async function GET(request: Request, context: Context): Promise<NextResponse> {
  const { workspaceId } = await context.params;
  const scenarioId = new URL(request.url).searchParams.get('scenarioId');
  if (!scenarioId) return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
  const db = openDatabase();
  try {
    const workspace = getWorkspace(db, workspaceId);
    const scenario = getScenario(db, workspaceId, scenarioId);
    if (!workspace || !scenario) return NextResponse.json({ error: 'Workspace or scenario not found' }, { status: 404 });
    const row = db.prepare('SELECT * FROM countries WHERE iso_code = ?').get(workspace.selectedCountryIso) as RawCountryRow | undefined;
    if (!row) return NextResponse.json({ error: 'Country not found' }, { status: 404 });
    const rows = db.prepare('SELECT * FROM countries').all() as RawCountryRow[];
    const result = calculateWhatIf(mapCountryRow(row), mapCountryRows(rows), scenario.params);
    const health = getDatasetHealth(db);
    const confidence = buildConfidenceSummary(computeMissingFields(row), health.status);
    const metadata = { datasetVersion: getPublishedDataset(db)?.version ?? null, formulaVersion: 'bp-v2', calculatedAt: new Date().toISOString(), confidence, warnings: confidence.warnings };
    return NextResponse.json({ metadata, explanation: buildScenarioExplanation(result, confidence), base: { isoCode: result.baseBP.isoCode, totalBP: result.baseBP.totalBP, rank: result.baseRank }, scenario: { totalBP: result.scenarioBP.totalBP, rank: result.scenarioRank, rankChange: result.rankChange, componentDeltas: result.componentDeltas, totalDelta: result.totalDelta } });
  } finally { db.close(); }
}
