import { DEFAULT_SCENARIO_PARAMS, type ScenarioParams } from '@/lib/what-if-engine';
import type { CreateScenarioInput, CreateWorkspaceInput, UpdateWorkspaceInput } from './types';

const ISO_PATTERN = /^[A-Z]{3}$/;
const SCENARIO_NUMBER_FIELDS: ReadonlyArray<keyof ScenarioParams> = [
  'budgetChange', 'personnelChange', 'nuclearWarheadsGained', 'tankChange', 'aircraftChange', 'navyChange',
];
const SCENARIO_KEYS = new Set<string>([
  ...SCENARIO_NUMBER_FIELDS, 'allianceSwitch', 'nuclearGain', 'atWar', 'sanctionsActive',
]);
const BOOLEAN_FIELDS = ['nuclearGain', 'atWar', 'sanctionsActive'] as const;

function validIso(value: unknown): value is string { return typeof value === 'string' && ISO_PATTERN.test(value); }
function validateString(value: unknown, field: string, maxLength: number): string | null { return typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength ? `${field} is invalid` : null; }

export function validateWorkspaceInput(input: unknown): { ok: true; value: CreateWorkspaceInput } | { ok: false; errors: string[] };
export function validateWorkspaceInput(input: unknown, partial: true): { ok: true; value: UpdateWorkspaceInput } | { ok: false; errors: string[] };
export function validateWorkspaceInput(input: unknown, partial = false): { ok: true; value: CreateWorkspaceInput | UpdateWorkspaceInput } | { ok: false; errors: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['JSON object required'] };
  const body = input as Record<string, unknown>; const errors: string[] = [];
  if (!partial || body.name !== undefined) { const error = validateString(body.name, 'name', 120); if (error) errors.push(error); }
  if (body.selectedCountryIso !== undefined && !validIso(body.selectedCountryIso)) errors.push('selectedCountryIso is invalid');
  if (body.comparisonIsos !== undefined && (!Array.isArray(body.comparisonIsos) || body.comparisonIsos.length > 4 || body.comparisonIsos.some((iso) => !validIso(iso)))) errors.push('comparisonIsos must contain at most four ISO-3 codes');
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 20_000)) errors.push('notes is invalid');
  return errors.length ? { ok: false, errors } : { ok: true, value: body as CreateWorkspaceInput | UpdateWorkspaceInput };
}

function validateScenarioParams(params: Record<string, unknown>): string[] {
  const errors = Object.keys(params).filter((field) => !SCENARIO_KEYS.has(field)).map((field) => `${field} is not a supported scenario parameter`);
  for (const field of SCENARIO_NUMBER_FIELDS) {
    const value = params[field]; if (value === undefined) continue;
    const validNumber = typeof value === 'number' && Number.isFinite(value);
    const validRange = field === 'nuclearWarheadsGained' ? (value as number) >= 0 && (value as number) <= 10_000 : (value as number) >= -1 && (value as number) <= 2;
    if (!validNumber || !validRange) errors.push(`${field} must be finite and within supported bounds`);
  }
  if (params.allianceSwitch !== undefined && params.allianceSwitch !== null && !['NATO', 'CSTO', 'BRICS', 'Neutral', 'AUKUS'].includes(params.allianceSwitch as string)) errors.push('allianceSwitch is invalid');
  for (const field of BOOLEAN_FIELDS) if (params[field] !== undefined && typeof params[field] !== 'boolean') errors.push(`${field} must be boolean`);
  return errors;
}

export function validateScenarioInput(input: unknown): { ok: true; value: { name: string; params: ScenarioParams; parentScenarioId: string | null } } | { ok: false; errors: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['JSON object required'] };
  const body = input as Record<string, unknown>; const nameError = validateString(body.name, 'name', 120);
  if (nameError) return { ok: false, errors: [nameError] };
  if (!body.params || typeof body.params !== 'object' || Array.isArray(body.params)) return { ok: false, errors: ['params object required'] };
  const errors = validateScenarioParams(body.params as Record<string, unknown>);
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { name: body.name as string, params: { ...DEFAULT_SCENARIO_PARAMS, ...(body.params as Record<string, unknown>) } as ScenarioParams, parentScenarioId: typeof body.parentScenarioId === 'string' ? body.parentScenarioId : null } };
}

export function validateScenarioPatch(input: unknown): { ok: true; value: Partial<CreateScenarioInput> } | { ok: false; errors: string[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['JSON object required'] };
  const body = input as Record<string, unknown>; const errors: string[] = [];
  if (body.name !== undefined) { const error = validateString(body.name, 'name', 120); if (error) errors.push(error); }
  if (body.params !== undefined) {
    if (!body.params || typeof body.params !== 'object' || Array.isArray(body.params)) errors.push('params object required');
    else errors.push(...validateScenarioParams(body.params as Record<string, unknown>));
  }
  if (body.parentScenarioId !== undefined && body.parentScenarioId !== null && typeof body.parentScenarioId !== 'string') errors.push('parentScenarioId is invalid');
  return errors.length ? { ok: false, errors } : { ok: true, value: body as Partial<CreateScenarioInput> };
}
