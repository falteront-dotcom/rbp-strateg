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
import type { CountryRawData, BPComponent } from "@/lib/bp/types";
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


const SCORE_KEY_TO_BP_COMPONENT: Record<string, BPComponent> = {
  weapon: "weapon",
  weaponScore: "weapon",
  manpower: "manpower",
  manpowerScore: "manpower",
  logistics: "logistics",
  logisticsScore: "logistics",
  c2: "c2",
  c2Score: "c2",
  economy: "economy",
  economyScore: "economy",
  doctrine: "doctrine",
  doctrineScore: "doctrine",
  readiness: "readiness",
  readinessScore: "readiness",
  terrain: "terrain",
  terrainScore: "terrain",
};

function toBPComponent(componentKey: string): BPComponent | null {
  return SCORE_KEY_TO_BP_COMPONENT[componentKey] ?? null;
}

function budgetPerSoldier(data: CountryRawData): number {
  return data.activePersonnel > 0 ? (data.militaryBudgetBn * 1_000_000_000) / data.activePersonnel : 0;
}

function allianceBonus(data: CountryRawData): number {
  if (data.coalition === "NATO" || data.side === "NATO") return 20;
  if (data.coalition === "AUKUS") return 18;
  if (data.coalition === "CSTO") return 15;
  if (data.coalition === "BRICS") return 10;
  return 0;
}

function climateDifficultyScore(data: CountryRawData): number {
  const zone = data.climateZone.toLowerCase();
  if (zone.includes("temperate") || zone.includes("mixed")) return 80;
  if (zone.includes("continental") || zone.includes("mediterranean")) return 65;
  if (zone.includes("arctic") || zone.includes("desert") || zone.includes("tropical")) return 45;
  return 60;
}

function missileProxy(data: CountryRawData): number {
  const nuclearBonus = data.nuclearWarheads > 0 ? 35 : 0;
  const artilleryMass = Math.min(30, (data.totalArtillery + data.totalMlrs * 1.5) / 300);
  const techBonus = Math.min(25, data.techLevel * 2.5);
  return nuclearBonus + artilleryMass + techBonus;
}

function navalWeighted(data: CountryRawData): number {
  return data.totalNavy * 0.5 + data.submarines * 3 + data.aircraftCarriers * 15;
}

function subFactorRawValue(
  component: BPComponent,
  sfKey: string,
  data: CountryRawData,
  breakdown: Record<string, number>,
): number {
  const activeReserveRatio = data.activePersonnel + data.reservePersonnel > 0
    ? data.activePersonnel / (data.activePersonnel + data.reservePersonnel)
    : 0;
  const logisticsMass = data.ports * 0.25 + data.airfields * 0.25 + data.oilProductionKbd * 0.3 + data.merchantFleet * 0.2;
  const economyMass = data.gdpPppBn * 0.3 + data.militaryBudgetBn * 0.35 + data.defensePctGdp * 0.2;
  const strategicDepth = Math.sqrt(Math.max(data.areaKm2, 0) / Math.PI);

  switch (component) {
    case "weapon":
      switch (sfKey) {
        case "tankScore": return data.totalTanks;
        case "aircraftScore": return data.totalAircraft + data.totalHelicopters * 0.4;
        case "navyScore": return navalWeighted(data);
        case "artilleryScore": return data.totalArtillery + data.totalMlrs * 1.5;
        case "missileScore": return missileProxy(data);
        case "nuclearScore": return data.nuclearWarheads;
        default: return breakdown[sfKey] ?? 0;
      }
    case "manpower":
      switch (sfKey) {
        case "activePersonnelScore": return data.activePersonnel;
        case "reservePersonnelScore": return data.reservePersonnel;
        case "paramilitaryScore": return Math.max(0, data.reservePersonnel * 0.12);
        case "personnelQualityScore": return data.moraleIndex * 10 + Math.min(25, budgetPerSoldier(data) / 20_000) + data.combatExperience * 2;
        default: return breakdown[sfKey] ?? 0;
      }
    case "logistics":
      switch (sfKey) {
        case "portScore": return data.ports;
        case "airportScore": return data.airfields;
        case "roadwayScore": return Math.sqrt(Math.max(data.areaKm2, 0)) * Math.max(1, data.populationM / 10);
        case "railwayScore": return Math.sqrt(Math.max(data.areaKm2, 0)) * Math.max(1, data.gdpPppBn / 500);
        case "merchantFleetScore": return data.merchantFleet;
        default: return breakdown[sfKey] ?? 0;
      }
    case "c2":
      switch (sfKey) {
        case "c4iScore": return data.c2Capability * 10 + data.techLevel * 4;
        case "ewScore": return data.ewCapability * 10;
        case "cyberScore": return data.techLevel * 10 + (data.side === "NATO" ? 12 : 0);
        case "satelliteScore": return data.techLevel * 5 + (data.nuclearWarheads > 0 ? 20 : 0) + (data.gdpPppBn > 5_000 ? 15 : 0);
        case "moraleScore": return data.moraleIndex * 10 + data.combatExperience * 2;
        default: return breakdown[sfKey] ?? 0;
      }
    case "economy":
      switch (sfKey) {
        case "gdpScore": return data.gdpPppBn;
        case "budgetScore": return data.militaryBudgetBn;
        case "defenseGDPScore": return data.defensePctGdp;
        case "oilScore": return data.oilProductionKbd;
        case "industrialScore": return data.gdpPppBn * 0.35 + data.techLevel * 100 + data.militaryBudgetBn * 0.5;
        default: return breakdown[sfKey] ?? 0;
      }
    case "doctrine":
      switch (sfKey) {
        case "postureScore": return data.totalTanks > data.totalAircraft * 1.5 ? 70 : data.nuclearWarheads > 0 ? 80 : 60;
        case "allianceScore": return allianceBonus(data);
        case "experienceScore": return data.combatExperience * 10;
        case "modernizationScore": return data.techLevel * 10 + Math.min(30, budgetPerSoldier(data) / 30_000);
        default: return breakdown[sfKey] ?? 0;
      }
    case "readiness":
      switch (sfKey) {
        case "activeReserveRatioScore": return activeReserveRatio;
        case "modernizationReadinessScore": return data.techLevel * 10 + Math.min(25, budgetPerSoldier(data) / 25_000);
        case "exerciseScore": return allianceBonus(data) + data.combatExperience * 8 + Math.min(20, data.militaryBudgetBn / 20);
        case "supplyScore": return economyMass * 0.2 + logisticsMass * 0.4;
        default: return breakdown[sfKey] ?? 0;
      }
    case "terrain":
      switch (sfKey) {
        case "areaScore": return data.areaKm2;
        case "borderScore": return strategicDepth > 0 ? data.areaKm2 / strategicDepth : 0;
        case "coastlineScore": return data.coastlineKm;
        case "climateScore": return climateDifficultyScore(data);
        case "depthScore": return strategicDepth;
        default: return breakdown[sfKey] ?? 0;
      }
    default:
      return breakdown[sfKey] ?? 0;
  }
}

// ─── Map raw breakdown to sub-factor scores ───────────────────────────────────
// The 8 component modules already produce breakdowns with specific keys.
// We need to map those keys to the sub-factor definitions and normalize each.

function mapBreakdownToSubFactors(
  component: BPComponent,
  compDef: ComponentSubFactors,
  data: CountryRawData,
  breakdown: Record<string, number>,
  allData: CountryRawData[],
): SubFactorScore[] {
  return compDef.subFactors.map((sf) => {
    const rawValue = subFactorRawValue(component, sf.key, data, breakdown);

    const allRawValues = allData.map((country) => {
      const rawForCountry = subFactorRawValue(component, sf.key, country, {});
      return Number.isFinite(rawForCountry) ? rawForCountry : 0;
    });

    const maxVal = Math.max(...allRawValues, rawValue, 1);
    let normalizedScore: number;

    if (sf.key === "activeReserveRatioScore") {
      normalizedScore = minMaxNormalize(rawValue, 0, Math.max(maxVal, 0.01));
    } else if (maxVal > 100) {
      normalizedScore = logNormalize(rawValue, maxVal);
    } else if (maxVal <= 15) {
      normalizedScore = cappedNormalize(rawValue, 10);
    } else {
      normalizedScore = minMaxNormalize(rawValue, 0, maxVal);
    }

    return {
      key: sf.key,
      name: sf.name,
      weight: sf.weight,
      rawScore: Math.round(normalizedScore * 10) / 10,
      weightedScore: Math.round(normalizedScore * sf.weight * 10) / 10,
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
  const bpComponent = toBPComponent(componentKey);
  const compDef = ALL_COMPONENT_SUB_FACTORS.find((c) => c.componentKey === componentKey || toBPComponent(c.componentKey) === bpComponent);
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

  switch (bpComponent) {
    case "weapon": {
      rawResult = calcWeaponRaw(data);
      const allRaws = allData.map((d) => calcWeaponRaw(d).raw);
      normalizedValue = normalizeWeapon(rawResult.raw, allRaws);
      break;
    }
    case "manpower": {
      rawResult = calcManpowerRaw(data);
      const allRaws = allData.map((d) => calcManpowerRaw(d).raw);
      normalizedValue = normalizeManpower(rawResult.raw, allRaws);
      break;
    }
    case "logistics": {
      rawResult = calcLogisticsRaw(data);
      const allRaws = allData.map((d) => calcLogisticsRaw(d).raw);
      normalizedValue = normalizeLogistics(rawResult.raw, allRaws);
      break;
    }
    case "c2": {
      rawResult = calcC2Raw(data);
      normalizedValue = normalizeC2(rawResult.raw);
      break;
    }
    case "economy": {
      rawResult = calcEconomyRaw(data);
      // Economy uses log normalization against cohort max
      const allRaws = allData.map((d) => calcEconomyRaw(d).raw);
      const maxRaw = Math.max(...allRaws, 1);
      normalizedValue = logNormalize(rawResult.raw, maxRaw);
      break;
    }
    case "doctrine": {
      rawResult = calcDoctrineRaw(data);
      normalizedValue = normalizeDoctrine(rawResult.raw);
      break;
    }
    case "readiness": {
      rawResult = calcReadinessRaw(data);
      const allRaws = allData.map((d) => calcReadinessRaw(d).raw);
      normalizedValue = normalizeReadiness(rawResult.raw, allRaws);
      break;
    }
    case "terrain": {
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
  const subFactorScores = mapBreakdownToSubFactors(bpComponent ?? "weapon", compDef, data, rawResult.breakdown, allData);

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
    const bpComponent = toBPComponent(comp.componentKey);
    const weight = bpComponent ? weights[bpComponent] : 0;

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
