// ─────────────────────────────────────────────────────────────────────────────
// BP Component 8/8 – Terrain Potential (T)
//
// T = (territory×0.5 + coast×0.5) × landlocked
//   territory = areaKm2          (strategic depth)
//   coast     = coastlineKm      (access to sea / amphibious defence)
//   landlocked = 1 if coastlineKm > 0, else 0.5
//                Landlocked countries get a 50% terrain penalty
//                (no naval access → reduced strategic flexibility)
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { logNormalize } from "@/lib/bp/normalize";

export function calcTerrainRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const territory: number = data.areaKm2;
  const coast: number = data.coastlineKm;

  // Landlocked penalty: countries with no coastline lose 50%
  const landlocked: number = data.coastlineKm > 0 ? 1.0 : 0.5;

  const raw: number = (territory * 0.5 + coast * 0.5) * landlocked;

  const breakdown: Record<string, number> = {
    territory,
    coast,
    landlocked,
  };

  return { raw, breakdown };
}

export function normalizeTerrain(
  raw: number,
  allRaws: number[],
): number {
  const maxRaw: number = Math.max(...allRaws, 1);
  return logNormalize(raw, maxRaw);
}

export function scoreTerrain(
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcTerrainRaw(data);

  const allRaws: number[] = allData.map((d) => calcTerrainRaw(d).raw);
  const normalizedValue: number = normalizeTerrain(raw, allRaws);

  return {
    component: "terrain" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
