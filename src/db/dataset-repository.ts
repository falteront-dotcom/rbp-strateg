import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { DatasetHealth, DatasetStatus, DatasetVersion, ValidationSummary } from '@/lib/dataset/types';
import { ensureDatasetSchema } from './dataset-schema';

interface DatasetVersionRow {
  id: string;
  version: string;
  status: DatasetStatus;
  created_at: string;
  published_at: string | null;
  source_summary_json: string;
  validation_summary_json: string;
  warning_count: number;
  error_count: number;
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function mapVersion(row: DatasetVersionRow): DatasetVersion {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    sourceSummary: parseObject(row.source_summary_json),
    validationSummary: parseObject(row.validation_summary_json),
    warningCount: row.warning_count,
    errorCount: row.error_count,
  };
}

export function bootstrapPublishedDataset(db: Database.Database): DatasetVersion | null {
  ensureDatasetSchema(db);
  const existing = getPublishedDataset(db);
  if (existing) return existing;

  const country = db.prepare('SELECT COUNT(*) AS count, MAX(updated_at) AS updated_at FROM countries').get() as { count: number; updated_at: string | null };
  if (!country.count) return null;
  const stamp = country.updated_at ?? 'unknown';
  const now = new Date().toISOString();
  const id = randomUUID();
  const version = `seed-${stamp}`;
  const validation = { ok: true, rowCount: country.count, isoCount: country.count, errors: [], warnings: [] };
  db.prepare(`INSERT OR IGNORE INTO dataset_versions
    (id, version, status, created_at, published_at, source_summary_json, validation_summary_json, warning_count, error_count)
    VALUES (?, ?, 'published', ?, ?, ?, ?, 0, 0)`)
    .run(id, version, now, now, JSON.stringify({ source: 'local-seed' }), JSON.stringify(validation));
  const published = db.prepare('SELECT id FROM dataset_versions WHERE version = ?').get(version) as { id: string };
  db.prepare(`INSERT INTO app_state (key, value) VALUES ('current_published_dataset_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(published.id);
  return getPublishedDataset(db);
}

export function recordPublishedDataset(
  db: Database.Database,
  version: string,
  validation: ValidationSummary,
  sourceSummary: Record<string, unknown>,
): DatasetVersion {
  ensureDatasetSchema(db);
  const now = new Date().toISOString();
  const id = randomUUID();
  db.prepare("UPDATE dataset_versions SET status = 'superseded' WHERE status = 'published' AND version <> ?").run(version);
  db.prepare(`INSERT INTO dataset_versions
    (id, version, status, created_at, published_at, source_summary_json, validation_summary_json, warning_count, error_count)
    VALUES (?, ?, 'published', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(version) DO UPDATE SET
      status = 'published', published_at = excluded.published_at,
      source_summary_json = excluded.source_summary_json,
      validation_summary_json = excluded.validation_summary_json,
      warning_count = excluded.warning_count, error_count = excluded.error_count`)
    .run(id, version, now, now, JSON.stringify(sourceSummary), JSON.stringify(validation), validation.warnings.length, validation.errors.length);
  const stored = db.prepare('SELECT id FROM dataset_versions WHERE version = ?').get(version) as { id: string };
  db.prepare(`INSERT INTO app_state (key, value) VALUES ('current_published_dataset_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(stored.id);
  return getPublishedDataset(db)!;
}

export function getPublishedDataset(db: Database.Database): DatasetVersion | null {
  const row = db.prepare(`SELECT dv.* FROM dataset_versions dv
    JOIN app_state state ON state.key = 'current_published_dataset_id' AND state.value = dv.id
    LIMIT 1`).get() as DatasetVersionRow | undefined;
  return row ? mapVersion(row) : null;
}

export function listDatasetVersions(db: Database.Database, limit = 20): DatasetVersion[] {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const rows = db.prepare('SELECT * FROM dataset_versions ORDER BY created_at DESC LIMIT ?').all(safeLimit) as DatasetVersionRow[];
  return rows.map(mapVersion);
}

export function getDatasetHealth(db: Database.Database): DatasetHealth {
  const published = getPublishedDataset(db);
  const country = db.prepare('SELECT COUNT(*) AS count FROM countries').get() as { count: number };
  if (!published) {
    return { status: 'FAILED', datasetVersion: null, lastCheck: null, countryCount: country.count, warningCount: 0, errorCount: 1 };
  }
  const ageMs = Date.now() - new Date(published.publishedAt ?? published.createdAt).getTime();
  const status = published.errorCount > 0 ? 'FAILED' : published.warningCount > 0 ? 'DEGRADED' : ageMs > 30 * 24 * 60 * 60 * 1000 ? 'STALE' : 'OPERATIONAL';
  return {
    status,
    datasetVersion: published.version,
    lastCheck: published.publishedAt ?? published.createdAt,
    countryCount: country.count,
    warningCount: published.warningCount,
    errorCount: published.errorCount,
  };
}
