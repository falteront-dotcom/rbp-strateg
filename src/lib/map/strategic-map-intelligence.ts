// ─────────────────────────────────────────────────────────────────────────────
// Strategic Map Intelligence Layer Builders
// Extra operational overlays for the strategic map: readiness, logistics,
// economy, manpower, C2/EW, artillery, alliance links, risk and labels.
// ─────────────────────────────────────────────────────────────────────────────

import { ArcLayer, GeoJsonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { CountryCollection } from "@/lib/geo/country-boundaries";
import { getPosition } from "@/lib/geo/country-centroids";

export interface StrategicMapCountry {
  isoCode: string;
  name: string;
  nameRu: string;
  side?: string;
  coalition?: string | null;
  region?: string;
  areaKm2?: number;
  coastlineKm?: number;
  gdpPppBn?: number;
  militaryBudgetBn: number;
  defensePctGdp?: number;
  populationM?: number;
  activePersonnel?: number;
  reservePersonnel?: number;
  fitForServiceM?: number;
  totalTanks: number;
  totalAfv?: number;
  totalArtillery?: number;
  totalMlrs?: number;
  totalAircraft: number;
  totalHelicopters?: number;
  totalNavy: number;
  submarines?: number;
  aircraftCarriers?: number;
  nuclearWarheads: number;
  ports?: number;
  airfields?: number;
  oilProductionKbd?: number;
  merchantFleet?: number;
  techLevel?: number;
  moraleIndex?: number;
  combatExperience?: number;
  c2Capability?: number;
  ewCapability?: number;
  bpTotal: number;
  bpWeapon?: number;
  bpManpower?: number;
  bpLogistics?: number;
  bpC2?: number;
  bpEconomy?: number;
  bpDoctrine?: number;
  bpReadiness?: number;
  bpTerrain?: number;
  bpAdvanced?: number;
}

export type StrategicMetricKey =
  | "readiness"
  | "logistics"
  | "economy"
  | "manpower"
  | "c2"
  | "artillery"
  | "projection"
  | "density"
  | "risk";

export interface StrategicMetricPoint {
  iso: string;
  name: string;
  position: [number, number];
  value: number;
  label: string;
  layer: string;
  side: string;
  coalition: string | null;
  bp: number;
  extra: Record<string, number | string>;
}

export interface StrategicArcPoint {
  iso: string;
  name: string;
  side: string;
  source: [number, number];
  target: [number, number];
  value: number;
  label: string;
}

export interface StrategicLabelPoint {
  iso: string;
  name: string;
  position: [number, number];
  value: number;
  text: string;
}

function n(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function logScore(value: number, max: number): number {
  return clamp((Math.log10(Math.max(value, 0) + 1) / Math.log10(Math.max(max, 1) + 1)) * 100);
}

function maxOf(countries: ReadonlyArray<StrategicMapCountry>, selector: (c: StrategicMapCountry) => number): number {
  return Math.max(...countries.map(selector).map(n), 1);
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(value >= 10 ? 0 : 1);
}

function sideColor(side: string): [number, number, number, number] {
  switch (side) {
    case "NATO": return [59, 130, 246, 210];
    case "RUS": return [239, 68, 68, 210];
    case "CHINA": return [245, 158, 11, 210];
    case "UKR": return [234, 179, 8, 210];
    default: return [148, 163, 184, 185];
  }
}

function heatColor(value: number): [number, number, number, number] {
  const t = clamp(value) / 100;
  if (t < 0.25) return [51, 65, 85, 170];
  if (t < 0.45) return [34, 211, 238, 185];
  if (t < 0.65) return [16, 185, 129, 195];
  if (t < 0.82) return [245, 158, 11, 210];
  return [239, 68, 68, 225];
}

function purpleColor(value: number): [number, number, number, number] {
  const t = clamp(value) / 100;
  return [Math.round(80 + t * 150), Math.round(70 + t * 40), Math.round(160 + t * 80), 205];
}

function blueColor(value: number): [number, number, number, number] {
  const t = clamp(value) / 100;
  return [Math.round(20 + t * 80), Math.round(110 + t * 110), Math.round(170 + t * 75), 205];
}

function greenColor(value: number): [number, number, number, number] {
  const t = clamp(value) / 100;
  return [Math.round(30 + t * 70), Math.round(130 + t * 105), Math.round(90 + t * 70), 205];
}

function amberColor(value: number): [number, number, number, number] {
  const t = clamp(value) / 100;
  return [Math.round(120 + t * 135), Math.round(85 + t * 110), Math.round(35 + t * 55), 205];
}

export function calculateStrategicMetric(
  country: StrategicMapCountry,
  countries: ReadonlyArray<StrategicMapCountry>,
  key: StrategicMetricKey,
): number {
  const maxLand = maxOf(countries, (c) => n(c.totalTanks) * 2 + n(c.totalAfv) * 0.55 + n(c.totalArtillery) * 1.1 + n(c.totalMlrs) * 1.8);
  const maxAir = maxOf(countries, (c) => n(c.totalAircraft) * 1.7 + n(c.totalHelicopters) * 0.6 + n(c.airfields) * 1.1);
  const maxNavy = maxOf(countries, (c) => n(c.totalNavy) + n(c.submarines) * 4 + n(c.aircraftCarriers) * 18 + n(c.ports) * 2.5 + n(c.merchantFleet) * 0.035);
  const maxBudget = maxOf(countries, (c) => n(c.militaryBudgetBn));
  const maxGdp = maxOf(countries, (c) => n(c.gdpPppBn));
  const maxPeople = maxOf(countries, (c) => n(c.activePersonnel) + n(c.reservePersonnel) * 0.45 + n(c.fitForServiceM) * 35_000);
  const maxLog = maxOf(countries, (c) => n(c.ports) * 3 + n(c.airfields) * 1.2 + n(c.merchantFleet) * 0.05 + n(c.oilProductionKbd) * 0.04);
  const maxArtillery = maxOf(countries, (c) => n(c.totalArtillery) + n(c.totalMlrs) * 1.8);

  const readinessBase = n(country.bpReadiness) || ((n(country.techLevel) + n(country.moraleIndex) + n(country.combatExperience) + n(country.c2Capability)) / 4) * 10;
  const logisticsBase = n(country.bpLogistics) || logScore(n(country.ports) * 3 + n(country.airfields) * 1.2 + n(country.merchantFleet) * 0.05 + n(country.oilProductionKbd) * 0.04, maxLog);
  const economyBase = n(country.bpEconomy) || (logScore(n(country.gdpPppBn), maxGdp) * 0.55 + logScore(n(country.militaryBudgetBn), maxBudget) * 0.35 + clamp(n(country.defensePctGdp) / 12 * 100) * 0.10);
  const manpowerBase = n(country.bpManpower) || logScore(n(country.activePersonnel) + n(country.reservePersonnel) * 0.45 + n(country.fitForServiceM) * 35_000, maxPeople);
  const c2Base = n(country.bpC2) || ((n(country.c2Capability) * 0.42 + n(country.ewCapability) * 0.28 + n(country.techLevel) * 0.30) * 10);
  const artilleryBase = logScore(n(country.totalArtillery) + n(country.totalMlrs) * 1.8, maxArtillery);
  const land = logScore(n(country.totalTanks) * 2 + n(country.totalAfv) * 0.55 + n(country.totalArtillery) * 1.1 + n(country.totalMlrs) * 1.8, maxLand);
  const air = logScore(n(country.totalAircraft) * 1.7 + n(country.totalHelicopters) * 0.6 + n(country.airfields) * 1.1, maxAir);
  const navy = logScore(n(country.totalNavy) + n(country.submarines) * 4 + n(country.aircraftCarriers) * 18 + n(country.ports) * 2.5 + n(country.merchantFleet) * 0.035, maxNavy);
  const projection = clamp(air * 0.26 + navy * 0.32 + logisticsBase * 0.24 + economyBase * 0.12 + c2Base * 0.06);
  const density = clamp((n(country.bpTotal) / Math.sqrt(Math.max(n(country.areaKm2), 1))) * 850);
  const nuclearRisk = n(country.nuclearWarheads) > 0 ? 16 : 0;
  const risk = clamp(n(country.bpTotal) * 0.38 + nuclearRisk + n(country.combatExperience) * 3 + projection * 0.22 + n(country.defensePctGdp) * 2);

  switch (key) {
    case "readiness": return clamp(readinessBase);
    case "logistics": return clamp(logisticsBase);
    case "economy": return clamp(economyBase);
    case "manpower": return clamp(manpowerBase);
    case "c2": return clamp(c2Base);
    case "artillery": return clamp(artilleryBase);
    case "projection": return clamp(projection);
    case "density": return clamp(density);
    case "risk": return clamp(risk);
  }
}

export function buildMetricPoints(
  countries: ReadonlyArray<StrategicMapCountry>,
  key: StrategicMetricKey,
  label: string,
): StrategicMetricPoint[] {
  return countries
    .map((c) => {
      const value = calculateStrategicMetric(c, countries, key);
      return {
        iso: c.isoCode,
        name: c.nameRu || c.name,
        position: getPosition(c.isoCode),
        value,
        label,
        layer: key,
        side: c.side ?? "NEUTRAL",
        coalition: c.coalition ?? null,
        bp: n(c.bpAdvanced) || n(c.bpTotal),
        extra: {
          budget: n(c.militaryBudgetBn),
          gdp: n(c.gdpPppBn),
          active: n(c.activePersonnel),
          reserve: n(c.reservePersonnel),
          aircraft: n(c.totalAircraft),
          tanks: n(c.totalTanks),
          navy: n(c.totalNavy),
          nukes: n(c.nuclearWarheads),
        },
      };
    })
    .filter((p) => p.value > 0);
}

export function createMetricBubbleLayer(
  id: string,
  countries: ReadonlyArray<StrategicMapCountry>,
  metric: StrategicMetricKey,
  label: string,
  colorMode: "heat" | "blue" | "green" | "amber" | "purple" = "heat",
  radius: { min: number; max: number } = { min: 18000, max: 220000 },
): Layer {
  const points = buildMetricPoints(countries, metric, label);
  const color = (value: number): [number, number, number, number] => {
    switch (colorMode) {
      case "blue": return blueColor(value);
      case "green": return greenColor(value);
      case "amber": return amberColor(value);
      case "purple": return purpleColor(value);
      default: return heatColor(value);
    }
  };
  return new ScatterplotLayer<StrategicMetricPoint>({
    id,
    data: points,
    pickable: true,
    opacity: 0.82,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d) => d.position,
    getRadius: (d) => radius.min + (d.value / 100) * radius.max,
    getFillColor: (d) => color(d.value),
    getLineColor: (d) => sideColor(d.side),
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 72,
  });
}

export function createCountryOutlineLayer(
  geoJson: CountryCollection | null,
  countries: ReadonlyArray<StrategicMapCountry>,
  selectedISO: string | null,
  onCountryClick: (iso: string | null) => void,
): Layer | null {
  if (!geoJson) return null;
  const byIso = new Map(countries.map((c) => [c.isoCode, c]));
  return new GeoJsonLayer({
    id: "country-operational-outline",
    data: geoJson,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    lineWidthMinPixels: 1,
    getFillColor: ((feature: Feature<Polygon | MultiPolygon>) => {
      const iso = String(feature.properties?.iso ?? "");
      const c = byIso.get(iso);
      if (!c) return [15, 23, 42, 30];
      const base = sideColor(c.side ?? "NEUTRAL");
      const alpha = selectedISO === iso ? 88 : 30;
      return [base[0], base[1], base[2], alpha];
    }) as (feature: object) => [number, number, number, number],
    getLineColor: ((feature: Feature<Polygon | MultiPolygon>) => {
      const iso = String(feature.properties?.iso ?? "");
      const c = byIso.get(iso);
      if (!c) return [30, 41, 59, 120];
      const base = sideColor(c.side ?? "NEUTRAL");
      return selectedISO === iso ? [255, 255, 255, 230] : [base[0], base[1], base[2], 125];
    }) as (feature: object) => [number, number, number, number],
    getLineWidth: ((feature: Feature<Polygon | MultiPolygon>) => {
      const iso = String(feature.properties?.iso ?? "");
      return selectedISO === iso ? 2.2 : 0.8;
    }) as (feature: object) => number,
    onClick: (info: PickingInfo) => {
      const object = info.object as Feature<Polygon | MultiPolygon> | null;
      onCountryClick(object?.properties?.iso ? String(object.properties.iso) : null);
    },
  });
}

export function createSelectedRingsLayer(
  countries: ReadonlyArray<StrategicMapCountry>,
  selectedISO: string | null,
): Layer | null {
  if (!selectedISO) return null;
  const selected = countries.find((c) => c.isoCode === selectedISO);
  if (!selected) return null;
  const value = n(selected.bpAdvanced) || n(selected.bpTotal);
  const position = getPosition(selected.isoCode);
  const points: StrategicMetricPoint[] = [
    {
      iso: selected.isoCode,
      name: selected.nameRu || selected.name,
      position,
      value,
      label: "Выбранная страна",
      layer: "selected",
      side: selected.side ?? "NEUTRAL",
      coalition: selected.coalition ?? null,
      bp: value,
      extra: {},
    },
  ];
  return new ScatterplotLayer<StrategicMetricPoint>({
    id: "selected-country-rings",
    data: points,
    pickable: false,
    opacity: 0.65,
    stroked: true,
    filled: false,
    getPosition: (d) => d.position,
    getRadius: () => 260000,
    getFillColor: [0, 0, 0, 0],
    getLineColor: [34, 211, 238, 230],
    lineWidthMinPixels: 2,
    radiusUnits: "meters",
    radiusMinPixels: 12,
    radiusMaxPixels: 90,
  });
}

function hubForCountry(country: StrategicMapCountry): [number, number] | null {
  if (country.isoCode === "USA" || country.isoCode === "RUS" || country.isoCode === "CHN") return null;
  if (country.side === "NATO" || country.coalition === "NATO" || country.coalition === "AUKUS") return getPosition("USA");
  if (country.side === "RUS" || country.coalition === "CSTO") return getPosition("RUS");
  if (country.side === "CHINA" || country.coalition === "BRICS") return getPosition("CHN");
  if (country.side === "UKR") return getPosition("POL");
  return null;
}

export function createAllianceArcLayer(countries: ReadonlyArray<StrategicMapCountry>): Layer {
  const arcs: StrategicArcPoint[] = countries
    .map((c) => {
      const hub = hubForCountry(c);
      if (!hub) return null;
      return {
        iso: c.isoCode,
        name: c.nameRu || c.name,
        side: c.side ?? "NEUTRAL",
        source: hub,
        target: getPosition(c.isoCode),
        value: n(c.bpAdvanced) || n(c.bpTotal),
        label: c.coalition || c.side || "Связь",
      } satisfies StrategicArcPoint;
    })
    .filter((arc): arc is StrategicArcPoint => arc !== null);

  return new ArcLayer<StrategicArcPoint>({
    id: "alliance-arc-network",
    data: arcs,
    pickable: true,
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getSourceColor: (d) => sideColor(d.side),
    getTargetColor: (d) => sideColor(d.side),
    getWidth: (d) => 1 + (d.value / 100) * 4,
    getHeight: (d) => 0.25 + (d.value / 100) * 0.55,
    opacity: 0.55,
  });
}

export function createTopCountryLabelsLayer(countries: ReadonlyArray<StrategicMapCountry>): Layer {
  const labels: StrategicLabelPoint[] = [...countries]
    .sort((a, b) => (n(b.bpAdvanced) || n(b.bpTotal)) - (n(a.bpAdvanced) || n(a.bpTotal)))
    .slice(0, 24)
    .map((c) => {
      const value = n(c.bpAdvanced) || n(c.bpTotal);
      return {
        iso: c.isoCode,
        name: c.nameRu || c.name,
        position: getPosition(c.isoCode),
        value,
        text: `${c.isoCode} ${Math.round(value)}`,
      };
    });
  return new TextLayer<StrategicLabelPoint>({
    id: "top-country-labels",
    data: labels,
    pickable: false,
    getPosition: (d) => d.position,
    getText: (d) => d.text,
    getSize: (d) => 10 + (d.value / 100) * 8,
    getColor: [226, 232, 240, 220],
    getAngle: 0,
    getTextAnchor: "middle",
    getAlignmentBaseline: "center",
    background: true,
    getBackgroundColor: [2, 6, 23, 165],
    backgroundPadding: [4, 2],
    fontFamily: "monospace",
  });
}

export function createRiskHaloLayer(countries: ReadonlyArray<StrategicMapCountry>): Layer {
  const points = buildMetricPoints(countries, "risk", "Эскалационный риск").filter((p) => p.value >= 35);
  return new ScatterplotLayer<StrategicMetricPoint>({
    id: "risk-halo-layer",
    data: points,
    pickable: true,
    opacity: 0.32,
    stroked: false,
    filled: true,
    getPosition: (d) => d.position,
    getRadius: (d) => 80000 + (d.value / 100) * 420000,
    getFillColor: (d) => [239, 68, 68, Math.round(45 + d.value * 1.2)],
    radiusUnits: "meters",
    radiusMinPixels: 8,
    radiusMaxPixels: 115,
  });
}

export function getMapObjectTooltip(object: unknown): { html: string; style: Record<string, string> } | null {
  if (!object || typeof object !== "object") return null;
  const maybe = object as Partial<StrategicMetricPoint & StrategicArcPoint> & { properties?: Record<string, unknown> };
  const style = {
    backgroundColor: "rgba(2, 6, 23, 0.94)",
    border: "1px solid rgba(34, 211, 238, 0.35)",
    color: "#e2e8f0",
    fontFamily: "monospace",
    fontSize: "11px",
    padding: "8px 10px",
    borderRadius: "6px",
    boxShadow: "0 0 24px rgba(34, 211, 238, 0.14)",
  };
  if (maybe.position && maybe.name && maybe.label) {
    const extra = maybe.extra ?? {};
    return {
      html: `<div style="font-weight:700;color:#22d3ee;margin-bottom:4px">${maybe.name}</div><div>${maybe.label}: <b>${(maybe.value ?? 0).toFixed(1)}</b></div><div>BP: <b>${(maybe.bp ?? maybe.value ?? 0).toFixed(1)}</b> · ${maybe.side ?? ""}</div><div style="opacity:.7;margin-top:4px">Бюджет: $${formatNumber(Number(extra.budget ?? 0))}B · Авиация: ${formatNumber(Number(extra.aircraft ?? 0))} · Танки: ${formatNumber(Number(extra.tanks ?? 0))}</div>`,
      style,
    };
  }
  if (maybe.source && maybe.target && maybe.name) {
    return {
      html: `<div style="font-weight:700;color:#22d3ee;margin-bottom:4px">${maybe.name}</div><div>Связь: <b>${maybe.label ?? maybe.side}</b></div><div>Вес: <b>${(maybe.value ?? 0).toFixed(1)}</b></div>`,
      style,
    };
  }
  const props = maybe.properties;
  if (props?.name || props?.iso) {
    return {
      html: `<div style="font-weight:700;color:#22d3ee">${String(props.name ?? props.iso)}</div><div style="opacity:.75">ISO: ${String(props.iso ?? "")}</div>`,
      style,
    };
  }
  return null;
}
