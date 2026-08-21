import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ensureWorkspaceSchema } from './workspace-schema';
import type { CreateScenarioInput, CreateWorkspaceInput, UpdateWorkspaceInput, Workspace, WorkspaceScenario } from '@/lib/workspace/types';
import type { ScenarioParams } from '@/lib/what-if-engine';

interface WorkspaceRow { id: string; name: string; selected_country_iso: string; comparison_isos_json: string; notes: string; created_at: string; updated_at: string; }
interface ScenarioRow { id: string; workspace_id: string; parent_scenario_id: string | null; name: string; params_json: string; created_at: string; updated_at: string; }
export interface WorkspaceSnapshot { id: string; workspaceId: string; scenarioId: string | null; datasetVersion: string; formulaVersion: string; result: unknown; createdAt: string; }

function parseIsos(json: string): string[] { try { const value: unknown = JSON.parse(json); return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } }
function parseParams(json: string): ScenarioParams { try { return JSON.parse(json) as ScenarioParams; } catch { throw new Error('Stored scenario parameters are invalid'); } }
function mapWorkspace(row: WorkspaceRow): Workspace { return { id: row.id, name: row.name, selectedCountryIso: row.selected_country_iso, comparisonIsos: parseIsos(row.comparison_isos_json), notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapScenario(row: ScenarioRow): WorkspaceScenario { return { id: row.id, workspaceId: row.workspace_id, parentScenarioId: row.parent_scenario_id, name: row.name, params: parseParams(row.params_json), createdAt: row.created_at, updatedAt: row.updated_at }; }

export function listWorkspaces(db: Database.Database): Workspace[] { ensureWorkspaceSchema(db); return (db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC').all() as WorkspaceRow[]).map(mapWorkspace); }
export function getWorkspace(db: Database.Database, id: string): Workspace | null { ensureWorkspaceSchema(db); const row = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as WorkspaceRow | undefined; return row ? mapWorkspace(row) : null; }
export function createWorkspace(db: Database.Database, input: CreateWorkspaceInput): Workspace {
  ensureWorkspaceSchema(db); const now = new Date().toISOString(); const id = randomUUID();
  db.prepare('INSERT INTO workspaces (id, name, selected_country_iso, comparison_isos_json, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, input.name.trim(), input.selectedCountryIso ?? 'USA', JSON.stringify(input.comparisonIsos ?? []), input.notes ?? '', now, now);
  return getWorkspace(db, id)!;
}
export function updateWorkspace(db: Database.Database, id: string, input: UpdateWorkspaceInput): Workspace | null {
  ensureWorkspaceSchema(db); const existing = getWorkspace(db, id); if (!existing) return null; const now = new Date().toISOString();
  db.prepare('UPDATE workspaces SET name = ?, selected_country_iso = ?, comparison_isos_json = ?, notes = ?, updated_at = ? WHERE id = ?').run(input.name?.trim() ?? existing.name, input.selectedCountryIso ?? existing.selectedCountryIso, JSON.stringify(input.comparisonIsos ?? existing.comparisonIsos), input.notes ?? existing.notes, now, id);
  return getWorkspace(db, id);
}
export function deleteWorkspace(db: Database.Database, id: string): boolean { ensureWorkspaceSchema(db); return db.prepare('DELETE FROM workspaces WHERE id = ?').run(id).changes > 0; }
export function listScenarios(db: Database.Database, workspaceId: string): WorkspaceScenario[] { ensureWorkspaceSchema(db); return (db.prepare('SELECT * FROM workspace_scenarios WHERE workspace_id = ? ORDER BY created_at ASC').all(workspaceId) as ScenarioRow[]).map(mapScenario); }
export function getScenario(db: Database.Database, workspaceId: string, scenarioId: string): WorkspaceScenario | null { ensureWorkspaceSchema(db); const row = db.prepare('SELECT * FROM workspace_scenarios WHERE workspace_id = ? AND id = ?').get(workspaceId, scenarioId) as ScenarioRow | undefined; return row ? mapScenario(row) : null; }
export function createScenario(db: Database.Database, workspaceId: string, input: CreateScenarioInput): WorkspaceScenario {
  ensureWorkspaceSchema(db); const now = new Date().toISOString(); const id = randomUUID();
  db.prepare('INSERT INTO workspace_scenarios (id, workspace_id, parent_scenario_id, name, params_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, input.parentScenarioId ?? null, input.name.trim(), JSON.stringify(input.params), now, now);
  db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, workspaceId);
  return getScenario(db, workspaceId, id)!;
}
export function updateScenario(db: Database.Database, workspaceId: string, scenarioId: string, input: Partial<CreateScenarioInput>): WorkspaceScenario | null {
  ensureWorkspaceSchema(db); const existing = getScenario(db, workspaceId, scenarioId); if (!existing) return null; const now = new Date().toISOString();
  db.prepare('UPDATE workspace_scenarios SET name = ?, params_json = ?, parent_scenario_id = ?, updated_at = ? WHERE workspace_id = ? AND id = ?').run(input.name?.trim() ?? existing.name, JSON.stringify(input.params ?? existing.params), input.parentScenarioId === undefined ? existing.parentScenarioId : input.parentScenarioId, now, workspaceId, scenarioId);
  db.prepare('UPDATE workspaces SET updated_at = ? WHERE id = ?').run(now, workspaceId);
  return getScenario(db, workspaceId, scenarioId);
}
export function deleteScenario(db: Database.Database, workspaceId: string, scenarioId: string): boolean { ensureWorkspaceSchema(db); return db.prepare('DELETE FROM workspace_scenarios WHERE workspace_id = ? AND id = ?').run(workspaceId, scenarioId).changes > 0; }

export function createWorkspaceSnapshot(db: Database.Database, workspaceId: string, scenarioId: string | null, datasetVersion: string, formulaVersion: string, result: unknown): WorkspaceSnapshot {
  ensureWorkspaceSchema(db); const id = randomUUID(); const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO workspace_snapshots (id, workspace_id, scenario_id, dataset_version, formula_version, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, scenarioId, datasetVersion, formulaVersion, JSON.stringify(result), createdAt);
  return { id, workspaceId, scenarioId, datasetVersion, formulaVersion, result, createdAt };
}
