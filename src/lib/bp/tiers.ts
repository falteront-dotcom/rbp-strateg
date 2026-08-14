// ─────────────────────────────────────────────────────────────────────────────
// BP Tier Classification — Canonical threshold/label/color source of truth
// РБП-Стратег 2.0
//
// The canonical boundaries are 80 / 60 / 40 / 20 — the set already used by
// CountryCard, BPDetailTab, CountryPopup, comparison, and coalition-analysis.
// The detailed calculator previously diverged to 85/70/50/30; it now routes
// through this module so classification is consistent. These are *display
// classification* buckets only — they never change the BP calculation formulas.
// ─────────────────────────────────────────────────────────────────────────────

/** The five BP tier buckets, ordered highest-to-lowest by threshold. */
export type BPTierKey = "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "MINIMAL";

export interface BPTierInfo {
  key: BPTierKey;
  /** Lower-inclusive threshold: a score >= threshold falls into this tier. */
  threshold: number;
  /** Russian display label. */
  labelRu: string;
  /** English label (used by the map popup badge). */
  labelEn: string;
  /** Tailwind text-color utility class. */
  colorClass: string;
  /** Hex color for non-Tailwind consumers (recharts, inline styles). */
  hex: string;
}

/** Tiers ordered from highest to lowest by lower-inclusive threshold. */
export const BPTIERS: readonly BPTierInfo[] = [
  { key: "CRITICAL", threshold: 80, labelRu: "КРИТИЧЕСКИЙ", labelEn: "CRITICAL", colorClass: "text-red-400", hex: "#ef4444" },
  { key: "HIGH", threshold: 60, labelRu: "ВЫСОКИЙ", labelEn: "HIGH", colorClass: "text-yellow-400", hex: "#f59e0b" },
  { key: "MODERATE", threshold: 40, labelRu: "СРЕДНИЙ", labelEn: "MODERATE", colorClass: "text-teal-400", hex: "#22d3ee" },
  { key: "LOW", threshold: 20, labelRu: "НИЗКИЙ", labelEn: "LOW", colorClass: "text-cyan-400", hex: "#3b82f6" },
  { key: "MINIMAL", threshold: Number.NEGATIVE_INFINITY, labelRu: "МИНИМАЛЬНЫЙ", labelEn: "MINIMAL", colorClass: "text-slate-400", hex: "#64748b" },
] as const;

/** Tier info keyed by BPTierKey for O(1) lookup of labels/colors. */
export const BPTIER_BY_KEY: Record<BPTierKey, BPTierInfo> = {
  CRITICAL: BPTIERS[0],
  HIGH: BPTIERS[1],
  MODERATE: BPTIERS[2],
  LOW: BPTIERS[3],
  MINIMAL: BPTIERS[4],
};

/** Resolve the tier KEY for a numeric score using the canonical 80/60/40/20. */
export function getBPTierKey(score: number): BPTierKey {
  for (const tier of BPTIERS) {
    if (score >= tier.threshold) return tier.key;
  }
  return "MINIMAL";
}

/** Resolve the full tier info (labels + colors) for a numeric score. */
export function getBPTierInfo(score: number): BPTierInfo {
  return BPTIER_BY_KEY[getBPTierKey(score)];
}

/** Russian tier label for a numeric score (e.g. "КРИТИЧЕСКИЙ"). */
export function getBPTierLabel(score: number): string {
  return getBPTierInfo(score).labelRu;
}

/** English tier label for a numeric score (e.g. "CRITICAL"). */
export function getBPTierLabelEn(score: number): string {
  return getBPTierInfo(score).labelEn;
}

/** Tailwind text-color utility class for a numeric score. */
export function getBPTierColor(score: number): string {
  return getBPTierInfo(score).colorClass;
}

/** Hex color for chart/inline-style consumers. */
export function getBPTierHex(score: number): string {
  return getBPTierInfo(score).hex;
}