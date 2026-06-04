// ─────────────────────────────────────────────────────────────────────────────
// BP Model – Weights Configuration
// ─────────────────────────────────────────────────────────────────────────────

import { BP_COMPONENTS, type BPComponent } from "./types";

/** Map of every component → its weight (must sum to 1.0) */
export type WeightsConfig = Record<BPComponent, number>;

/** Default weights – calibrated for conventional-force BP model */
export const DEFAULT_WEIGHTS: WeightsConfig = {
  weapon: 0.20,
  manpower: 0.15,
  logistics: 0.12,
  c2: 0.10,
  economy: 0.15,
  doctrine: 0.08,
  readiness: 0.10,
  terrain: 0.10,
} as const;

/**
 * Validate a WeightsConfig:
 * 1. All 8 components present
 * 2. Every weight is a finite number ≥ 0
 * 3. Sum is 1.0 ± ε
 *
 * Returns `{ valid: true }` or `{ valid: false, errors: string[] }`.
 */
export function validateWeights(
  weights: Partial<WeightsConfig>,
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  // 1. Presence
  for (const comp of BP_COMPONENTS) {
    if (weights[comp] === undefined) {
      errors.push(`Missing weight for component "${comp}"`);
    }
  }

  // 2. Range
  for (const comp of BP_COMPONENTS) {
    const w = weights[comp];
    if (w !== undefined && (typeof w !== "number" || !Number.isFinite(w) || w < 0)) {
      errors.push(`Weight for "${comp}" must be a finite non-negative number, got ${w}`);
    }
  }

  // 3. Sum ≈ 1.0
  const sum = BP_COMPONENTS.reduce((acc, comp) => acc + (weights[comp] ?? 0), 0);
  if (Math.abs(sum - 1.0) > 1e-6) {
    errors.push(`Weights must sum to 1.0, got ${sum.toFixed(8)}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
