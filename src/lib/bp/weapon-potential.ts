// ─────────────────────────────────────────────────────────────────────────────
// BP Component 1/8 – Weapon Potential (W)
//
// W = (ground + air + naval) × quality + nuke
//   ground  = tanks + afv×0.5 + artillery×0.3 + mlrs×0.4
//   air     = aircraft + helicopters×0.4
//   naval   = navy×0.5 + subs×3 + carriers×15
//   nuke    = min(warheads / 1000 × 30, 30)
//   quality = techLevel / 5
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { minMaxNormalize, logNormalize } from "@/lib/bp/normalize";

/** Constants for nuke scoring ceiling */
const NUKE_PER_1000 = 30;
const NUKE_MAX = 30;

export function calcWeaponRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const ground: number =
    data.totalTanks + data.totalAfv * 0.5 + data.totalArtillery * 0.3 + data.totalMlrs * 0.4;

  const air: number =
    data.totalAircraft + data.totalHelicopters * 0.4;

  const naval: number =
    data.totalNavy * 0.5 + data.submarines * 3 + data.aircraftCarriers * 15;

  const nuke: number = Math.min(
    (data.nuclearWarheads / 1000) * NUKE_PER_1000,
    NUKE_MAX,
  );

  const quality: number = data.techLevel / 5;

  const raw: number = (ground + air + naval) * quality + nuke;

  const breakdown: Record<string, number> = {
    ground,
    air,
    naval,
    nuke,
    quality,
  };

  return { raw, breakdown };
}

/**
 * Normalise weapon raw against the cohort.
 * Uses log normalization for the main value (huge range between micro & superpower).
 */
export function normalizeWeapon(
  raw: number,
  allRaws: number[],
): number {
  const maxRaw: number = Math.max(...allRaws, 1);
  return logNormalize(raw, maxRaw);
}

/**
 * Full component score for weapon potential.
 */
export function scoreWeapon(
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcWeaponRaw(data);

  const allRaws: number[] = allData.map((d) => calcWeaponRaw(d).raw);
  const normalizedValue: number = normalizeWeapon(raw, allRaws);

  return {
    component: "weapon" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
