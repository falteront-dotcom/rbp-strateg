// ─────────────────────────────────────────────────────────────────────────────
// BP Component 6/8 – Doctrine Potential (D)
//
// D = exp×0.4 + modern×0.3 + tech×0.3
//   exp    = combatExperience   (1–10)
//   modern = techLevel         (1–10, proxy for force modernisation)
//   tech   = techLevel          (1–10, same source, represents doctrinal tech)
//
// Note: "modern" and "tech" currently share the same DB field.
//       If a separate modernisation metric is added later, swap it in.
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { cappedNormalize } from "@/lib/bp/normalize";

/** Maximum value for qualitative DB scores */
const SCORE_MAX = 10;

export function calcDoctrineRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const exp: number = data.combatExperience;
  const modern: number = data.techLevel;
  const tech: number = data.techLevel;

  const raw: number = exp * 0.4 + modern * 0.3 + tech * 0.3;

  const breakdown: Record<string, number> = {
    exp,
    modern,
    tech,
  };

  return { raw, breakdown };
}

/**
 * Doctrine raw is bounded [0, 10] — use capped normalisation.
 */
export function normalizeDoctrine(raw: number): number {
  return cappedNormalize(raw, SCORE_MAX);
}

export function scoreDoctrine(
  data: CountryRawData,
  _allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcDoctrineRaw(data);
  const normalizedValue: number = normalizeDoctrine(raw);

  return {
    component: "doctrine" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
