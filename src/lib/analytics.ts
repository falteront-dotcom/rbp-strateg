// ─────────────────────────────────────────────────────────────────────────────
// Analytics Engine – Statistical analysis and forecasting for BP data
// Strict TS5, no `any`, all functions pure
// ─────────────────────────────────────────────────────────────────────────────

import { BP_COMPONENTS, type BPComponent } from "@/lib/bp/types";

// ─── Shared CountryData shape (mirrors page.tsx / API response) ─────────

export interface CountryData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;
  region: string;
  areaKm2: number;
  coastlineKm: number;
  gdpPppBn: number;
  militaryBudgetBn: number;
  defensePctGdp: number;
  populationM: number;
  activePersonnel: number;
  reservePersonnel: number;
  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalAircraft: number;
  totalHelicopters: number;
  totalNavy: number;
  submarines: number;
  nuclearWarheads: number;
  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;
  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;
  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
  bpRank: number;
}

// ─── BP component key → CountryData field mapping ────────────────────────

const BP_FIELD_MAP: Record<BPComponent, keyof CountryData> = {
  weapon: "bpWeapon",
  manpower: "bpManpower",
  logistics: "bpLogistics",
  c2: "bpC2",
  economy: "bpEconomy",
  doctrine: "bpDoctrine",
  readiness: "bpReadiness",
  terrain: "bpTerrain",
};

// ─── Return Types ─────────────────────────────────────────────────────────

export interface RankedCountry {
  isoCode: string;
  nameRu: string;
  name: string;
  side: string;
  bpTotal: number;
  rank: number;
  /** Change direction vs previous period: "up" | "down" | "same" */
  rankChange: "up" | "down" | "same";
}

export interface DistributionBin {
  label: string;
  min: number;
  max: number;
  count: number;
  countries: string[];
}

export interface CorrelationData {
  componentA: BPComponent;
  componentB: BPComponent;
  value: number;
}

export interface TrendPoint {
  year: number;
  value: number;
  /** null for actuals, "actual" | "forecast" tag */
  type: "actual" | "forecast";
}

export interface ForecastPoint {
  year: number;
  predicted: number;
  lower: number;
  upper: number;
}

export interface AnomalyInfo {
  isoCode: string;
  nameRu: string;
  name: string;
  side: string;
  actualBP: number;
  expectedBP: number;
  residual: number;
  /** "over" = stronger than economy predicts, "under" = weaker */
  direction: "over" | "under";
  /** Absolute magnitude of residual as % of expected */
  deviationPct: number;
}

export interface PowerConcentration {
  group: string;
  bpShare: number;
  countryCount: number;
}

// ─── 1. Global Rankings ──────────────────────────────────────────────────

/**
 * Rank all countries by bpTotal descending.
 * Assigns a mock rank-change indicator based on component variance
 * (countries with high variance in their components are flagged as "up",
 *  low variance as "down", stable as "same").
 */
export function getBPRanking(countries: CountryData[]): RankedCountry[] {
  const sorted = [...countries].sort((a, b) => b.bpTotal - a.bpTotal);

  return sorted.map((c, idx) => {
    const rank = idx + 1;
    // Mock rank change: use coefficient of variation across components
    const compValues = BP_COMPONENTS.map((k) => c[BP_FIELD_MAP[k]] as number);
    const mean = compValues.reduce((s, v) => s + v, 0) / compValues.length;
    const stdDev = Math.sqrt(
      compValues.reduce((s, v) => s + (v - mean) ** 2, 0) / compValues.length,
    );
    const cv = mean > 0 ? stdDev / mean : 0;

    let rankChange: "up" | "down" | "same";
    if (cv > 0.55) rankChange = "up";
    else if (cv < 0.25) rankChange = "down";
    else rankChange = "same";

    return {
      isoCode: c.isoCode,
      nameRu: c.nameRu,
      name: c.name,
      side: c.side,
      bpTotal: c.bpTotal,
      rank,
      rankChange,
    };
  });
}

// ─── 2. Top N by Component ───────────────────────────────────────────────

/**
 * Return top N countries sorted by a specific BP component score.
 */
export function getTopByComponent(
  countries: CountryData[],
  component: BPComponent,
  n: number,
): CountryData[] {
  const field = BP_FIELD_MAP[component];
  return [...countries]
    .sort((a, b) => (b[field] as number) - (a[field] as number))
    .slice(0, n);
}

// ─── 3. BP Distribution (histogram) ──────────────────────────────────────

/** Bin width for histogram */
const BIN_WIDTH = 20;

/**
 * Group countries into BP score bins.
 * Bins: 0–20, 20–40, 40–60, 60–80, 80–100, 100–120, 120+.
 */
export function getBPDistribution(countries: CountryData[]): DistributionBin[] {
  const maxBP = Math.max(...countries.map((c) => c.bpTotal), 100);
  const numBins = Math.max(1, Math.ceil((maxBP + 1) / BIN_WIDTH));

  const bins: DistributionBin[] = Array.from({ length: numBins }, (_, i) => ({
    label: `${i * BIN_WIDTH}–${(i + 1) * BIN_WIDTH}`,
    min: i * BIN_WIDTH,
    max: (i + 1) * BIN_WIDTH,
    count: 0,
    countries: [],
  }));

  for (const c of countries) {
    const binIdx = Math.min(
      Math.floor(c.bpTotal / BIN_WIDTH),
      numBins - 1,
    );
    bins[binIdx].count += 1;
    bins[binIdx].countries.push(c.nameRu);
  }

  return bins;
}

// ─── 4. Correlation Matrix ───────────────────────────────────────────────

/**
 * Compute Pearson correlation between every pair of BP components
 * across all countries.
 */
export function getCorrelationMatrix(
  countries: CountryData[],
): CorrelationData[] {
  const n = countries.length;
  if (n < 3) return [];

  const results: CorrelationData[] = [];

  for (const compA of BP_COMPONENTS) {
    for (const compB of BP_COMPONENTS) {
      const fieldA = BP_FIELD_MAP[compA];
      const fieldB = BP_FIELD_MAP[compB];

      const valuesA = countries.map((c) => c[fieldA] as number);
      const valuesB = countries.map((c) => c[fieldB] as number);

      const corr = pearsonCorrelation(valuesA, valuesB);
      results.push({
        componentA: compA,
        componentB: compB,
        value: Math.round(corr * 100) / 100,
      });
    }
  }

  return results;
}

/** Pearson correlation coefficient between two arrays */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// ─── 5. Trend Data (mock 5-year historical) ──────────────────────────────

/**
 * Generate mock 5-year historical trend for a country.
 * Uses the current BP score and applies deterministic variations
 * based on the country's ISO code hash.
 */
export function getTrendData(iso: string, countries: CountryData[]): TrendPoint[] {
  const country = countries.find((c) => c.isoCode === iso);
  if (!country) return [];

  const currentBP = country.bpTotal;
  const seed = hashCode(iso);
  const points: TrendPoint[] = [];

  const currentYear = new Date().getFullYear();

  for (let i = -4; i <= 0; i++) {
    const year = currentYear + i;
    // Deterministic variation: ±15% from current BP
    const variation = seededRandom(seed + i) * 0.15 - 0.075;
    const growth = (i + 4) * 0.02; // slight upward trend
    const value = Math.max(0, currentBP * (1 + variation + growth));
    points.push({
      year,
      value: Math.round(value * 10) / 10,
      type: i < 0 ? "actual" : "actual",
    });
  }

  return points;
}

// ─── 6. Forecast (linear extrapolation) ───────────────────────────────────

/**
 * Linear extrapolation from historical trend with confidence band.
 * Returns forecast points for `years` years into the future.
 */
export function getForecast(
  iso: string,
  countries: CountryData[],
  years: number,
): ForecastPoint[] {
  const trend = getTrendData(iso, countries);
  if (trend.length < 2) return [];

  // Simple linear regression on trend points
  const n = trend.length;
  const xMean = trend.reduce((s, p) => s + p.year, 0) / n;
  const yMean = trend.reduce((s, p) => s + p.value, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of trend) {
    num += (p.year - xMean) * (p.value - yMean);
    den += (p.year - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  // Standard error for confidence band
  let ssRes = 0;
  for (const p of trend) {
    const predicted = slope * p.year + intercept;
    ssRes += (p.value - predicted) ** 2;
  }
  const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : yMean * 0.1;

  const currentYear = new Date().getFullYear();
  const result: ForecastPoint[] = [];

  for (let i = 1; i <= years; i++) {
    const year = currentYear + i;
    const predicted = Math.max(0, slope * year + intercept);
    // Wider confidence band for further years
    const band = se * (1 + i * 0.3);
    result.push({
      year,
      predicted: Math.round(predicted * 10) / 10,
      lower: Math.round(Math.max(0, predicted - band) * 10) / 10,
      upper: Math.round((predicted + band) * 10) / 10,
    });
  }

  return result;
}

// ─── 7. Anomaly Detection ────────────────────────────────────────────────

/**
 * Detect countries where actual BP score significantly differs from
 * what their economy alone would predict.
 *
 * Uses simple linear regression: BP = f(GDP + MilitaryBudget),
 * then flags countries with large residuals.
 */
export function getAnomalies(countries: CountryData[]): AnomalyInfo[] {
  const n = countries.length;
  if (n < 5) return [];

  // Features: GDP and military budget → target: BP total
  const features = countries.map((c) => [c.gdpPppBn, c.militaryBudgetBn]);
  const targets = countries.map((c) => c.bpTotal);

  // Multivariate linear regression (2 features + intercept)
  const model = linearRegression2D(features, targets);

  const results: AnomalyInfo[] = countries.map((c, i) => {
    const expected = model.predict(features[i][0], features[i][1]);
    const residual = c.bpTotal - expected;
    const deviationPct = expected > 0 ? Math.abs(residual / expected) * 100 : 0;

    return {
      isoCode: c.isoCode,
      nameRu: c.nameRu,
      name: c.name,
      side: c.side,
      actualBP: c.bpTotal,
      expectedBP: Math.round(expected * 10) / 10,
      residual: Math.round(residual * 10) / 10,
      direction: residual > 0 ? "over" as const : "under" as const,
      deviationPct: Math.round(deviationPct * 10) / 10,
    };
  });

  // Sort by absolute deviation, return top anomalies (>15% deviation)
  return results
    .filter((r) => r.deviationPct > 15)
    .sort((a, b) => b.deviationPct - a.deviationPct);
}

/** Simple 2-feature linear regression (OLS) */
function linearRegression2D(
  features: number[][],
  targets: number[],
): { predict: (x1: number, x2: number) => number; r2: number } {
  const n = features.length;
  if (n < 3) return { predict: () => 0, r2: 0 };

  // Normal equations for y = b0 + b1*x1 + b2*x2
  const x1 = features.map((f) => f[0]);
  const x2 = features.map((f) => f[1]);
  const y = targets;

  const x1Mean = x1.reduce((s, v) => s + v, 0) / n;
  const x2Mean = x2.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  let s11 = 0, s12 = 0, s22 = 0, s1y = 0, s2y = 0;

  for (let i = 0; i < n; i++) {
    const d1 = x1[i] - x1Mean;
    const d2 = x2[i] - x2Mean;
    const dy = y[i] - yMean;
    s11 += d1 * d1;
    s12 += d1 * d2;
    s22 += d2 * d2;
    s1y += d1 * dy;
    s2y += d2 * dy;
  }

  const det = s11 * s22 - s12 * s12;
  const b1 = det !== 0 ? (s22 * s1y - s12 * s2y) / det : 0;
  const b2 = det !== 0 ? (s11 * s2y - s12 * s1y) / det : 0;
  const b0 = yMean - b1 * x1Mean - b2 * x2Mean;

  // R²
  const ssTot = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = b0 + b1 * x1[i] + b2 * x2[i];
    ssRes += (y[i] - pred) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    predict: (v1: number, v2: number) => Math.max(0, b0 + b1 * v1 + b2 * v2),
    r2,
  };
}

// ─── 8. Power Concentration ──────────────────────────────────────────────

/**
 * Calculate what percentage of global BP is held by top-5, top-10, top-25
 * countries, plus "rest".
 */
export function getPowerConcentration(
  countries: CountryData[],
): PowerConcentration[] {
  const totalBP = countries.reduce((s, c) => s + c.bpTotal, 0);
  if (totalBP === 0) return [];

  const sorted = [...countries].sort((a, b) => b.bpTotal - a.bpTotal);

  const groups: Array<{ label: string; count: number }> = [
    { label: "Топ-5", count: 5 },
    { label: "Топ-10", count: 10 },
    { label: "Топ-25", count: 25 },
  ];

  const results: PowerConcentration[] = groups.map((g) => {
    const groupBP = sorted
      .slice(0, g.count)
      .reduce((s, c) => s + c.bpTotal, 0);
    return {
      group: g.label,
      bpShare: Math.round((groupBP / totalBP) * 1000) / 10,
      countryCount: Math.min(g.count, sorted.length),
    };
  });

  // Add "rest" group
  const top25BP = sorted.slice(0, 25).reduce((s, c) => s + c.bpTotal, 0);
  const restBP = totalBP - top25BP;
  results.push({
    group: "Остальные",
    bpShare: Math.round((restBP / totalBP) * 1000) / 10,
    countryCount: Math.max(0, sorted.length - 25),
  });

  return results;
}

// ─── Utility: deterministic hash & seeded random ─────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  // Simple LCG for deterministic pseudo-random
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// ─── Component metadata (for UI labels) ──────────────────────────────────

export const COMPONENT_LABELS: Record<BPComponent, string> = {
  weapon: "Оружие",
  manpower: "Личный Состав",
  logistics: "Логистика",
  c2: "Управление",
  economy: "Экономика",
  doctrine: "Доктрина",
  readiness: "Готовность",
  terrain: "География",
};

export const COMPONENT_COLORS: Record<BPComponent, string> = {
  weapon: "#ef4444",
  manpower: "#3b82f6",
  logistics: "#22c55e",
  c2: "#a855f7",
  economy: "#eab308",
  doctrine: "#ec4899",
  readiness: "#f97316",
  terrain: "#06b6d4",
};
