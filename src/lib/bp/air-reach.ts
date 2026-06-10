// ─────────────────────────────────────────────────────────────────────────────
// Aviation reach estimator
// Оценка боевого радиуса авиации и проекции силы.
// Used by advanced BP model and strategic map overlays.
// ─────────────────────────────────────────────────────────────────────────────

export interface AirReachInput {
  isoCode: string;
  side?: string | null;
  coalition?: string | null;
  totalAircraft?: number | null;
  totalHelicopters?: number | null;
  airfields?: number | null;
  aircraftCarriers?: number | null;
  totalNavy?: number | null;
  ports?: number | null;
  militaryBudgetBn?: number | null;
  techLevel?: number | null;
  c2Capability?: number | null;
  ewCapability?: number | null;
  merchantFleet?: number | null;
  coastlineKm?: number | null;
}

export interface AirReachEstimate {
  combatRadiusKm: number;
  ferryRadiusKm: number;
  expeditionaryRadiusKm: number;
  reachScore: number;
  basingDepthScore: number;
  tankerAndSupportScore: number;
  carrierProjectionScore: number;
  networkBonusKm: number;
  explanation: string;
}

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function logScore(value: number, max: number): number {
  return clamp((Math.log10(Math.max(value, 0) + 1) / Math.log10(Math.max(max, 1) + 1)) * 100);
}

function allianceNetworkBonusKm(data: AirReachInput): number {
  if (data.coalition === "AUKUS") return 360;
  if (data.side === "NATO" || data.coalition === "NATO") return 320;
  if (data.side === "UKR") return 180;
  if (data.side === "RUS" || data.coalition === "CSTO") return 130;
  if (data.side === "CHINA" || data.coalition === "BRICS") return 110;
  return 0;
}

/**
 * Estimate realistic strategic air reach from publicly available aggregate data.
 * It is intentionally a transparent proxy, not a classified platform inventory.
 */
export function estimateAirOperationalReach(data: AirReachInput): AirReachEstimate {
  const aircraft = n(data.totalAircraft);
  const helicopters = n(data.totalHelicopters);
  const airfields = n(data.airfields);
  const carriers = n(data.aircraftCarriers);
  const navy = n(data.totalNavy);
  const ports = n(data.ports);
  const budget = n(data.militaryBudgetBn);
  const tech = clamp(n(data.techLevel), 0, 10);
  const c2 = clamp(n(data.c2Capability), 0, 10);
  const ew = clamp(n(data.ewCapability), 0, 10);
  const merchantFleet = n(data.merchantFleet);
  const coastline = n(data.coastlineKm);

  const airFleetScore = logScore(aircraft * 1.2 + helicopters * 0.35, 4200);
  const basingDepthScore = clamp(logScore(airfields, 900) * 0.72 + logScore(ports + coastline / 550, 160) * 0.28);
  const tankerAndSupportScore = clamp(
    logScore(budget, 920) * 0.38 +
    logScore(airfields, 900) * 0.22 +
    logScore(merchantFleet, 6500) * 0.12 +
    c2 * 4.5 +
    ew * 2.0,
  );
  const carrierProjectionScore = clamp(logScore(carriers * 14 + navy * 0.45, 90));
  const networkBonusKm = allianceNetworkBonusKm(data);

  const combatRadiusKm = clamp(
    360 +
      tech * 88 +
      c2 * 38 +
      ew * 18 +
      airFleetScore * 7.2 +
      basingDepthScore * 4.4 +
      tankerAndSupportScore * 6.0 +
      carrierProjectionScore * 4.8 +
      networkBonusKm,
    260,
    3400,
  );

  const ferryRadiusKm = clamp(combatRadiusKm * (1.75 + tankerAndSupportScore / 240), 550, 8200);
  const expeditionaryRadiusKm = clamp(
    combatRadiusKm +
      tankerAndSupportScore * 18 +
      carrierProjectionScore * 16 +
      logScore(ports + merchantFleet, 6500) * 11 +
      networkBonusKm * 1.35,
    combatRadiusKm,
    6200,
  );
  const reachScore = clamp(
    combatRadiusKm / 34 +
      expeditionaryRadiusKm / 92 +
      carrierProjectionScore * 0.16 +
      basingDepthScore * 0.18,
  );

  return {
    combatRadiusKm: round(combatRadiusKm),
    ferryRadiusKm: round(ferryRadiusKm),
    expeditionaryRadiusKm: round(expeditionaryRadiusKm),
    reachScore: round(reachScore, 1),
    basingDepthScore: round(basingDepthScore, 1),
    tankerAndSupportScore: round(tankerAndSupportScore, 1),
    carrierProjectionScore: round(carrierProjectionScore, 1),
    networkBonusKm: round(networkBonusKm),
    explanation: `Боевой радиус ~${round(combatRadiusKm)} км, экспедиционный радиус ~${round(expeditionaryRadiusKm)} км; учтены парк авиации, аэродромы, C2/РЭБ, бюджет обслуживания, авианосцы и союзная сеть.`,
  };
}
