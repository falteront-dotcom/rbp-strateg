// ─────────────────────────────────────────────────────────────────────────────
// BP Component 7/8 – Readiness Potential (R)
//
// R = mobil×0.35 + personnel×0.35 + reserve×0.3
//   mobil     = activePersonnel + reservePersonnel  (total mobilisation pool)
//   personnel = activePersonnel
//   reserve   = reservePersonnel
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { logNormalize } from "@/lib/bp/normalize";

export function calcReadinessRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const mobil: number = data.activePersonnel + data.reservePersonnel;
  const personnel: number = data.activePersonnel;
  const reserve: number = data.reservePersonnel;

  const raw: number = mobil * 0.35 + personnel * 0.35 + reserve * 0.3;

  const breakdown: Record<string, number> = {
    mobil,
    personnel,
    reserve,
  };

  return { raw, breakdown };
}

export function normalizeReadiness(
  raw: number,
  allRaws: number[],
): number {
  const maxRaw: number = Math.max(...allRaws, 1);
  return logNormalize(raw, maxRaw);
}

export function scoreReadiness(
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcReadinessRaw(data);

  const allRaws: number[] = allData.map((d) => calcReadinessRaw(d).raw);
  const normalizedValue: number = normalizeReadiness(raw, allRaws);

  return {
    component: "readiness" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
