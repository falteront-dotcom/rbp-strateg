import type Database from 'better-sqlite3';

export const WORKSPACE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  selected_country_iso TEXT NOT NULL,
  comparison_isos_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_scenarios (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_scenario_id TEXT REFERENCES workspace_scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  params_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspace_scenarios_workspace ON workspace_scenarios(workspace_id);
`;

export function ensureWorkspaceSchema(db: Database.Database): void {
  db.exec(WORKSPACE_SCHEMA_SQL);
}
