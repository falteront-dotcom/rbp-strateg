// ─────────────────────────────────────────────────────────────────────────────
// BP Model – Core Types
// Strict TS5, no `any`, explicit returns on every function
// ─────────────────────────────────────────────────────────────────────────────

/** All 8 components of Combat Potential (Боевой Потенциал) */
export const BP_COMPONENTS = [
  "weapon",
  "manpower",
  "logistics",
  "c2",
  "economy",
  "doctrine",
  "readiness",
  "terrain",
] as const;

export type BPComponent = (typeof BP_COMPONENTS)[number];

/** Raw DB row — mirrors the `countries` table in schema.ts */
export interface CountryRawData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: "NATO" | "RUS" | "CHINA" | "UKR" | "NEUTRAL";
  coalition: "NATO" | "CSTO" | "AUKUS" | "BRICS" | null;

  // Geography
  areaKm2: number;
  coastlineKm: number;
  climateZone: string;

  // Economy
  gdpPppBn: number;
  militaryBudgetBn: number;
  defensePctGdp: number;

  // Manpower
  populationM: number;
  activePersonnel: number;
  reservePersonnel: number;
  fitForServiceM: number;

  // Weapons
  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalMlrs: number;
  totalAircraft: number;
  totalHelicopters: number;
  totalNavy: number;
  submarines: number;
  aircraftCarriers: number;
  nuclearWarheads: number;

  // Logistics
  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;

  // Qualitative scores (1–10)
  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  updatedAt: string;
}

/** Score for a single BP component */
export interface ComponentScore {
  component: BPComponent;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  weightedScore: number;
  /** Sub-metric name → value breakdown */
  breakdown: Record<string, number>;
}

/** Full BP profile for a country */
export interface CountryBP {
  isoCode: string;
  name: string;
  totalBP: number;
  components: Record<BPComponent, ComponentScore>;
  rank: number | null;
}
