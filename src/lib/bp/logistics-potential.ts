// ─────────────────────────────────────────────────────────────────────────────
// BP Component 3/8 – Logistics Potential (L)
//
// L = ports×0.25 + airfields×0.25 + fuel×0.3 + fleet×0.2
//   fuel = oilProductionKbd
//   fleet = merchantFleet
// ─────────────────────────────────────────────────────────────────────────────

import type { CountryRawData, ComponentScore } from "@/lib/bp/types";
import type { BPComponent } from "@/lib/bp/types";
import { logNormalize } from "@/lib/bp/normalize";

export function calcLogisticsRaw(data: CountryRawData): {
  raw: number;
  breakdown: Record<string, number>;
} {
  const ports: number = data.ports;
  const airfields: number = data.airfields;
  const fuel: number = data.oilProductionKbd;
  const fleet: number = data.merchantFleet;

  const raw: number = ports * 0.25 + airfields * 0.25 + fuel * 0.3 + fleet * 0.2;

  const breakdown: Record<string, number> = {
    ports,
    airfields,
    fuel,
    fleet,
  };

  return { raw, breakdown };
}

export function normalizeLogistics(
  raw: number,
  allRaws: number[],
): number {
  const maxRaw: number = Math.max(...allRaws, 1);
  return logNormalize(raw, maxRaw);
}

export function scoreLogistics(
  data: CountryRawData,
  allData: CountryRawData[],
  weight: number,
): ComponentScore {
  const { raw, breakdown } = calcLogisticsRaw(data);

  const allRaws: number[] = allData.map((d) => calcLogisticsRaw(d).raw);
  const normalizedValue: number = normalizeLogistics(raw, allRaws);

  return {
    component: "logistics" as BPComponent,
    rawValue: raw,
    normalizedValue,
    weight,
    weightedScore: normalizedValue * weight,
    breakdown,
  };
}
