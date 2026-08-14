// ─────────────────────────────────────────────────────────────────────────────
// Coalition Analysis – Core Types, Predefined Maps, Aggregation Logic
// Strict TS5, no `any`, explicit returns on every function
// ─────────────────────────────────────────────────────────────────────────────

/** 8 BP component keys matching the DB schema and CountryCard */
export const COALITION_BP_COMPONENTS = [
  "bpWeapon",
  "bpManpower",
  "bpLogistics",
  "bpC2",
  "bpEconomy",
  "bpDoctrine",
  "bpReadiness",
  "bpTerrain",
] as const;

export type CoalitionBPComponent = (typeof COALITION_BP_COMPONENTS)[number];

/** Russian labels for the 8 BP components */
export const COALITION_BP_LABELS: Record<CoalitionBPComponent, string> = {
  bpWeapon: "Оружие",
  bpManpower: "Личный Состав",
  bpLogistics: "Логистика",
  bpC2: "Управление",
  bpEconomy: "Экономика",
  bpDoctrine: "Доктрина",
  bpReadiness: "Готовность",
  bpTerrain: "География",
};

/** ISO-3166-1 alpha-3 code */
export type ISOCode = string;

/** Single member row from DB — only the fields we need */
export interface CoalitionMember {
  isoCode: ISOCode;
  nameRu: string;
  side: string;
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

/** Aggregated BP profile for a coalition */
export interface CoalitionBP {
  name: string;
  isoCodes: readonly ISOCode[];
  memberCount: number;
  totalBP: number;
  /** Average of each component across all members */
  componentScores: Record<CoalitionBPComponent, number>;
  /** Member detail list sorted by bpTotal descending */
  members: CoalitionMember[];
}

/** Per-component delta between two coalitions */
export interface ComponentDelta {
  component: CoalitionBPComponent;
  label: string;
  valueA: number;
  valueB: number;
  delta: number;
  /** Which coalition has the advantage: "A" | "B" | "tie" */
  advantage: "A" | "B" | "tie";
}

/** Full comparison result between two coalitions */
export interface CoalitionComparison {
  coalitionA: CoalitionBP;
  coalitionB: CoalitionBP;
  totalDelta: number;
  overallAdvantage: "A" | "B" | "tie";
  componentDeltas: ComponentDelta[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Predefined Coalitions Map
//
// CANONICAL RUNTIME REGISTRY: this `PREDEFINED_COALITIONS` map is the single
// source of truth consumed by GET /api/coalitions. Its NATO list (26 members)
// matches the seeded fixture, so e2e asserts a deterministic 26. Aggregation
// semantics in `aggregateCoalitionBP` below are: `totalBP` = SUM of member
// `bpTotal`; `componentScores` = AVERAGE of member component values; members
// are sorted by `bpTotal` descending; members not present in the data are
// silently skipped. `src/lib/bp/coalition-data.ts` holds richer reference
// metadata (founding year, articles, descriptions) but is NOT the runtime
// aggregation registry.
// ─────────────────────────────────────────────────────────────────────────────

export const PREDEFINED_COALITIONS: ReadonlyMap<string, readonly ISOCode[]> = new Map([
  [
    "NATO",
    [
      "USA", "GBR", "FRA", "DEU", "ITA", "ESP", "TUR", "CAN", "POL", "NLD",
      "BEL", "NOR", "GRC", "PRT", "CZE", "HUN", "ROU", "BGR", "HRV", "SVK",
      "SVN", "LTU", "LVA", "EST", "FIN", "SWE",
    ],
  ],
  [
    "CSTO",
    ["RUS", "BLR", "ARM", "KAZ", "KGZ", "TJK"],
  ],
  [
    "AUKUS",
    ["AUS", "GBR", "USA"],
  ],
  [
    "BRICS",
    ["CHN", "RUS", "IND", "BRA", "ZAF", "SAU", "EGY", "ETH", "IRN", "ARE"],
  ],
]);

/** Side color map for UI rendering (OKLCH) */
export const SIDE_COLORS: Record<string, string> = {
  NATO: "oklch(70% 0.18 240)",
  RUS: "oklch(65% 0.25 25)",
  CHINA: "oklch(80% 0.2 80)",
  UKR: "oklch(65% 0.15 90)",
  NEUTRAL: "oklch(65% 0.05 240)",
};

/** Side labels in Russian */
export const SIDE_LABELS: Record<string, string> = {
  NATO: "НАТО",
  RUS: "Россия",
  CHINA: "Китай",
  UKR: "Украина",
  NEUTRAL: "Нейтральный",
};

/** Color map per coalition for UI rendering */
export const COALITION_COLORS: Record<string, string> = {
  NATO: "oklch(70% 0.18 240)",
  CSTO: "oklch(65% 0.25 25)",
  AUKUS: "oklch(75% 0.2 180)",
  BRICS: "oklch(80% 0.2 80)",
};

/** Tailwind text classes per coalition */
export const COALITION_TEXT_CLASSES: Record<string, string> = {
  NATO: "text-tactical-nato",
  CSTO: "text-tactical-rus",
  AUKUS: "text-teal-400",
  BRICS: "text-tactical-china",
};

/** Tailwind bg classes per coalition */
export const COALITION_BG_CLASSES: Record<string, string> = {
  NATO: "bg-tactical-nato/10 border-tactical-nato/30",
  CSTO: "bg-tactical-rus/10 border-tactical-rus/30",
  AUKUS: "bg-teal-400/10 border-teal-400/30",
  BRICS: "bg-tactical-china/10 border-tactical-china/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate BP scores for a set of countries.
 * Returns a CoalitionBP with averaged component scores and summed/averaged totals.
 * Members not found in the DB are silently skipped.
 */
export function aggregateCoalitionBP(
  name: string,
  isoCodes: readonly ISOCode[],
  countryData: CoalitionMember[],
): CoalitionBP {
  const isoSet = new Set(isoCodes);
  const members = countryData
    .filter((c) => isoSet.has(c.isoCode))
    .sort((a, b) => b.bpTotal - a.bpTotal);

  const memberCount = members.length;

  if (memberCount === 0) {
    const emptyScores: Record<CoalitionBPComponent, number> = {
      bpWeapon: 0, bpManpower: 0, bpLogistics: 0, bpC2: 0,
      bpEconomy: 0, bpDoctrine: 0, bpReadiness: 0, bpTerrain: 0,
    };
    return {
      name,
      isoCodes,
      memberCount: 0,
      totalBP: 0,
      componentScores: emptyScores,
      members: [],
    };
  }

  let totalBP = 0;
  const sums: Record<CoalitionBPComponent, number> = {
    bpWeapon: 0, bpManpower: 0, bpLogistics: 0, bpC2: 0,
    bpEconomy: 0, bpDoctrine: 0, bpReadiness: 0, bpTerrain: 0,
  };

  for (const m of members) {
    totalBP += m.bpTotal;
    for (const comp of COALITION_BP_COMPONENTS) {
      sums[comp] += m[comp];
    }
  }

  const componentScores: Record<CoalitionBPComponent, number> = {} as Record<CoalitionBPComponent, number>;
  for (const comp of COALITION_BP_COMPONENTS) {
    componentScores[comp] = Number((sums[comp] / memberCount).toFixed(2));
  }

  return {
    name,
    isoCodes,
    memberCount,
    totalBP: Number(totalBP.toFixed(2)),
    componentScores,
    members,
  };
}

/**
 * Compare two coalitions across all BP components.
 * Returns a CoalitionComparison with per-component deltas and overall advantage.
 */
export function compareCoalitions(
  coalitionA: CoalitionBP,
  coalitionB: CoalitionBP,
): CoalitionComparison {
  const componentDeltas: ComponentDelta[] = COALITION_BP_COMPONENTS.map((comp) => {
    const valueA = coalitionA.componentScores[comp];
    const valueB = coalitionB.componentScores[comp];
    const delta = Number((valueA - valueB).toFixed(2));
    const advantage: "A" | "B" | "tie" =
      Math.abs(delta) < 0.5 ? "tie" : delta > 0 ? "A" : "B";
    return {
      component: comp,
      label: COALITION_BP_LABELS[comp],
      valueA,
      valueB,
      delta,
      advantage,
    };
  });

  const totalDelta = Number((coalitionA.totalBP - coalitionB.totalBP).toFixed(2));
  const overallAdvantage: "A" | "B" | "tie" =
    Math.abs(totalDelta) < 1 ? "tie" : totalDelta > 0 ? "A" : "B";

  return {
    coalitionA,
    coalitionB,
    totalDelta,
    overallAdvantage,
    componentDeltas,
  };
}

/**
 * Convert ISO-3166-1 alpha-3 code to flag emoji.
 * Identical to the one in CountryCard but available for shared use.
 */
export function isoToFlag(iso: string): string {
  if (iso.length !== 3) return "🏳️";
  const base = 0x1f1e6;
  const codePointA = 65;
  const ch1 = iso.charCodeAt(0) - codePointA + base;
  const ch2 = iso.charCodeAt(1) - codePointA + base;
  return String.fromCodePoint(ch1, ch2);
}
