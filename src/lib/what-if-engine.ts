import type { CountryRawData, CountryBP, BPComponent } from "@/lib/bp/types";
import { BP_COMPONENTS } from "@/lib/bp/types";
import { DEFAULT_WEIGHTS, type WeightsConfig } from "@/lib/bp/weights";
import { calculateCountryBP, calculateAllCountriesBP } from "@/lib/bp";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Alliance options for scenario switching */
export type AllianceOption =
  | "NATO"
  | "CSTO"
  | "BRICS"
  | "Neutral"
  | "AUKUS";

/** All tuneable scenario parameters */
export interface ScenarioParams {
  /** Budget change as a fraction: -0.5 = -50%, +1.0 = +100% */
  budgetChange: number;
  /** Personnel change as a fraction: -0.5 = -50%, +1.0 = +100% */
  personnelChange: number;
  /** Switch alliance membership (null = no change) */
  allianceSwitch: AllianceOption | null;
  /** Gain or lose nuclear weapons */
  nuclearGain: boolean;
  /** Number of warheads gained when nuclearGain=true */
  nuclearWarheadsGained: number;
  /** Country is at war */
  atWar: boolean;
  /** Sanctions are active */
  sanctionsActive: boolean;
  /** Tank change as a fraction (for disarmament preset) */
  tankChange: number;
  /** Aircraft change as a fraction (for disarmament preset) */
  aircraftChange: number;
  /** Navy change as a fraction (for disarmament preset) */
  navyChange: number;
}

/** Per-component before/after/delta */
export interface ComponentDelta {
  component: BPComponent;
  label: string;
  before: number;
  after: number;
  delta: number;
  deltaPercent: number;
}

/** Complete what-if result */
export interface ScenarioResult {
  /** Modified CountryRawData used for recalculation */
  modifiedData: CountryRawData;
  /** BP before scenario */
  baseBP: CountryBP;
  /** BP after scenario */
  scenarioBP: CountryBP;
  /** Per-component deltas */
  componentDeltas: ComponentDelta[];
  /** Total BP delta */
  totalDelta: number;
  /** Rank before (1-based) */
  baseRank: number;
  /** Rank after (1-based) */
  scenarioRank: number;
  /** Rank change: positive = improved, negative = declined */
  rankChange: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const COMPONENT_LABELS: Record<BPComponent, string> = {
  weapon: "Оружие",
  manpower: "Личный Состав",
  logistics: "Логистика",
  c2: "Управление",
  economy: "Экономика",
  doctrine: "Доктрина",
  readiness: "Готовность",
  terrain: "География",
};

// ─────────────────────────────────────────────────────────────────────────────
// Alliance modifiers — how switching alliances impacts qualitative scores
// ─────────────────────────────────────────────────────────────────────────────

interface AllianceModifiers {
  doctrineBonus: number;
  c2Bonus: number;
  logisticsBonus: number;
  techBonus: number;
}

const ALLIANCE_MODIFIERS: Record<AllianceOption, AllianceModifiers> = {
  NATO: { doctrineBonus: 2, c2Bonus: 1.5, logisticsBonus: 1.5, techBonus: 1 },
  CSTO: { doctrineBonus: 1, c2Bonus: 1, logisticsBonus: 0.8, techBonus: 0.5 },
  BRICS: { doctrineBonus: 0.5, c2Bonus: 0.5, logisticsBonus: 1, techBonus: 0.5 },
  Neutral: { doctrineBonus: -0.5, c2Bonus: -0.5, logisticsBonus: -1, techBonus: 0 },
  AUKUS: { doctrineBonus: 1.5, c2Bonus: 2, logisticsBonus: 1.5, techBonus: 1.5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Default params
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SCENARIO_PARAMS: ScenarioParams = {
  budgetChange: 0,
  personnelChange: 0,
  allianceSwitch: null,
  nuclearGain: false,
  nuclearWarheadsGained: 50,
  atWar: false,
  sanctionsActive: false,
  tankChange: 0,
  aircraftChange: 0,
  navyChange: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────────

export interface ScenarioPreset {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  params: ScenarioParams;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "full-mobilization",
    name: "Full Mobilization",
    nameRu: "Полная Мобилизация",
    description: "+100% состав, +50% бюджет, война",
    params: {
      ...DEFAULT_SCENARIO_PARAMS,
      budgetChange: 0.5,
      personnelChange: 1.0,
      atWar: true,
    },
  },
  {
    id: "sanctions-impact",
    name: "Sanctions Impact",
    nameRu: "Влияние Санкций",
    description: "-30% экономика, -20% логистика",
    params: {
      ...DEFAULT_SCENARIO_PARAMS,
      sanctionsActive: true,
    },
  },
  {
    id: "nato-accession",
    name: "NATO Accession",
    nameRu: "Вступление в НАТО",
    description: "Альянс=НАТО, ЦУР +15, логистика +10",
    params: {
      ...DEFAULT_SCENARIO_PARAMS,
      allianceSwitch: "NATO",
    },
  },
  {
    id: "disarmament",
    name: "Disarmament",
    nameRu: "Разоружение",
    description: "-50% танки, -50% авиация, -30% флот",
    params: {
      ...DEFAULT_SCENARIO_PARAMS,
      tankChange: -0.5,
      aircraftChange: -0.5,
      navyChange: -0.3,
    },
  },
  {
    id: "nuclear-threshold",
    name: "Nuclear Threshold",
    nameRu: "Ядерный Порог",
    description: "Получить 50 ядерных боеголовок",
    params: {
      ...DEFAULT_SCENARIO_PARAMS,
      nuclearGain: true,
      nuclearWarheadsGained: 50,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Core: apply params to raw country data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a modified CountryRawData by applying scenario params.
 * Does NOT mutate the original.
 */
export function applyScenarioToRaw(
  base: CountryRawData,
  params: ScenarioParams,
): CountryRawData {
  const modified: CountryRawData = { ...base };

  // ─── Budget change → military budget and GDP proportion ─────────────
  modified.militaryBudgetBn = Math.max(
    0,
    base.militaryBudgetBn * (1 + params.budgetChange),
  );
  // Budget increase usually raises defense % of GDP proportionally
  modified.defensePctGdp = Math.min(
    50,
    base.defensePctGdp * (1 + params.budgetChange * 0.5),
  );
  // Budget increase also boosts GDP PPP slightly (military Keynesian effect)
  modified.gdpPppBn = Math.max(
    0,
    base.gdpPppBn * (1 + params.budgetChange * 0.15),
  );

  // ─── Personnel change ──────────────────────────────────────────────
  modified.activePersonnel = Math.max(
    0,
    Math.round(base.activePersonnel * (1 + params.personnelChange)),
  );
  modified.reservePersonnel = Math.max(
    0,
    Math.round(base.reservePersonnel * (1 + params.personnelChange * 0.7)),
  );
  modified.fitForServiceM = Math.max(
    0,
    base.fitForServiceM * (1 + params.personnelChange * 0.3),
  );
  // Personnel increase slightly bumps population
  modified.populationM = Math.max(
    0,
    base.populationM * (1 + params.personnelChange * 0.05),
  );

  // ─── Alliance switch ──────────────────────────────────────────────
  if (params.allianceSwitch !== null) {
    const allianceMap: Record<AllianceOption, CountryRawData["side"]> = {
      NATO: "NATO",
      CSTO: "RUS",
      BRICS: "CHINA",
      Neutral: "NEUTRAL",
      AUKUS: "NATO",
    };
    modified.side = allianceMap[params.allianceSwitch];

    const coalitionMap: Record<
      AllianceOption,
      CountryRawData["coalition"]
    > = {
      NATO: "NATO",
      CSTO: "CSTO",
      BRICS: "BRICS",
      Neutral: null,
      AUKUS: "AUKUS",
    };
    modified.coalition = coalitionMap[params.allianceSwitch];

    const mods = ALLIANCE_MODIFIERS[params.allianceSwitch];
    modified.c2Capability = Math.min(
      10,
      Math.max(1, base.c2Capability + mods.c2Bonus),
    );
    modified.ewCapability = Math.min(
      10,
      Math.max(1, base.ewCapability + mods.techBonus),
    );
    modified.combatExperience = Math.min(
      10,
      Math.max(1, base.combatExperience + mods.doctrineBonus),
    );
    // Alliance logistics bonus → ports/airfields efficiency proxy
    modified.merchantFleet = Math.max(
      0,
      Math.round(base.merchantFleet * (1 + mods.logisticsBonus * 0.1)),
    );
  }

  // ─── Nuclear toggle ────────────────────────────────────────────────
  if (params.nuclearGain) {
    modified.nuclearWarheads =
      base.nuclearWarheads + params.nuclearWarheadsGained;
    // Nuclear capability boosts tech level perception
    modified.techLevel = Math.min(
      10,
      Math.max(1, base.techLevel + 0.5),
    );
  }

  // ─── At war ────────────────────────────────────────────────────────
  if (params.atWar) {
    // Morale boost from conflict (rally-around-flag effect)
    modified.moraleIndex = Math.min(
      10,
      Math.max(1, base.moraleIndex + 2),
    );
    // Combat experience rises
    modified.combatExperience = Math.min(
      10,
      Math.max(1, base.combatExperience + 1),
    );
    // Economy penalty — war is expensive
    modified.gdpPppBn = Math.max(
      0,
      modified.gdpPppBn * 0.9,
    );
    // C2 stressed but more practiced
    modified.c2Capability = Math.min(
      10,
      Math.max(1, modified.c2Capability + 0.5),
    );
  }

  // ─── Sanctions ─────────────────────────────────────────────────────
  if (params.sanctionsActive) {
    // -30% economy
    modified.gdpPppBn = Math.max(
      0,
      modified.gdpPppBn * 0.7,
    );
    // -20% logistics (import restrictions)
    modified.merchantFleet = Math.max(
      0,
      Math.round(modified.merchantFleet * 0.8),
    );
    modified.oilProductionKbd = Math.max(
      0,
      Math.round(modified.oilProductionKbd * 0.85),
    );
    // Tech level degradation from component embargoes
    modified.techLevel = Math.max(
      1,
      modified.techLevel - 0.5,
    );
    // Military budget effectively reduced by procurement constraints
    modified.militaryBudgetBn = Math.max(
      0,
      modified.militaryBudgetBn * 0.85,
    );
  }

  // ─── Disarmament (tank/aircraft/navy change) ──────────────────────
  modified.totalTanks = Math.max(
    0,
    Math.round(base.totalTanks * (1 + params.tankChange)),
  );
  modified.totalAfv = Math.max(
    0,
    Math.round(base.totalAfv * (1 + params.tankChange * 0.7)),
  );
  modified.totalArtillery = Math.max(
    0,
    Math.round(base.totalArtillery * (1 + params.tankChange * 0.3)),
  );
  modified.totalMlrs = Math.max(
    0,
    Math.round(base.totalMlrs * (1 + params.tankChange * 0.3)),
  );
  modified.totalAircraft = Math.max(
    0,
    Math.round(base.totalAircraft * (1 + params.aircraftChange)),
  );
  modified.totalHelicopters = Math.max(
    0,
    Math.round(base.totalHelicopters * (1 + params.aircraftChange * 0.6)),
  );
  modified.totalNavy = Math.max(
    0,
    Math.round(base.totalNavy * (1 + params.navyChange)),
  );
  modified.submarines = Math.max(
    0,
    Math.round(base.submarines * (1 + params.navyChange)),
  );
  modified.aircraftCarriers = Math.max(
    0,
    Math.round(base.aircraftCarriers * (1 + params.navyChange)),
  );

  return modified;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: calculate full scenario result
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a full what-if scenario analysis.
 *
 * @param baseCountry  - The country to analyse
 * @param allCountries - Full cohort for normalisation context
 * @param params       - Scenario parameters
 * @param weights      - Optional weight overrides
 * @returns ScenarioResult with before/after BP, deltas, and rank change
 */
export function calculateWhatIf(
  baseCountry: CountryRawData,
  allCountries: CountryRawData[],
  params: ScenarioParams,
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): ScenarioResult {
  // ─── Base BP ─────────────────────────────────────────────────────────
  const baseBP: CountryBP = calculateCountryBP(
    baseCountry,
    allCountries,
    weights,
  );

  // ─── Modified data ──────────────────────────────────────────────────
  const modifiedData: CountryRawData = applyScenarioToRaw(
    baseCountry,
    params,
  );

  // ─── Build modified cohort (replace this country in the list) ───────
  const modifiedCohort: CountryRawData[] = allCountries.map((c) =>
    c.isoCode === baseCountry.isoCode ? modifiedData : c,
  );

  // ─── Scenario BP ────────────────────────────────────────────────────
  const scenarioBP: CountryBP = calculateCountryBP(
    modifiedData,
    modifiedCohort,
    weights,
  );

  // ─── Component deltas ──────────────────────────────────────────────
  const componentDeltas: ComponentDelta[] = BP_COMPONENTS.map(
    (comp: BPComponent): ComponentDelta => {
      const before: number =
        baseBP.components[comp].weightedScore;
      const after: number =
        scenarioBP.components[comp].weightedScore;
      const delta: number = Number((after - before).toFixed(2));
      const deltaPercent: number =
        before !== 0
          ? Number(((delta / before) * 100).toFixed(1))
          : 0;

      return {
        component: comp,
        label: COMPONENT_LABELS[comp],
        before: Number(before.toFixed(2)),
        after: Number(after.toFixed(2)),
        delta,
        deltaPercent,
      };
    },
  );

  // ─── Total delta ────────────────────────────────────────────────────
  const totalDelta: number = Number(
    (scenarioBP.totalBP - baseBP.totalBP).toFixed(2),
  );

  // ─── Rank recalculation ─────────────────────────────────────────────
  const allBaseRanks: CountryBP[] = calculateAllCountriesBP(
    allCountries,
    weights,
  );
  const allScenarioRanks: CountryBP[] = calculateAllCountriesBP(
    modifiedCohort,
    weights,
  );

  const baseRank: number =
    allBaseRanks.find((bp) => bp.isoCode === baseCountry.isoCode)?.rank ?? 0;
  const scenarioRank: number =
    allScenarioRanks.find((bp) => bp.isoCode === baseCountry.isoCode)?.rank ??
    0;

  // Positive = improved (lower rank number is better)
  const rankChange: number = baseRank - scenarioRank;

  return {
    modifiedData,
    baseBP,
    scenarioBP,
    componentDeltas,
    totalDelta,
    baseRank,
    scenarioRank,
    rankChange,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// URL export/import
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encode scenario params as URL search params.
 * Returns a string like "?budget=0.5&personnel=1&alliance=NATO&..."
 */
export function encodeScenarioToURL(
  isoCode: string,
  params: ScenarioParams,
): string {
  const sp: URLSearchParams = new URLSearchParams();
  sp.set("iso", isoCode);
  sp.set("budget", String(params.budgetChange));
  sp.set("personnel", String(params.personnelChange));
  if (params.allianceSwitch !== null) {
    sp.set("alliance", params.allianceSwitch);
  }
  sp.set("nuclear", String(params.nuclearGain));
  sp.set("warheads", String(params.nuclearWarheadsGained));
  sp.set("war", String(params.atWar));
  sp.set("sanctions", String(params.sanctionsActive));
  sp.set("tanks", String(params.tankChange));
  sp.set("aircraft", String(params.aircraftChange));
  sp.set("navy", String(params.navyChange));
  return `?${sp.toString()}`;
}

/**
 * Decode scenario params from URL search params.
 * Returns null if the "iso" param is missing.
 */
export function decodeScenarioFromURL(
  search: string,
): { isoCode: string; params: ScenarioParams } | null {
  const sp: URLSearchParams = new URLSearchParams(search);
  const isoCode: string | null = sp.get("iso");
  if (!isoCode) return null;

  const allianceStr: string | null = sp.get("alliance");
  const allianceSwitch: AllianceOption | null =
    allianceStr &&
    ["NATO", "CSTO", "BRICS", "Neutral", "AUKUS"].includes(allianceStr)
      ? (allianceStr as AllianceOption)
      : null;

  return {
    isoCode,
    params: {
      budgetChange: Number(sp.get("budget") ?? "0"),
      personnelChange: Number(sp.get("personnel") ?? "0"),
      allianceSwitch,
      nuclearGain: sp.get("nuclear") === "true",
      nuclearWarheadsGained: Number(sp.get("warheads") ?? "50"),
      atWar: sp.get("war") === "true",
      sanctionsActive: sp.get("sanctions") === "true",
      tankChange: Number(sp.get("tanks") ?? "0"),
      aircraftChange: Number(sp.get("aircraft") ?? "0"),
      navyChange: Number(sp.get("navy") ?? "0"),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: delta sign helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a CSS color class based on delta direction.
 * Positive = cyan (improvement), Negative = red (decline), Zero = slate.
 */
export function getDeltaColor(delta: number): string {
  if (delta > 0.01) return "text-cyan-400";
  if (delta < -0.01) return "text-red-400";
  return "text-slate-400";
}

/**
 * Returns a sign prefix string for display.
 */
export function formatDelta(delta: number): string {
  if (delta > 0.01) return `+${delta.toFixed(2)}`;
  if (delta < -0.01) return delta.toFixed(2);
  return "0.00";
}

/**
 * Returns a sign prefix string for percent display.
 */
export function formatDeltaPercent(pct: number): string {
  if (pct > 0.1) return `+${pct.toFixed(1)}%`;
  if (pct < -0.1) return `${pct.toFixed(1)}%`;
  return "0.0%";
}

/**
 * Rank change display string with arrow.
 */
export function formatRankChange(
  baseRank: number,
  scenarioRank: number,
): string {
  const change: number = baseRank - scenarioRank;
  if (change > 0) return `${baseRank} → ${scenarioRank} ↑${change}`;
  if (change < 0) return `${baseRank} → ${scenarioRank} ↓${Math.abs(change)}`;
  return `${baseRank} → ${scenarioRank} —`;
}
