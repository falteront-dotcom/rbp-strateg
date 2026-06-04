// ─────────────────────────────────────────────────────────────────────────────
// BP Model – Normalization Utilities
// Three normalization strategies for mapping raw values → [0, 100]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Min-Max normalization.
 * Linearly maps `v` from [min, max] → [0, 100].
 * Returns 0 when min === max (degenerate range).
 */
export function minMaxNormalize(
  v: number,
  min: number,
  max: number,
): number {
  if (max === min) return 0;
  if (v <= min) return 0;
  if (v >= max) return 100;
  return ((v - min) / (max - min)) * 100;
}

/**
 * Logarithmic normalization.
 * Maps `v` through log₁₀ scaling to [0, 100] relative to `cap`.
 * Returns 0 for v ≤ 0, 100 when v ≥ cap.
 * Handles large-range data (GDP, population, fleet sizes) more fairly than linear.
 */
export function logNormalize(v: number, cap: number): number {
  if (v <= 0) return 0;
  if (cap <= 0) return 0;
  if (v >= cap) return 100;
  const logV = Math.log10(v + 1);
  const logCap = Math.log10(cap + 1);
  if (logCap === 0) return 0;
  return Math.min((logV / logCap) * 100, 100);
}

/**
 * Capped (proportional) normalization.
 * Returns min(v / cap × 100, 100).
 * Useful when you know a hard ceiling (e.g. tech level max = 10).
 */
export function cappedNormalize(v: number, cap: number): number {
  if (cap <= 0) return 0;
  if (v <= 0) return 0;
  return Math.min((v / cap) * 100, 100);
}
