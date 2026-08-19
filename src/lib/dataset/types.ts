export type DatasetStatus = 'staging' | 'validated' | 'published' | 'rejected' | 'superseded';
export type DatasetHealthStatus = 'OPERATIONAL' | 'DEGRADED' | 'STALE' | 'FAILED';

export interface ValidationIssue {
  code: string;
  message: string;
  isoCode?: string;
  field?: string;
}

export interface ValidationSummary {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  rowCount: number;
  isoCount: number;
}

export interface DatasetVersion {
  id: string;
  version: string;
  status: DatasetStatus;
  createdAt: string;
  publishedAt: string | null;
  sourceSummary: Record<string, unknown>;
  validationSummary: Record<string, unknown>;
  warningCount: number;
  errorCount: number;
}

export interface DatasetHealth {
  status: DatasetHealthStatus;
  datasetVersion: string | null;
  lastCheck: string | null;
  countryCount: number;
  warningCount: number;
  errorCount: number;
}
