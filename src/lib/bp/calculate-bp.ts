// ─────────────────────────────────────────────────────────────────────────────
// BP Model – calculate-bp.ts
// Orchestrates all 8 component scorers into a full CountryBP profile
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, CountryBP, ComponentScore, BPComponent } from "@/lib/bp/types";
import { DEFAULT_WEIGHTS, type WeightsConfig } from "@/lib/bp/weights";
import { scoreWeapon } from "@/lib/bp/weapon-potential";
import { scoreManpower } from "@/lib/bp/manpower-potential";
import { scoreLogistics } from "@/lib/bp/logistics-potential";
import { scoreC2 } from "@/lib/bp/c2-potential";
import { scoreEconomy } from "@/lib/bp/economy-potential";
import { scoreDoctrine } from "@/lib/bp/doctrine-potential";
import { scoreReadiness } from "@/lib/bp/readiness-potential";
import { scoreTerrain } from "@/lib/bp/terrain-potential";

/**
 * Calculate the full BP profile for a single country.
 *
 * @param data     - The country's raw DB data
 * @param allData  - Full cohort (needed for min-max / log normalisation across countries)
 * @param weights  - Optional override weights (defaults to DEFAULT_WEIGHTS)
 * @returns CountryBP with all 8 component scores + total
 */
export function calculateCountryBP(
  data: CountryRawData,
  allData: CountryRawData[],
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): CountryBP {
  const w: WeightsConfig = weights;

  const components: Record<BPComponent, ComponentScore> = {
    weapon: scoreWeapon(data, allData, w.weapon),
    manpower: scoreManpower(data, allData, w.manpower),
    logistics: scoreLogistics(data, allData, w.logistics),
    c2: scoreC2(data, allData, w.c2),
    economy: scoreEconomy(data, allData, w.economy),
    doctrine: scoreDoctrine(data, allData, w.doctrine),
    readiness: scoreReadiness(data, allData, w.readiness),
    terrain: scoreTerrain(data, allData, w.terrain),
  };

  const totalBP: number = Object.values(components).reduce(
    (sum, comp) => sum + comp.weightedScore,
    0,
  );

  return {
    isoCode: data.isoCode,
    name: data.name,
    totalBP,
    components,
    rank: null, // assigned later by calculateAllCountriesBP
  };
}
