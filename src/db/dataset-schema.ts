import type Database from 'better-sqlite3';

export const DATASET_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dataset_versions (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('staging','validated','published','rejected','superseded')),
  created_at TEXT NOT NULL,
  published_at TEXT,
  source_summary_json TEXT NOT NULL DEFAULT '{}',
  validation_summary_json TEXT NOT NULL DEFAULT '{}',
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_version_id TEXT NOT NULL REFERENCES dataset_versions(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT,
  error_message TEXT
);
CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function ensureDatasetSchema(db: Database.Database): void {
  db.exec(DATASET_SCHEMA_SQL);
}
