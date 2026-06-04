// ─────────────────────────────────────────────────────────────────────────────
// Detailed BP Calculator
// Produces sub-factor level scores using REAL formulas from the 8 component modules
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

import {
  ALL_COMPONENT_SUB_FACTORS,
  type SubFactorScore,
  type ComponentSubFactors,
} from "@/lib/bp/sub-factors";
import type { CountryRawData, CountryBP, BPComponent } from "@/lib/bp/types";
import { DEFAULT_WEIGHTS, type WeightsConfig } from "@/lib/bp/weights";
import { calculateCountryBP } from "@/lib/bp/calculate-bp";
import {
  calcWeaponRaw,
  normalizeWeapon,
} from "@/lib/bp/weapon-potential";
import {
  calcManpowerRaw,
  normalizeManpower,
} from "@/lib/bp/manpower-potential";
import {
  calcLogisticsRaw,
  normalizeLogistics,
} from "@/lib/bp/logistics-potential";
import {
  calcC2Raw,
  normalizeC2,
} from "@/lib/bp/c2-potential";
import {
  calcEconomyRaw,
} from "@/lib/bp/economy-potential";
import {
  calcDoctrineRaw,
  normalizeDoctrine,
} from "@/lib/bp/doctrine-potential";
import {
  calcReadinessRaw,
  normalizeReadiness,
} from "@/lib/bp/readiness-potential";
import {
  calcTerrainRaw,
  normalizeTerrain,
} from "@/lib/bp/terrain-potential";
import { logNormalize, cappedNormalize, minMaxNormalize } from "@/lib/bp/normalize";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DetailedComponentScore {
  componentKey: string;          // e.g. "weapon"
  componentName: string;        // Russian name
  componentNameEn: string;
  weight: number;               // 0-1
  rawValue: number;             // raw composite
  normalizedValue: number;      // 0-100 after cohort normalization
  weightedScore: number;        // normalizedValue * weight
  breakdown: Record<string, number>;  // raw sub-factor values from calcXxxRaw
  subFactorScores: SubFactorScore[];
}

export interface DetailedBPResult {
  isoCode: string;
  componentScores: DetailedComponentScore[];
  subFactorScores: Record<string, SubFactorScore[]>;
  overallScore: number;
  rank: number;
}

// ─── Map raw breakdown to sub-factor scores ───────────────────────────────────
// The 8 component modules already produce breakdowns with specific keys.
// We need to map those keys to the sub-factor definitions and normalize each.

function mapBreakdownToSubFactors(
  compDef: ComponentSubFactors,
  breakdown: Record<string, number>,
  allData: CountryRawData[],
): SubFactorScore[] {
  return compDef.subFactors.map((sf) => {
    // Try to find the raw value from the component's breakdown
    const rawValue = breakdown[sf.key] ?? breakdown[sf.nameEn.toLowerCase()] ?? 0;

    // Determine normalization strategy based on data type
    let normalizedScore = 0;

    // For quantitative fields (tanks, aircraft, GDP, etc.) — normalize against cohort
    const allRawValues = allData.map((d) => {
      const val = (d as unknown as Record<string, unknown>)[sf.key];
      return typeof val === "number" ? val : 0;
    });

    const maxVal = Math.max(...allRawValues, 1);

    if (maxVal > 100) {
      // Large-range quantitative data → log normalize
      normalizedScore = logNormalize(rawValue, maxVal);
    } else if (maxVal <= 15) {
      // Small-scale qualitative (1-10) → capped normalize
      normalizedScore = cappedNormalize(rawValue, 10);
    } else {
      // Medium range → min-max normalize
      normalizedScore = minMaxNormalize(rawValue, 0, maxVal);
    }

    return {
      key: sf.key,
      name: sf.name,
      weight: sf.weight,
      rawScore: normalizedScore,
      weightedScore: normalizedScore * sf.weight,
    };
  });
}

// ─── Calculate detailed component score using REAL formulas ──────────────────
function calculateDetailedComponent(
  componentKey: string,
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): DetailedComponentScore {
  const compDef = ALL_COMPONENT_SUB_FACTORS.find((c) => c.componentKey === componentKey);
  if (!compDef) {
    return {
      componentKey,
      componentName: componentKey,
      componentNameEn: componentKey,
      weight,
      rawValue: 0,
      normalizedValue: 0,
      weightedScore: 0,
      breakdown: {},
      subFactorScores: [],
    };
  }

  // ─── Use REAL calculation functions from component modules ──────────
  let rawResult: { raw: number; breakdown: Record<string, number> };
  let normalizedValue: number;

  switch (componentKey) {
    case "weaponScore": {
      rawResult = calcWeaponRaw(data);
      const allRaws = allData.map((d) => calcWeaponRaw(d).raw);
      normalizedValue = normalizeWeapon(rawResult.raw, allRaws);
      break;
    }
    case "manpowerScore": {
      rawResult = calcManpowerRaw(data);
      const allRaws = allData.map((d) => calcManpowerRaw(d).raw);
      normalizedValue = normalizeManpower(rawResult.raw, allRaws);
      break;
    }
    case "logisticsScore": {
      rawResult = calcLogisticsRaw(data);
      const allRaws = allData.map((d) => calcLogisticsRaw(d).raw);
      normalizedValue = normalizeLogistics(rawResult.raw, allRaws);
      break;
    }
    case "c2Score": {
      rawResult = calcC2Raw(data);
      normalizedValue = normalizeC2(rawResult.raw);
      break;
    }
    case "economyScore": {
      rawResult = calcEconomyRaw(data);
      // Economy uses log normalization against cohort max
      const allRaws = allData.map((d) => calcEconomyRaw(d).raw);
      const maxRaw = Math.max(...allRaws, 1);
      normalizedValue = logNormalize(rawResult.raw, maxRaw);
      break;
    }
    case "doctrineScore": {
      rawResult = calcDoctrineRaw(data);
      normalizedValue = normalizeDoctrine(rawResult.raw);
      break;
    }
    case "readinessScore": {
      rawResult = calcReadinessRaw(data);
      const allRaws = allData.map((d) => calcReadinessRaw(d).raw);
      normalizedValue = normalizeReadiness(rawResult.raw, allRaws);
      break;
    }
    case "terrainScore": {
      rawResult = calcTerrainRaw(data);
      const allRaws = allData.map((d) => calcTerrainRaw(d).raw);
      normalizedValue = normalizeTerrain(rawResult.raw, allRaws);
      break;
    }
    default: {
      rawResult = { raw: 0, breakdown: {} };
      normalizedValue = 0;
    }
  }

  // Map the real breakdown to sub-factor scores
  const subFactorScores = mapBreakdownToSubFactors(compDef, rawResult.breakdown, allData);

  return {
    componentKey,
    componentName: compDef.componentName,
    componentNameEn: compDef.componentNameEn,
    weight,
    rawValue: rawResult.raw,
    normalizedValue,
    weightedScore: normalizedValue * weight,
    breakdown: rawResult.breakdown,
    subFactorScores,
  };
}

// ─── Calculate full detailed BP ────────────────────────────────────────────────
export function calculateDetailedBP(
  country: CountryRawData,
  allCountries: CountryRawData[],
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): DetailedBPResult {
  const componentScores: DetailedComponentScore[] = [];
  const subFactorScores: Record<string, SubFactorScore[]> = {};

  for (const comp of ALL_COMPONENT_SUB_FACTORS) {
    const weightKey = comp.componentKey as keyof WeightsConfig;
    const weight = (weights[weightKey] as number) ?? 0.1;

    const detailed = calculateDetailedComponent(
      comp.componentKey,
      country,
      allCountries,
      weight,
    );
    componentScores.push(detailed);
    subFactorScores[comp.componentKey] = detailed.subFactorScores;
  }

  // Use the SAME overall calculation as calculateCountryBP
  const bpResult = calculateCountryBP(country, allCountries, weights);

  // Rank against all countries
  const allScores = allCountries.map((c) => {
    const bp = calculateCountryBP(c, allCountries, weights);
    return bp.totalBP;
  });
  const rank = allScores.filter((s) => s > bpResult.totalBP).length + 1;

  return {
    isoCode: country.isoCode,
    componentScores,
    subFactorScores,
    overallScore: Math.round(bpResult.totalBP * 10) / 10,
    rank,
  };
}

// ─── Get sub-factor definition ─────────────────────────────────────────────────
export function getSubFactorDefinition(componentKey: string): ComponentSubFactors | undefined {
  return ALL_COMPONENT_SUB_FACTORS.find((c) => c.componentKey === componentKey);
}

// ─── Get all component definitions ─────────────────────────────────────────────
export function getAllComponentDefinitions(): ComponentSubFactors[] {
  return ALL_COMPONENT_SUB_FACTORS;
}

// ─── Calculate sub-factor contribution breakdown ──────────────────────────────
export function calculateContributionBreakdown(
  result: DetailedBPResult,
): Array<{ component: string; contribution: number; percentage: number }> {
  const totalWeighted = result.componentScores.reduce((s, c) => s + c.weightedScore, 0);

  return result.componentScores.map((cs) => ({
    component: cs.componentName,
    contribution: cs.weightedScore,
    percentage: totalWeighted > 0 ? (cs.weightedScore / totalWeighted) * 100 : 0,
  }));
}

// ─── Find strengths and weaknesses ────────────────────────────────────────────
export function findStrengthsWeaknesses(
  result: DetailedBPResult,
  count: number = 3,
): { strengths: string[]; weaknesses: string[] } {
  const sorted = [...result.componentScores].sort((a, b) => b.normalizedValue - a.normalizedValue);
  const strengths = sorted.slice(0, count).map((cs) => cs.componentName);
  const weaknesses = sorted.slice(-count).map((cs) => cs.componentName);
  return { strengths, weaknesses };
}

// ─── Sub-factor level strength/weakness ──────────────────────────────────────
export function findSubFactorStrengthsWeaknesses(
  result: DetailedBPResult,
  count: number = 5,
): {
  strengths: Array<{ component: string; subFactor: string; score: number }>;
  weaknesses: Array<{ component: string; subFactor: string; score: number }>;
} {
  const allSubFactors: Array<{ component: string; subFactor: string; score: number }> = [];

  for (const [compKey, scores] of Object.entries(result.subFactorScores)) {
    const compDef = ALL_COMPONENT_SUB_FACTORS.find((c) => c.componentKey === compKey);
    const compName = compDef?.componentName ?? compKey;
    for (const sf of scores) {
      allSubFactors.push({
        component: compName,
        subFactor: sf.name,
        score: sf.rawScore,
      });
    }
  }

  const sorted = [...allSubFactors].sort((a, b) => b.score - a.score);
  return {
    strengths: sorted.slice(0, count),
    weaknesses: sorted.slice(-count).reverse(),
  };
}

// ─── Tier classification ──────────────────────────────────────────────────────
export function getBPTier(score: number): { tier: string; color: string; description: string } {
  if (score >= 85) return { tier: "КРИТИЧЕСКИЙ", color: "#ef4444", description: "Глобальная военная сверхдержава" };
  if (score >= 70) return { tier: "ВЫСОКИЙ", color: "#f59e0b", description: "Региональная держава с глобальными амбициями" };
  if (score >= 50) return { tier: "СРЕДНИЙ", color: "#22d3ee", description: "Региональная военная сила" };
  if (score >= 30) return { tier: "НИЗКИЙ", color: "#3b82f6", description: "Ограниченные военные возможности" };
  return { tier: "МИНИМАЛЬНЫЙ", color: "#6b7280", description: "Символические вооружённые силы" };
}

// ─── Detailed comparison ──────────────────────────────────────────────────────
export function compareDetailed(
  resultA: DetailedBPResult,
  resultB: DetailedBPResult,
): Array<{
  component: string;
  scoreA: number;
  scoreB: number;
  delta: number;
  advantage: "A" | "B" | "equal";
}> {
  return resultA.componentScores.map((csA, idx) => {
    const csB = resultB.componentScores[idx];
    const delta = csA.normalizedValue - (csB?.normalizedValue ?? 0);
    return {
      component: csA.componentName,
      scoreA: csA.normalizedValue,
      scoreB: csB?.normalizedValue ?? 0,
      delta: Math.round(delta * 10) / 10,
      advantage: delta > 2 ? "A" : delta < -2 ? "B" : "equal",
    };
  });
}
