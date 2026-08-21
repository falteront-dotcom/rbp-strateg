import { DEFAULT_SCENARIO_PARAMS, type ScenarioParams } from '@/lib/what-if-engine';
import type { CreateScenarioInput, CreateWorkspaceInput, UpdateWorkspaceInput } from './types';

const ISO_PATTERN = /^[A-Z]{3}$/;
const SCENARIO_NUMBER_FIELDS: ReadonlyArray<keyof ScenarioParams> = [
  'budgetChange', 'personnelChange', 'nuclearWarheadsGained', 'tankChange', 'aircraftChange', 'navyChange',
];

function validIso(value: unknown): value is string {
  return typeof value === 'string' && ISO_PATTERN.test(value);
}

function validateString(value: unknown, field: string, maxLength: number): string | null {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) return `${field} is invalid`;
  return null;
}

export function validateWorkspaceInput(input: unknown): { ok: true; value: CreateWorkspaceInput } | { ok: false; errors: string[] };
export function validateWorkspaceInput(input: unknown, partial: true): { ok: true; value: UpdateWorkspaceInput } | { ok: false; errors: string[] };
export function validateWorkspaceInput(input: unknown, partial = false): { ok: true; value: CreateWorkspaceInput | UpdateWorkspaceInput } | { ok: false; errors: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['JSON object required'] };
  const body = input as Record<string, unknown>;
  const errors: string[] = [];
  if (!partial || body.name !== undefined) {
    const error = validateString(body.name, 'name', 120);
    if (error) errors.push(error);
  }
  if (body.selectedCountryIso !== undefined && !validIso(body.selectedCountryIso)) errors.push('selectedCountryIso is invalid');
  if (body.comparisonIsos !== undefined && (!Array.isArray(body.comparisonIsos) || body.comparisonIsos.length > 4 || body.comparisonIsos.some((iso) => !validIso(iso)))) {
    errors.push('comparisonIsos must contain at most four ISO-3 codes');
  }
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 10_000)) errors.push('notes is invalid');
  return errors.length ? { ok: false, errors } : { ok: true, value: body as CreateWorkspaceInput | UpdateWorkspaceInput };
}

export function validateScenarioInput(input: unknown): { ok: true; value: { name: string; params: ScenarioParams; parentScenarioId: string | null } } | { ok: false; errors: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['JSON object required'] };
  const body = input as Record<string, unknown>;
  const nameError = validateString(body.name, 'name', 120);
  if (nameError) return { ok: false, errors: [nameError] };
  if (!body.params || typeof body.params !== 'object' || Array.isArray(body.params)) return { ok: false, errors: ['params object required'] };
  const params: Record<string, unknown> = body.params as Record<string, unknown>;
  const errors = SCENARIO_NUMBER_FIELDS.filter((field) => params[field] !== undefined && (typeof params[field] !== 'number' || !Number.isFinite(params[field] as number))).map((field) => `${field} must be finite`);
  if (params.allianceSwitch !== undefined && params.allianceSwitch !== null && !['NATO', 'CSTO', 'BRICS', 'Neutral', 'AUKUS'].includes(params.allianceSwitch as string)) errors.push('allianceSwitch is invalid');
  for (const field of ['nuclearGain', 'atWar', 'sanctionsActive'] as const) {
    if (params[field] !== undefined && typeof params[field] !== 'boolean') errors.push(`${field} must be boolean`);
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: body.name as string,
      params: { ...DEFAULT_SCENARIO_PARAMS, ...params } as ScenarioParams,
      parentScenarioId: typeof body.parentScenarioId === 'string' ? body.parentScenarioId : null,
    },
  };
}
