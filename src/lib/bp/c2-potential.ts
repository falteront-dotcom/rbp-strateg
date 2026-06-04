// ─────────────────────────────────────────────────────────────────────────────
// BP Component 4/8 – C2 Potential (Command & Control)
//
// C2 = c2Capability×0.4 + ewCapability×0.3 + techLevel×0.3
//
// All inputs are 1–10 qualitative scores from the DB.
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { cappedNormalize } from "@/lib/bp/normalize";

/** Maximum value for qualitative DB scores */
const SCORE_MAX = 10;

export function calcC2Raw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const c2: number = data.c2Capability;
  const ew: number = data.ewCapability;
  const tech: number = data.techLevel;

  const raw: number = c2 * 0.4 + ew * 0.3 + tech * 0.3;

  const breakdown: Record<string, number> = {
    c2,
    ew,
    tech,
  };

  return { raw, breakdown };
}

/**
 * C2 raw is bounded [0, 10] — use capped normalisation against SCORE_MAX.
 */
export function normalizeC2(raw: number): number {
  return cappedNormalize(raw, SCORE_MAX);
}

export function scoreC2(
  data: CountryRawData,
  _allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcC2Raw(data);
  const normalizedValue: number = normalizeC2(raw);

  return {
    component: "c2" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
