"use client";

import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { scaleSequential } from "d3-scale";
import { getPosition } from "@/lib/geo/country-centroids";
import type { Country } from "@/db/schema";

// ─── OKLCH → sRGB conversion (shared with ChoroplethLayer) ─────────────

function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hueRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRad);
  const b = c * Math.sin(hueRad);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  const r = +4.0767416621 * l3 - 3.3079834258 * m3 + 0.2309640425 * s3;
  const g = -1.2681438942 * l3 + 2.6093399734 * m3 - 0.3411344294 * s3;
  const bl = -0.0041119484 * l3 - 0.7037628646 * m3 + 1.7070697198 * s3;
  return [
    Math.round(Math.max(0, Math.min(255, r * 255))),
    Math.round(Math.max(0, Math.min(255, g * 255))),
    Math.round(Math.max(0, Math.min(255, bl * 255))),
  ];
}

// ─── OKLCH Color Scales ────────────────────────────────────────────────

/** Budget scale: dark teal → bright gold → hot amber */
function budgetColorInterpolator(t: number): [number, number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  let lightness: number;
  let chroma: number;
  let hue: number;
  if (tc <= 0.4) {
    const s = tc / 0.4;
    lightness = 40 + s * 20;
    chroma = 0.12 + s * 0.06;
    hue = 220 - s * 40;
  } else if (tc <= 0.75) {
    const s = (tc - 0.4) / 0.35;
    lightness = 60 + s * 15;
    chroma = 0.18 + s * 0.04;
    hue = 180 - s * 80;
  } else {
    const s = (tc - 0.75) / 0.25;
    lightness = 75 - s * 10;
    chroma = 0.22 + s * 0.06;
    hue = 100 - s * 30;
  }
  const rgb = oklchToRgb(lightness / 100, chroma, hue);
  return [rgb[0], rgb[1], rgb[2], 210];
}

/** Navy scale: deep navy → bright cyan → electric teal */
function navyColorInterpolator(t: number): [number, number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  let lightness: number;
  let chroma: number;
  let hue: number;
  if (tc <= 0.5) {
    const s = tc * 2;
    lightness = 35 + s * 25;
    chroma = 0.14 + s * 0.06;
    hue = 250 - s * 30;
  } else {
    const s = (tc - 0.5) * 2;
    lightness = 60 + s * 15;
    chroma = 0.20 + s * 0.05;
    hue = 220 - s * 20;
  }
  const rgb = oklchToRgb(lightness / 100, chroma, hue);
  return [rgb[0], rgb[1], rgb[2], 200];
}

/** Aircraft scale: slate blue → sky blue → white-blue */
function aircraftColorInterpolator(t: number): [number, number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  let lightness: number;
  let chroma: number;
  let hue: number;
  if (tc <= 0.5) {
    const s = tc * 2;
    lightness = 40 + s * 25;
    chroma = 0.10 + s * 0.08;
    hue = 260 - s * 20;
  } else {
    const s = (tc - 0.5) * 2;
    lightness = 65 + s * 15;
    chroma = 0.18 + s * 0.04;
    hue = 240 - s * 10;
  }
  const rgb = oklchToRgb(lightness / 100, chroma, hue);
  return [rgb[0], rgb[1], rgb[2], 200];
}

/** Tank scale: olive drab → amber → hot orange */
function tankColorInterpolator(t: number): [number, number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  let lightness: number;
  let chroma: number;
  let hue: number;
  if (tc <= 0.4) {
    const s = tc / 0.4;
    lightness = 35 + s * 20;
    chroma = 0.10 + s * 0.06;
    hue = 120 - s * 30;
  } else if (tc <= 0.75) {
    const s = (tc - 0.4) / 0.35;
    lightness = 55 + s * 15;
    chroma = 0.16 + s * 0.06;
    hue = 90 - s * 30;
  } else {
    const s = (tc - 0.75) / 0.25;
    lightness = 70 - s * 5;
    chroma = 0.22 + s * 0.04;
    hue = 60 - s * 15;
  }
  const rgb = oklchToRgb(lightness / 100, chroma, hue);
  return [rgb[0], rgb[1], rgb[2], 200];
}

/** Nuke scale: deep crimson → blood red → searing scarlet */
function nukeColorInterpolator(t: number): [number, number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  let lightness: number;
  let chroma: number;
  let hue: number;
  if (tc <= 0.3) {
    const s = tc / 0.3;
    lightness = 25 + s * 15;
    chroma = 0.18 + s * 0.06;
    hue = 15 - s * 5;
  } else if (tc <= 0.7) {
    const s = (tc - 0.3) / 0.4;
    lightness = 40 + s * 20;
    chroma = 0.24 + s * 0.04;
    hue = 10 - s * 3;
  } else {
    const s = (tc - 0.7) / 0.3;
    lightness = 60 + s * 10;
    chroma = 0.28 + s * 0.04;
    hue = 7 - s * 2;
  }
  const rgb = oklchToRgb(lightness / 100, chroma, hue);
  return [rgb[0], rgb[1], rgb[2], 220];
}

// ─── Scatter point type for ScatterplotLayer ───────────────────────────

interface ScatterPoint {
  iso: string;
  name: string;
  position: [number, number];
  value: number;
}

// ─── Helper: compute data bounds ───────────────────────────────────────

function computeBounds(countries: ReadonlyArray<Country>, key: keyof Country): {
  min: number;
  max: number;
} {
  let min = Infinity;
  let max = -Infinity;
  for (const c of countries) {
    const val = c[key];
    if (typeof val === "number") {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 100;
  return { min, max };
}

// ─── 1. Military Budget Layer (GeoJsonLayer) ──────────────────────────

interface BudgetFeature extends Feature<Polygon | MultiPolygon> {
  properties: Feature<Polygon | MultiPolygon>["properties"] & {
    iso: string;
    name: string;
    militaryBudgetBn: number;
  };
}

type BudgetCollection = FeatureCollection<Polygon | MultiPolygon, BudgetFeature["properties"]>;

export function createMilitaryBudgetLayer(
  data: BudgetCollection | null,
  bounds: { min: number; max: number },
): Layer {
  const range = bounds.max - bounds.min || 1;
  const colorScale = scaleSequential(budgetColorInterpolator).domain([bounds.min, bounds.max]);

  return new GeoJsonLayer({
    id: "analytics-budget",
    data: data ?? undefined,
    visible: !!data,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    wireframe: false,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,
    getFillColor: ((feature: BudgetFeature) => {
      const budget = feature.properties.militaryBudgetBn;
      if (budget <= 0) return [20, 30, 40, 80];
      const t = (budget - bounds.min) / range;
      return colorScale(t) as [number, number, number, number];
    }) as any,
    getLineColor: [0, 150, 180, 50] as any,
    getLineWidth: 1 as any,
    onHover: (info: PickingInfo) => {
      // Hover handled by parent StrategicMap
    },
    updateTriggers: {
      getFillColor: [bounds.min, bounds.max, data],
    },
  });
}

// ─── 2. Navy Fleet Layer (ScatterplotLayer) ───────────────────────────

export function createNavyLayer(
  countries: ReadonlyArray<Country>,
): Layer {
  const { min, max } = computeBounds(countries, "totalNavy");
  const range = max - min || 1;
  const colorScale = scaleSequential(navyColorInterpolator).domain([min, max]);

  const points: ScatterPoint[] = countries
    .filter((c) => c.totalNavy > 0)
    .map((c) => ({
      iso: c.isoCode,
      name: c.name,
      position: getPosition(c.isoCode),
      value: c.totalNavy,
    }));

  return new ScatterplotLayer({
    id: "analytics-navy",
    data: points,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: ((d: ScatterPoint) => d.position) as any,
    getRadius: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return 15000 + t * 180000;
    }) as any,
    getFillColor: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return colorScale(t) as [number, number, number, number];
    }) as any,
    getLineColor: [0, 180, 220, 120] as any,
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 60,
    updateTriggers: {
      getRadius: [min, max],
      getFillColor: [min, max],
    },
  });
}

// ─── 3. Aircraft Fleet Layer (ScatterplotLayer) ───────────────────────

export function createAircraftLayer(
  countries: ReadonlyArray<Country>,
): Layer {
  const { min, max } = computeBounds(countries, "totalAircraft");
  const range = max - min || 1;
  const colorScale = scaleSequential(aircraftColorInterpolator).domain([min, max]);

  const points: ScatterPoint[] = countries
    .filter((c) => c.totalAircraft > 0)
    .map((c) => ({
      iso: c.isoCode,
      name: c.name,
      position: getPosition(c.isoCode),
      value: c.totalAircraft,
    }));

  return new ScatterplotLayer({
    id: "analytics-aircraft",
    data: points,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: ((d: ScatterPoint) => d.position) as any,
    getRadius: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return 20000 + t * 200000;
    }) as any,
    getFillColor: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return colorScale(t) as [number, number, number, number];
    }) as any,
    getLineColor: [100, 130, 255, 120] as any,
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 60,
    updateTriggers: {
      getRadius: [min, max],
      getFillColor: [min, max],
    },
  });
}

// ─── 4. Nuclear Warhead Layer (ScatterplotLayer) ──────────────────────

export function createNukeLayer(
  countries: ReadonlyArray<Country>,
): Layer {
  const { min, max } = computeBounds(countries, "nuclearWarheads");
  const range = max - min || 1;
  const colorScale = scaleSequential(nukeColorInterpolator).domain([min, max]);

  const points: ScatterPoint[] = countries
    .filter((c): c is Country & { nuclearWarheads: number } => (c.nuclearWarheads ?? 0) > 0)
    .map((c) => ({
      iso: c.isoCode,
      name: c.name,
      position: getPosition(c.isoCode),
      value: c.nuclearWarheads,
    }))

  return new ScatterplotLayer({
    id: "analytics-nukes",
    data: points,
    pickable: true,
    opacity: 0.85,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 2,
    getPosition: ((d: ScatterPoint) => d.position) as any,
    getRadius: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return 30000 + t * 250000;
    }) as any,
    getFillColor: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return colorScale(t) as [number, number, number, number];
    }) as any,
    getLineColor: [255, 60, 60, 180] as any,
    radiusUnits: "meters",
    radiusMinPixels: 5,
    radiusMaxPixels: 70,
    updateTriggers: {
      getRadius: [min, max],
      getFillColor: [min, max],
    },
  });
}

// ─── 5. Tank Fleet Layer (ScatterplotLayer) ───────────────────────────

export function createTankLayer(
  countries: ReadonlyArray<Country>,
): Layer {
  const { min, max } = computeBounds(countries, "totalTanks");
  const range = max - min || 1;
  const colorScale = scaleSequential(tankColorInterpolator).domain([min, max]);

  const points: ScatterPoint[] = countries
    .filter((c) => c.totalTanks > 0)
    .map((c) => ({
      iso: c.isoCode,
      name: c.name,
      position: getPosition(c.isoCode),
      value: c.totalTanks,
    }));

  return new ScatterplotLayer({
    id: "analytics-tanks",
    data: points,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: ((d: ScatterPoint) => d.position) as any,
    getRadius: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return 18000 + t * 190000;
    }) as any,
    getFillColor: ((d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return colorScale(t) as [number, number, number, number];
    }) as any,
    getLineColor: [200, 160, 60, 120] as any,
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 60,
    updateTriggers: {
      getRadius: [min, max],
      getFillColor: [min, max],
    },
  });
}
