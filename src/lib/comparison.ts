// ─────────────────────────────────────────────────────────────────────────────
// Country Comparison – Core Types, Comparison Logic, Utility Functions
// Strict TS5, no `any`, explicit returns on every function
// ─────────────────────────────────────────────────────────────────────────────

/** 8 BP component keys matching the DB schema */
export const COMPARISON_BP_COMPONENTS = [
  "bpWeapon",
  "bpManpower",
  "bpLogistics",
  "bpC2",
  "bpEconomy",
  "bpDoctrine",
  "bpReadiness",
  "bpTerrain",
] as const;

export type ComparisonBPComponent = (typeof COMPARISON_BP_COMPONENTS)[number];

/** Russian labels for the 8 BP components */
export const COMPARISON_BP_LABELS: Record<ComparisonBPComponent, string> = {
  bpWeapon: "Оружие",
  bpManpower: "Личный Состав",
  bpLogistics: "Логистика",
  bpC2: "Управление",
  bpEconomy: "Экономика",
  bpDoctrine: "Доктрина",
  bpReadiness: "Готовность",
  bpTerrain: "География",
};

/** Abbreviated labels for radar chart display */
export const COMPARISON_BP_SHORT_LABELS: Record<ComparisonBPComponent, string> = {
  bpWeapon: "ОРУЖ",
  bpManpower: "Л/С",
  bpLogistics: "ЛОГ",
  bpC2: "ЦУР",
  bpEconomy: "ЭКН",
  bpDoctrine: "ДОКТ",
  bpReadiness: "ГОТ",
  bpTerrain: "ГЕО",
};

/** Country data shape for comparison — matches the /api/countries response */
export interface CountryCompareData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;

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
  totalMlrs: number;
  totalAircraft: number;
  totalHelicopters: number;
  totalNavy: number;
  aircraftCarriers: number;
  submarines: number;
  nuclearWarheads: number;

  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;

  fitForServiceM: number;
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
}

/** Per-component delta between two countries */
export interface ComponentDelta {
  component: ComparisonBPComponent;
  label: string;
  valueA: number;
  valueB: number;
  delta: number;
  deltaPercent: number;
  /** Which country has the advantage: index of leader, -1 for tie */
  advantage: number;
}

/** Key metric comparison item */
export interface MetricDelta {
  label: string;
  values: number[];
  unit: string;
  /** Index of the winner, -1 for tie */
  winner: number;
}

/** Full comparison result across multiple countries */
export interface ComparisonResult {
  countries: CountryCompareData[];
  componentDeltas: ComponentDelta[][];
  metricDeltas: MetricDelta[];
  /** Index of the overall BP leader, -1 for tie */
  overallLeader: number;
  totalBPValues: number[];
  /** Pairwise comparison results for each consecutive pair */
  pairwiseResults: PairwiseResult[];
}

/** Pairwise comparison between two consecutive countries */
export interface PairwiseResult {
  countryAIndex: number;
  countryBIndex: number;
  totalDelta: number;
  overallAdvantage: number; // 0 = A wins, 1 = B wins, -1 = tie
}

/** Side-based color map (OKLCH) for radar overlays */
export const SIDE_COLORS: Record<string, string> = {
  NATO: "oklch(70% 0.18 240)",
  RUS: "oklch(65% 0.25 25)",
  CHINA: "oklch(80% 0.2 80)",
  UKR: "oklch(65% 0.15 90)",
  NEUTRAL: "oklch(65% 0.05 240)",
};

/** Side-based stroke colors for Recharts (hex for compatibility) */
export const SIDE_STROKE_COLORS: Record<string, string> = {
  NATO: "#3b82f6",
  RUS: "#ef4444",
  CHINA: "#eab308",
  UKR: "#fbbf24",
  NEUTRAL: "#94a3b8",
};

/** Side-based fill opacity colors for Recharts */
export const SIDE_FILL_COLORS: Record<string, string> = {
  NATO: "#3b82f6",
  RUS: "#ef4444",
  CHINA: "#eab308",
  UKR: "#fbbf24",
  NEUTRAL: "#94a3b8",
};

/** Side-based Tailwind text classes */
export const SIDE_TEXT_CLASSES: Record<string, string> = {
  NATO: "text-tactical-nato",
  RUS: "text-tactical-rus",
  CHINA: "text-tactical-china",
  UKR: "text-tactical-ukr",
  NEUTRAL: "text-slate-400",
};

/** Side-based Tailwind bg/border classes */
export const SIDE_BG_CLASSES: Record<string, string> = {
  NATO: "bg-tactical-nato/10 border-tactical-nato/30",
  RUS: "bg-tactical-rus/10 border-tactical-rus/30",
  CHINA: "bg-tactical-china/10 border-tactical-china/30",
  UKR: "bg-tactical-ukr/10 border-tactical-ukr/30",
  NEUTRAL: "bg-slate-400/10 border-slate-400/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// Comparison Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare 2–4 countries across all BP components.
 * Returns per-pair component deltas, metric deltas, and overall leadership.
 *
 * @param countries - Array of 2–4 CountryCompareData objects
 * @returns ComparisonResult with all deltas and leadership indicators
 */
export function compareCountriesList(
  countries: CountryCompareData[],
): ComparisonResult {
  if (countries.length < 2 || countries.length > 4) {
    throw new Error("compareCountriesList requires 2–4 countries");
  }

  // ─── Total BP values & overall leader ─────────────────────────────────
  const totalBPValues = countries.map((c) => c.bpTotal);
  const maxBP = Math.max(...totalBPValues);
  const bpLeaders = totalBPValues.reduce<number[]>((acc, val, idx) => {
    if (val === maxBP) acc.push(idx);
    return acc;
  }, []);
  const overallLeader = bpLeaders.length === countries.length ? -1 : bpLeaders[0];

  // ─── Pairwise component deltas ────────────────────────────────────────
  const pairwiseResults: PairwiseResult[] = [];
  const componentDeltas: ComponentDelta[][] = [];

  for (let i = 0; i < countries.length - 1; i++) {
    const a = countries[i];
    const b = countries[i + 1];
    const deltas: ComponentDelta[] = COMPARISON_BP_COMPONENTS.map((comp) => {
      const valueA = a[comp] as number;
      const valueB = b[comp] as number;
      const delta = Number((valueA - valueB).toFixed(2));
      const deltaPercent =
        valueB !== 0 ? Number(((delta / valueB) * 100).toFixed(1)) : 0;
      const advantage: number =
        Math.abs(delta) < 0.5 ? -1 : delta > 0 ? i : i + 1;

      return {
        component: comp,
        label: COMPARISON_BP_LABELS[comp],
        valueA,
        valueB,
        delta,
        deltaPercent,
        advantage,
      };
    });

    componentDeltas.push(deltas);

    const totalDelta = Number((a.bpTotal - b.bpTotal).toFixed(2));
    const overallAdvantage: number =
      Math.abs(totalDelta) < 1 ? -1 : totalDelta > 0 ? i : i + 1;

    pairwiseResults.push({
      countryAIndex: i,
      countryBIndex: i + 1,
      totalDelta,
      overallAdvantage,
    });
  }

  // ─── Key metric deltas ────────────────────────────────────────────────
  const metricDeltas: MetricDelta[] = buildMetricDeltas(countries);

  return {
    countries,
    componentDeltas,
    metricDeltas,
    overallLeader,
    totalBPValues,
    pairwiseResults,
  };
}

/**
 * Build key metric deltas across all selected countries.
 * Compares military budget, active personnel, tanks, aircraft, navy, nukes.
 */
function buildMetricDeltas(countries: CountryCompareData[]): MetricDelta[] {
  const metrics: Array<{
    label: string;
    key: keyof CountryCompareData;
    unit: string;
  }> = [
    { label: "Воен. Бюджет", key: "militaryBudgetBn", unit: "$B" },
    { label: "Актив. Состав", key: "activePersonnel", unit: "чел" },
    { label: "Танки", key: "totalTanks", unit: "шт" },
    { label: "Авиация", key: "totalAircraft", unit: "шт" },
    { label: "Флот", key: "totalNavy", unit: "шт" },
    { label: "Ядерные БГ", key: "nuclearWarheads", unit: "шт" },
    { label: "ВВП (ППС)", key: "gdpPppBn", unit: "$B" },
    { label: "Население", key: "populationM", unit: "M" },
  ];

  return metrics.map(({ label, key, unit }) => {
    const values = countries.map((c) => c[key] as number);
    const maxVal = Math.max(...values);
    const winners = values.reduce<number[]>((acc, val, idx) => {
      if (val === maxVal) acc.push(idx);
      return acc;
    }, []);
    const winner = winners.length === countries.length ? -1 : winners[0];

    return { label, values, unit, winner };
  });
}

/**
 * Convert ISO-3166-1 alpha-3 code to flag emoji.
 */
export function isoToFlag(iso: string): string {
  if (iso.length !== 3) return "🏳️";
  const base = 0x1f1e6;
  const codePointA = 65;
  const ch1 = iso.charCodeAt(0) - codePointA + base;
  const ch2 = iso.charCodeAt(1) - codePointA + base;
  return String.fromCodePoint(ch1, ch2);
}

/**
 * Format large numbers with K/M/B suffixes.
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Get BP tier label in Russian.
 */
export function getBPTierLabel(score: number): string {
  if (score >= 80) return "КРИТИЧЕСКИЙ";
  if (score >= 60) return "ВЫСОКИЙ";
  if (score >= 40) return "СРЕДНИЙ";
  if (score >= 20) return "НИЗКИЙ";
  return "МИНИМАЛЬНЫЙ";
}

/**
 * Get BP tier color class.
 */
export function getBPTierColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-teal-400";
  if (score >= 20) return "text-cyan-400";
  return "text-slate-400";
}

/**
 * Derive a side color index (0-based) for radar chart data key mapping.
 */
export function getSideColorIndex(side: string): number {
  const map: Record<string, number> = { NATO: 0, RUS: 1, CHINA: 2, UKR: 3, NEUTRAL: 4 };
  return map[side] ?? 3;
}
