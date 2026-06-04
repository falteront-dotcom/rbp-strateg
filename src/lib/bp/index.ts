// ─────────────────────────────────────────────────────────────────────────────
// BP Model — Index (Public API)
// Re-exports all BP calculation modules for convenient importing
// РБП-Стратег 2.0
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  CountryRawData,
  CountryBP,
  ComponentScore,
  BPComponent,
} from "./types";

// ─── Weights ──────────────────────────────────────────────────────────────────
export { DEFAULT_WEIGHTS, type WeightsConfig } from "./weights";

// ─── Normalization utilities ──────────────────────────────────────────────────
export { minMaxNormalize, logNormalize, cappedNormalize } from "./normalize";

// ─── Component scorers (raw + normalized + full score) ───────────────────────
export { calcWeaponRaw, normalizeWeapon, scoreWeapon } from "./weapon-potential";
export { calcManpowerRaw, normalizeManpower, scoreManpower } from "./manpower-potential";
export { calcLogisticsRaw, normalizeLogistics, scoreLogistics } from "./logistics-potential";
export { calcC2Raw, normalizeC2, scoreC2 } from "./c2-potential";
export { calcEconomyRaw, scoreEconomy } from "./economy-potential";
export { calcDoctrineRaw, normalizeDoctrine, scoreDoctrine } from "./doctrine-potential";
export { calcReadinessRaw, normalizeReadiness, scoreReadiness } from "./readiness-potential";
export { calcTerrainRaw, normalizeTerrain, scoreTerrain } from "./terrain-potential";

// ─── Main calculation orchestrator ────────────────────────────────────────────
export { calculateCountryBP } from "./calculate-bp";
import { calculateCountryBP as _calcBP } from "./calculate-bp";
import type { CountryRawData, CountryBP } from "./types";
import { DEFAULT_WEIGHTS, type WeightsConfig } from "./weights";

// Helper for batch BP calculation with ranking
export function calculateAllCountriesBP(
  countries: CountryRawData[],
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): CountryBP[] {
  const results = countries.map((c) => _calcBP(c, countries, weights));
  results.sort((a, b) => b.totalBP - a.totalBP);
  results.forEach((bp: CountryBP, idx: number) => { bp.rank = idx + 1; });
  return results;
}

// ─── Sub-factor definitions ──────────────────────────────────────────────────
export {
  ALL_COMPONENT_SUB_FACTORS,
  WEAPON_SUB_FACTORS,
  MANPOWER_SUB_FACTORS,
  LOGISTICS_SUB_FACTORS,
  C2_SUB_FACTORS,
  ECONOMY_SUB_FACTORS,
  DOCTRINE_SUB_FACTORS,
  READINESS_SUB_FACTORS,
  TERRAIN_SUB_FACTORS,
  scoreSubFactors,
  aggregateSubFactors,
  type SubFactor,
  type SubFactorScore,
  type ComponentSubFactors,
} from "./sub-factors";

// ─── Detailed calculator with sub-factor scores ───────────────────────────────
export {
  calculateDetailedBP,
  getSubFactorDefinition,
  getAllComponentDefinitions,
  calculateContributionBreakdown,
  findStrengthsWeaknesses,
  findSubFactorStrengthsWeaknesses,
  getBPTier,
  compareDetailed,
  type DetailedComponentScore,
  type DetailedBPResult,
} from "./detailed-calculator";

// ─── Benchmark data for validation ────────────────────────────────────────────
export {
  BP_BENCHMARKS,
  validateBPRank,
  crossValidateGFP,
  getAllBenchmarks,
  getBenchmark,
  type BPBenchmark,
} from "./benchmarks";

// ─── Coalition reference data ────────────────────────────────────────────────
export {
  NATO,
  CSTO,
  BRICS,
  AUKUS,
  QUAD,
  SCO,
  FIVE_EYES,
  ALL_COALITIONS,
  getCoalitionByName,
  getCoalitionsForCountry,
  isCountryInCoalition,
  getCoalitionMemberCount,
  type CoalitionInfo as BPCoalitionInfo,
} from "./coalition-data";
