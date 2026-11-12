export type AnalyticsLayerKey =
  | "bp"
  | "budget"
  | "fleet"
  | "aviation"
  | "tanks"
  | "nukes";

export interface CountryMapData {
  isoCode: string;
  name: string;
  nameRu: string;
  militaryBudgetBn: number;
  totalTanks: number;
  totalAircraft: number;
  totalNavy: number;
  nuclearWarheads: number;
  bpTotal: number;
}
