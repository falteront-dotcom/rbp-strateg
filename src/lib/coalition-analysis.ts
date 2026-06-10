// ─────────────────────────────────────────────────────────────────────────────
// Coalition Analysis – Strategic Tab Logic
// Pure functions for coalition aggregation, comparison, and scenario simulation
// Strict TS5, no `any`, explicit returns on every function
// ─────────────────────────────────────────────────────────────────────────────

import type { Country } from "@/db/schema";import { type CoalitionBPComponent } from "@/lib/coalitions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Metadata for a single coalition alliance */
export interface CoalitionInfo {
  name: string;
  side: string;
  color: string;
  colorHex: string;
  textClass: string;
  bgClass: string;
  members: readonly string[];
}

/** Aggregated BP profile — sums (not averages) across members */
export interface AggregateBP {
  coalitionName: string;
  memberCount: number;
  totalBP: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
}

/** Military hardware balance per coalition */
export interface MilitaryBalance {
  coalitionName: string;
  totalTanks: number;
  totalAircraft: number;
  totalNavy: number;
  submarines: number;
  totalMlrs: number;
  totalArtillery: number;
}

/** Full comparison data across multiple coalitions */
export interface CoalitionComparisonData {
  aggregates: AggregateBP[];
  militaryBalance: MilitaryBalance[];
  /** Each coalition's average BP per member */
  averageBP: Array<{ coalitionName: string; avgBP: number }>;
}

/** What-if scenario: country switches coalition */
export interface SwitchScenario {
  countryIso: string;
  currentCoalition: string;
  targetCoalition: string;
  /** Aggregate without this country in current coalition */
  currentWithout: AggregateBP;
  /** Aggregate with this country added to target coalition */
  targetWith: AggregateBP;
  /** Delta to current coalition total (negative = loss) */
  currentDelta: number;
  /** Delta to target coalition total (positive = gain) */
  targetDelta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coalition Registry – Extended with QUAD and Shanghai Cooperation
// ─────────────────────────────────────────────────────────────────────────────

export const COALITION_REGISTRY: ReadonlyMap<string, CoalitionInfo> = new Map([
  [
    "NATO",
    {
      name: "NATO",
      side: "NATO",
      color: "oklch(70% 0.18 240)",
      colorHex: "#3b82f6",
      textClass: "text-tactical-nato",
      bgClass: "bg-tactical-nato/10 border-tactical-nato/30",
      members: [
        "USA", "GBR", "FRA", "DEU", "ITA", "ESP", "TUR", "CAN", "POL", "NLD",
        "BEL", "NOR", "GRC", "PRT", "CZE", "HUN", "ROU", "BGR", "HRV", "SVK",
        "SVN", "LTU", "LVA", "EST", "FIN", "SWE",
      ],
    },
  ],
  [
    "CSTO",
    {
      name: "CSTO",
      side: "RUS",
      color: "oklch(65% 0.25 25)",
      colorHex: "#ef4444",
      textClass: "text-tactical-rus",
      bgClass: "bg-tactical-rus/10 border-tactical-rus/30",
      members: ["RUS", "BLR", "ARM", "KAZ", "KGZ", "TJK"],
    },
  ],
  [
    "BRICS",
    {
      name: "BRICS",
      side: "CHINA",
      color: "oklch(80% 0.2 80)",
      colorHex: "#f59e0b",
      textClass: "text-tactical-china",
      bgClass: "bg-tactical-china/10 border-tactical-china/30",
      members: ["CHN", "RUS", "IND", "BRA", "ZAF", "SAU", "EGY", "ETH", "IRN", "ARE"],
    },
  ],
  [
    "AUKUS",
    {
      name: "AUKUS",
      side: "NATO",
      color: "oklch(75% 0.15 180)",
      colorHex: "#2dd4bf",
      textClass: "text-teal-400",
      bgClass: "bg-teal-400/10 border-teal-400/30",
      members: ["AUS", "GBR", "USA"],
    },
  ],
  [
    "QUAD",
    {
      name: "QUAD",
      side: "NATO",
      color: "oklch(70% 0.18 300)",
      colorHex: "#a78bfa",
      textClass: "text-violet-400",
      bgClass: "bg-violet-400/10 border-violet-400/30",
      members: ["USA", "JPN", "AUS", "IND"],
    },
  ],
  [
    "SCO",
    {
      name: "SCO",
      side: "CHINA",
      color: "oklch(70% 0.18 150)",
      colorHex: "#34d399",
      textClass: "text-emerald-400",
      bgClass: "bg-emerald-400/10 border-emerald-400/30",
      members: ["CHN", "RUS", "IND", "PAK", "KAZ", "KGZ", "TJK", "UZB", "IRN"],
    },
  ],
]);

/** All coalition names in display order */
export const COALITION_NAMES: readonly string[] = [
  "NATO", "CSTO", "BRICS", "AUKUS", "QUAD", "SCO",
];

/** Russian labels for coalitions */
export const COALITION_LABELS_RU: Record<string, string> = {
  NATO: "НАТО",
  CSTO: "ОДКБ",
  BRICS: "БРИКС",
  AUKUS: "AUKUS",
  QUAD: "QUAD",
  SCO: "ШОС",
};

/** Russian labels for BP components (re-export-friendly) */
export const BP_LABELS_RU: Record<CoalitionBPComponent, string> = {
  bpWeapon: "Оружие",
  bpManpower: "Личный Состав",
  bpLogistics: "Логистика",
  bpC2: "Управление",
  bpEconomy: "Экономика",
  bpDoctrine: "Доктрина",
  bpReadiness: "Готовность",
  bpTerrain: "География",
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine which coalition a country belongs to.
 * Falls back to side-based heuristic if no explicit coalition membership.
 */
export function getCountryCoalition(
  iso: string,
  side: string,
): CoalitionInfo {
  // Check explicit membership first
  for (const [, info] of COALITION_REGISTRY) {
    if (info.members.includes(iso)) {
      return info;
    }
  }

  // Fallback: infer from side
  const fallbackMap: Record<string, string> = {
    NATO: "NATO",
    RUS: "CSTO",
    CHINA: "BRICS",
    UKR: "NATO",
    NEUTRAL: "BRICS",
  };

  const fallbackName = fallbackMap[side] ?? "BRICS";
  return COALITION_REGISTRY.get(fallbackName) ?? COALITION_REGISTRY.get("NATO")!;
}

/**
 * Get all member countries of a coalition from the full dataset.
 * Returns actual Country records that match the coalition's ISO codes.
 */
export function getCoalitionMembers(
  coalitionName: string,
  countries: Country[],
): Country[] {
  const info = COALITION_REGISTRY.get(coalitionName);
  if (!info) return [];

  const isoSet = new Set(info.members);
  return countries
    .filter((c) => isoSet.has(c.isoCode))
    .sort((a, b) => (b.bpTotal ?? 0) - (a.bpTotal ?? 0));
}

/**
 * Aggregate BP scores for a set of member countries.
 * Returns SUMMED values (not averaged) for each component + total.
 */
export function getCoalitionAggregateBP(members: Country[]): AggregateBP {
  const empty: AggregateBP = {
    coalitionName: "",
    memberCount: 0,
    totalBP: 0,
    bpWeapon: 0,
    bpManpower: 0,
    bpLogistics: 0,
    bpC2: 0,
    bpEconomy: 0,
    bpDoctrine: 0,
    bpReadiness: 0,
    bpTerrain: 0,
  };

  if (members.length === 0) return empty;

  let totalBP = 0;
  let bpWeapon = 0;
  let bpManpower = 0;
  let bpLogistics = 0;
  let bpC2 = 0;
  let bpEconomy = 0;
  let bpDoctrine = 0;
  let bpReadiness = 0;
  let bpTerrain = 0;

  for (const m of members) {
    totalBP += m.bpTotal ?? 0;
    bpWeapon += m.bpWeapon ?? 0;
    bpManpower += m.bpManpower ?? 0;
    bpLogistics += m.bpLogistics ?? 0;
    bpC2 += m.bpC2 ?? 0;
    bpEconomy += m.bpEconomy ?? 0;
    bpDoctrine += m.bpDoctrine ?? 0;
    bpReadiness += m.bpReadiness ?? 0;
    bpTerrain += m.bpTerrain ?? 0;
  }

  return {
    coalitionName: "",
    memberCount: members.length,
    totalBP: Number(totalBP.toFixed(1)),
    bpWeapon: Number(bpWeapon.toFixed(1)),
    bpManpower: Number(bpManpower.toFixed(1)),
    bpLogistics: Number(bpLogistics.toFixed(1)),
    bpC2: Number(bpC2.toFixed(1)),
    bpEconomy: Number(bpEconomy.toFixed(1)),
    bpDoctrine: Number(bpDoctrine.toFixed(1)),
    bpReadiness: Number(bpReadiness.toFixed(1)),
    bpTerrain: Number(bpTerrain.toFixed(1)),
  };
}

/**
 * Compute military hardware balance for a set of countries.
 * Sums tanks, aircraft, navy, submarines, MLRS, and artillery.
 */
export function getCoalitionMilitaryBalance(
  coalitionName: string,
  members: Country[],
): MilitaryBalance {
  let totalTanks = 0;
  let totalAircraft = 0;
  let totalNavy = 0;
  let submarines = 0;
  let totalMlrs = 0;
  let totalArtillery = 0;

  for (const m of members) {
    totalTanks += m.totalTanks;
    totalAircraft += m.totalAircraft;
    totalNavy += m.totalNavy;
    submarines += m.submarines;
    totalMlrs += m.totalMlrs;
    totalArtillery += m.totalArtillery;
  }

  return {
    coalitionName,
    totalTanks,
    totalAircraft,
    totalNavy,
    submarines,
    totalMlrs,
    totalArtillery,
  };
}

/**
 * Compare multiple coalitions across aggregate BP and military balance.
 * Takes coalition names and the full country dataset.
 */
export function getCoalitionComparison(
  coalitionNames: string[],
  countries: Country[],
): CoalitionComparisonData {
  const aggregates: AggregateBP[] = [];
  const militaryBalance: MilitaryBalance[] = [];
  const averageBP: Array<{ coalitionName: string; avgBP: number }> = [];

  for (const name of coalitionNames) {
    const members = getCoalitionMembers(name, countries);
    const agg = getCoalitionAggregateBP(members);
    agg.coalitionName = name;
    aggregates.push(agg);

    const mb = getCoalitionMilitaryBalance(name, members);
    militaryBalance.push(mb);

    const avg = members.length > 0
      ? Number(((agg.totalBP) / members.length).toFixed(1))
      : 0;
    averageBP.push({ coalitionName: name, avgBP: avg });
  }

  return { aggregates, militaryBalance, averageBP };
}

/**
 * Simulate a country switching from its current coalition to a target.
 * Returns before/after aggregates for both coalitions.
 */
export function simulateCoalitionSwitch(
  countryIso: string,
  targetCoalition: string,
  countries: Country[],
): SwitchScenario | null {
  const country = countries.find((c) => c.isoCode === countryIso);
  if (!country) return null;

  const currentInfo = getCountryCoalition(countryIso, country.side);
  const targetInfo = COALITION_REGISTRY.get(targetCoalition);
  if (!targetInfo) return null;

  // Current coalition without this country
  const currentMembersExcl = getCoalitionMembers(currentInfo.name, countries)
    .filter((c) => c.isoCode !== countryIso);
  const currentWithout = getCoalitionAggregateBP(currentMembersExcl);
  currentWithout.coalitionName = currentInfo.name;

  // Target coalition with this country added
  const targetMembers = getCoalitionMembers(targetCoalition, countries);
  const alreadyInTarget = targetMembers.some((c) => c.isoCode === countryIso);
  const targetMembersIncl = alreadyInTarget
    ? targetMembers
    : [...targetMembers, country];
  const targetWith = getCoalitionAggregateBP(targetMembersIncl);
  targetWith.coalitionName = targetCoalition;

  // Original aggregates for delta calculation
  const currentOriginal = getCoalitionAggregateBP(
    getCoalitionMembers(currentInfo.name, countries),
  );
  currentOriginal.coalitionName = currentInfo.name;

  const targetOriginal = getCoalitionAggregateBP(targetMembers);
  targetOriginal.coalitionName = targetCoalition;

  return {
    countryIso,
    currentCoalition: currentInfo.name,
    targetCoalition,
    currentWithout,
    targetWith,
    currentDelta: Number((currentWithout.totalBP - currentOriginal.totalBP).toFixed(1)),
    targetDelta: Number((targetWith.totalBP - targetOriginal.totalBP).toFixed(1)),
  };
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
 * Get rank badge symbol for display.
 */
export function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}
