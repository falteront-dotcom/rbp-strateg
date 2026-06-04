// ─────────────────────────────────────────────────────────────────────────────
// BP Component 5/8 – Economy Potential (E)
//
// E = gdp×0.3 + budget×0.35 + defpct×0.2 + eff×0.15
//   gdp     = gdpPppBn
//   budget  = militaryBudgetBn
//   defpct  = defensePctGdp
//   eff     = militaryBudgetBn / gdpPppBn × 100   (budget efficiency proxy)
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { logNormalize } from "@/lib/bp/normalize";

export function calcEconomyRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const gdp: number = data.gdpPppBn;
  const budget: number = data.militaryBudgetBn;
  const defpct: number = data.defensePctGdp;

  // Efficiency: share of GDP actually directed to military
  const eff: number =
    data.gdpPppBn > 0 ? (data.militaryBudgetBn / data.gdpPppBn) * 100 : 0;

  const raw: number = gdp * 0.3 + budget * 0.35 + defpct * 0.2 + eff * 0.15;

  const breakdown: Record<string, number> = {
    gdp,
    budget,
    defpct,
    eff,
  };

  return { raw, breakdown };
}

export function normalizeEconomy(
  raw: number,
  allRaws: number[],
): number {
  const maxRaw: number = Math.max(...allRaws, 1);
  return logNormalize(raw, maxRaw);
}

export function scoreEconomy(
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcEconomyRaw(data);

  const allRaws: number[] = allData.map((d) => calcEconomyRaw(d).raw);
  const normalizedValue: number = normalizeEconomy(raw, allRaws);

  return {
    component: "economy" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
