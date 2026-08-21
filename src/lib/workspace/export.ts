import type Database from 'better-sqlite3';
import { getPublishedDataset } from '@/db/dataset-repository';
import { getWorkspace, listScenarios } from '@/db/workspace-repository';

export interface WorkspaceExport {
  workspace: Record<string, unknown> & { schemaVersion: 1 };
  datasetVersion: string | null;
  formulaVersion: string;
  scenarios: Array<Record<string, unknown>>;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function exportWorkspaceJson(db: Database.Database, workspaceId: string): WorkspaceExport | null {
  const workspace = getWorkspace(db, workspaceId);
  if (!workspace) return null;
  const scenarios = listScenarios(db, workspaceId);
  return {
    workspace: { ...workspace, schemaVersion: 1 },
    datasetVersion: getPublishedDataset(db)?.version ?? null,
    formulaVersion: 'bp-v2',
    scenarios: scenarios.map((scenario) => ({ ...scenario, params: scenario.params })),
  };
}

export function exportWorkspaceCsv(db: Database.Database, workspaceId: string): string | null {
  const body = exportWorkspaceJson(db, workspaceId);
  if (!body) return null;
  const componentHeaders = ['weapon', 'manpower', 'logistics', 'c2', 'economy', 'doctrine', 'readiness', 'terrain'].map((component) => `delta_${component}`);
  const headers = ['workspaceId', 'scenarioId', 'scenarioName', 'datasetVersion', 'formulaVersion', 'totalBP', 'rank', 'totalDelta', ...componentHeaders];
  const rows = body.scenarios.map((scenario) => {
    const snapshot = db.prepare('SELECT result_json FROM workspace_snapshots WHERE workspace_id = ? AND scenario_id = ? ORDER BY created_at DESC LIMIT 1').get(body.workspace.id, scenario.id) as { result_json: string } | undefined;
    let result: { scenario?: { totalBP?: number; rank?: number; totalDelta?: number }; explanation?: { componentDeltas?: Array<{ component: string; delta: number }> } } = {};
    if (snapshot) {
      try { result = JSON.parse(snapshot.result_json) as typeof result; } catch { result = {}; }
    }
    const deltas = new Map((result.explanation?.componentDeltas ?? []).map((delta) => [delta.component, delta.delta]));
    return [
      body.workspace.id,
      scenario.id,
      scenario.name,
      body.datasetVersion,
      body.formulaVersion,
      result.scenario?.totalBP ?? '',
      result.scenario?.rank ?? '',
      result.scenario?.totalDelta ?? '',
      ...componentHeaders.map((header) => deltas.get(header.replace('delta_', '')) ?? ''),
    ];
  });
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
