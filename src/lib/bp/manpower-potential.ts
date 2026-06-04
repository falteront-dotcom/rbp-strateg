// ─────────────────────────────────────────────────────────────────────────────
// BP Component 2/8 – Manpower Potential (M)
//
// M = personnel×0.4 + reserve×0.3 + quality×0.3
//   personnel = activePersonnel
//   reserve   = reservePersonnel
//   quality   = moraleIndex × (fitForServiceM / populationM)  (normalised proxy)
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { logNormalize } from "@/lib/bp/normalize";

export function calcManpowerRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const personnel: number = data.activePersonnel;

  const reserve: number = data.reservePersonnel;

  // Quality proxy: morale × fitness ratio, scaled to similar magnitude
  const fitnessRatio: number =
    data.populationM > 0 ? data.fitForServiceM / data.populationM : 0;
  const quality: number = data.moraleIndex * fitnessRatio * 1_000_000;

  const raw: number = personnel * 0.4 + reserve * 0.3 + quality * 0.3;

  const breakdown: Record<string, number> = {
    personnel,
    reserve,
    quality,
  };

  return { raw, breakdown };
}

export function normalizeManpower(
  raw: number,
  allRaws: number[],
): number {
  const maxRaw: number = Math.max(...allRaws, 1);
  return logNormalize(raw, maxRaw);
}

export function scoreManpower(
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcManpowerRaw(data);

  const allRaws: number[] = allData.map((d) => calcManpowerRaw(d).raw);
  const normalizedValue: number = normalizeManpower(raw, allRaws);

  return {
    component: "manpower" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
