import type { RawCountryRow } from '@/db/country-mapper';
import type { ValidationIssue, ValidationSummary } from './types';

const BP_FIELDS = [
  'bp_total', 'bp_weapon', 'bp_manpower', 'bp_logistics', 'bp_c2',
  'bp_economy', 'bp_doctrine', 'bp_readiness', 'bp_terrain',
] as const;

const REQUIRED_STRINGS = ['iso_code', 'name', 'name_ru', 'side', 'climate_zone', 'updated_at'] as const;

export interface DatasetValidationOptions {
  minimumRows?: number;
  previousRowCount?: number;
}

export function validateCountryDataset(
  rows: RawCountryRow[],
  options: DatasetValidationOptions = {},
): ValidationSummary {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const field of REQUIRED_STRINGS) {
      if (typeof row[field] !== 'string' || row[field].trim().length === 0) {
        errors.push({ code: 'MISSING_REQUIRED_STRING', message: `${field} is required`, isoCode: row.iso_code, field });
      }
    }

    if (seen.has(row.iso_code)) {
      errors.push({ code: 'DUPLICATE_ISO', message: `Duplicate ISO code ${row.iso_code}`, isoCode: row.iso_code });
    }
    seen.add(row.iso_code);

    for (const [field, value] of Object.entries(row)) {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        errors.push({ code: 'NON_FINITE_NUMBER', message: `${field} must be finite`, isoCode: row.iso_code, field });
      }
    }

    for (const field of BP_FIELDS) {
      const value = row[field];
      if (value !== null && Number.isFinite(value) && (value < 0 || value > 100)) {
        errors.push({ code: 'BP_OUT_OF_RANGE', message: `${field} must be between 0 and 100`, isoCode: row.iso_code, field });
      }
    }
  }

  const minimumRows = options.minimumRows ?? 59;
  if (rows.length < minimumRows) {
    warnings.push({ code: 'LOW_ROW_COUNT', message: `Dataset has ${rows.length} rows; expected at least ${minimumRows}` });
  }
  if (options.previousRowCount && Math.abs(rows.length - options.previousRowCount) / options.previousRowCount > 0.2) {
    warnings.push({ code: 'ROW_COUNT_DELTA', message: `Dataset row count changed from ${options.previousRowCount} to ${rows.length}` });
  }

  return { ok: errors.length === 0, errors, warnings, rowCount: rows.length, isoCount: seen.size };
}
