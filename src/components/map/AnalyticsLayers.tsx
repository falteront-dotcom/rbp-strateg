"use client";

import { ArcLayer, ColumnLayer, GeoJsonLayer } from "@deck.gl/layers";
import { CompositeLayer } from "@deck.gl/core";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { scaleSequential } from "d3-scale";
import { oklchToRgb } from "@/lib/geo/oklch";
import { getPosition } from "@/lib/geo/country-centroids";
import { normalizeISO3 } from "@/lib/geo/country-boundaries";
import type { CountryCollection } from "@/lib/geo/country-boundaries";

// ─── Shared analytics contracts ────────────────────────────────────────

export interface AnalyticsCountry {
  isoCode: string;
  name: string;
  nameRu?: string;
  militaryBudgetBn: number;
  totalTanks: number;
  totalAircraft: number;
  totalNavy: number;
  nuclearWarheads: number | null;
}

export interface AnalyticsLayerOptions {
  selectedISO?: string | null;
  onHover?: (info: PickingInfo) => void;
  onClick?: (info: PickingInfo) => void;
}

export interface AnalyticsLegend {
  title: string;
  unit: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  lowColor: [number, number, number, number];
  highColor: [number, number, number, number];
}

const EMPTY_BOUNDS = { min: 0, max: 0 };

function canonicalISO(value: unknown): string | null {
  return normalizeISO3(value);
}

function getBounds(values: ReadonlyArray<number>): { min: number; max: number } {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (valid.length === 0) return EMPTY_BOUNDS;
  return { min: Math.min(...valid), max: Math.max(...valid) };
}

function normalized(value: number, bounds: { min: number; max: number }): number {
  const range = bounds.max - bounds.min;
  return range > 0 ? (value - bounds.min) / range : value > 0 ? 1 : 0;
}

function formatMetric(value: number, unit: string): string {
  if (unit === "млрд $") return `${value.toFixed(1)} ${unit}`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} тыс.`;
  return `${Math.round(value)} ${unit}`;
}

/** Metadata consumed by the map HUD and available to future legend renderers. */
export function getAnalyticsLayerLegend(
  layer: "budget" | "fleet" | "aviation" | "tanks" | "nukes",
  countries: ReadonlyArray<AnalyticsCountry>,
): AnalyticsLegend {
  const definitions = {
    budget: { title: "Оборонный бюджет", unit: "млрд $", key: "militaryBudgetBn" as const, colors: [budgetColorInterpolator(0), budgetColorInterpolator(1)] as const },
    fleet: { title: "Военно-морской флот", unit: "ед.", key: "totalNavy" as const, colors: [navyColorInterpolator(0), navyColorInterpolator(1)] as const },
    aviation: { title: "Военная авиация", unit: "ед.", key: "totalAircraft" as const, colors: [aircraftColorInterpolator(0), aircraftColorInterpolator(1)] as const },
    tanks: { title: "Бронетехника", unit: "ед.", key: "totalTanks" as const, colors: [tankColorInterpolator(0), tankColorInterpolator(1)] as const },
    nukes: { title: "Ядерный арсенал", unit: "боегол.", key: "nuclearWarheads" as const, colors: [nukeColorInterpolator(0), nukeColorInterpolator(1)] as const },
  } as const;
  const definition = definitions[layer];
  const bounds = getBounds(countries.map((country) => country[definition.key] ?? 0));
  return {
    title: definition.title,
    unit: definition.unit,
    min: bounds.min,
    max: bounds.max,
    minLabel: formatMetric(bounds.min, definition.unit),
    maxLabel: formatMetric(bounds.max, definition.unit),
    lowColor: definition.colors[0],
    highColor: definition.colors[1],
  };
}

// ─── OKLCH analytics palettes ─────────────────────────────────────────

function colorFromOklch(l: number, c: number, h: number, alpha: number): [number, number, number, number] {
  const rgb = oklchToRgb(l, c, h);
  return [rgb[0], rgb[1], rgb[2], alpha];
}

/** Budget: navy → cyan → gold. */
function budgetColorInterpolator(t: number): [number, number, number, number] {
  const value = Math.max(0, Math.min(1, t));
  if (value < 0.5) return colorFromOklch(0.42 + value * 0.36, 0.15 + value * 0.12, 155 - value * 55, 225);
  return colorFromOklch(0.60 + (value - 0.5) * 0.20, 0.21, 150 - (value - 0.5) * 110, 235);
}

/** Navy: deep blue → electric cyan. */
function navyColorInterpolator(t: number): [number, number, number, number] {
  const value = Math.max(0, Math.min(1, t));
  return colorFromOklch(0.38 + value * 0.38, 0.16 + value * 0.08, 255 - value * 45, 230);
}

/** Aviation: indigo → sky blue. */
function aircraftColorInterpolator(t: number): [number, number, number, number] {
  const value = Math.max(0, Math.min(1, t));
  return colorFromOklch(0.42 + value * 0.34, 0.13 + value * 0.08, 270 - value * 35, 225);
}

/** Tanks: olive → amber. */
function tankColorInterpolator(t: number): [number, number, number, number] {
  const value = Math.max(0, Math.min(1, t));
  return colorFromOklch(0.38 + value * 0.36, 0.12 + value * 0.12, 125 - value * 70, 230);
}

/** Nuclear arsenal: crimson → hot scarlet. */
function nukeColorInterpolator(t: number): [number, number, number, number] {
  const value = Math.max(0, Math.min(1, t));
  return colorFromOklch(0.32 + value * 0.38, 0.20 + value * 0.10, 18 - value * 12, 240);
}

interface MetricPoint {
  iso: string;
  name: string;
  position: [number, number];
  value: number;
}

interface MetricBin extends MetricPoint {
  count: number;
  members: string[];
}

function metricPoints(
  countries: ReadonlyArray<AnalyticsCountry>,
  key: "totalNavy" | "totalAircraft" | "totalTanks" | "nuclearWarheads",
): MetricPoint[] {
  return countries.flatMap((country) => {
    const value = country[key] ?? 0;
    const position = getPosition(country.isoCode);
    if (!Number.isFinite(value) || value <= 0 || (position[0] === 0 && position[1] === 0)) return [];
    const iso = canonicalISO(country.isoCode);
    if (!iso) return [];
    return [{ iso, name: country.nameRu ?? country.name, position, value }];
  });
}

/** Geographic aggregation reduces visual noise while preserving country drill-down IDs. */
function binPoints(points: ReadonlyArray<MetricPoint>, longitudeStep = 18, latitudeStep = 12): MetricBin[] {
  const bins = new Map<string, MetricBin>();
  for (const point of points) {
    const longitudeBucket = Math.floor((point.position[0] + 180) / longitudeStep);
    const latitudeBucket = Math.floor((point.position[1] + 90) / latitudeStep);
    const key = `${longitudeBucket}:${latitudeBucket}`;
    const current = bins.get(key);
    if (current) {
      const count = current.count + 1;
      current.position = [
        current.position[0] + (point.position[0] - current.position[0]) / count,
        current.position[1] + (point.position[1] - current.position[1]) / count,
      ];
      current.value += point.value;
      current.count = count;
      current.members.push(point.iso);
    } else {
      bins.set(key, { ...point, count: 1, members: [point.iso] });
    }
  }
  return [...bins.values()];
}

function commonColumnProps<T extends MetricPoint>(
  points: ReadonlyArray<T>,
  colorInterpolator: (value: number) => [number, number, number, number],
  lineColor: [number, number, number, number],
  minRadius: number,
  maxElevation: number,
  options: AnalyticsLayerOptions,
): Record<string, unknown> {
  const bounds = getBounds(points.map((point) => point.value));
  const selectedISO = canonicalISO(options.selectedISO);
  return {
    data: points,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: true,
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 34,
    diskResolution: 24,
    getPosition: (point: T) => point.position,
    getRadius: (point: T) => minRadius + normalized(point.value, bounds) * minRadius * 1.8,
    getElevation: (point: T) => 18000 + normalized(point.value, bounds) * maxElevation,
    getFillColor: (point: T) => {
      const isSelected = selectedISO === point.iso ||
        ("members" in point && Array.isArray(point.members) && point.members.includes(selectedISO ?? ""));
      return isSelected ? [255, 255, 255, 245] : colorInterpolator(normalized(point.value, bounds));
    },
    getLineColor: lineColor,
    getLineWidth: 1,
    onHover: options.onHover,
    onClick: options.onClick,
    transitions: {
      getRadius: { duration: 650 },
      getElevation: { duration: 700 },
      getFillColor: { duration: 450 },
    },
    updateTriggers: {
      getRadius: [bounds.min, bounds.max],
      getElevation: [bounds.min, bounds.max],
      getFillColor: [bounds.min, bounds.max, selectedISO],
    },
  };
}

// ─── Military budget choropleth ────────────────────────────────────────

interface BudgetProperties {
  iso?: string;
  ISO_A3?: string;
  ADM0_A3?: string;
  GU_A3?: string;
  [key: string]: unknown;
}

type BudgetFeature = Feature<Polygon | MultiPolygon, BudgetProperties>;
type BudgetCollection = FeatureCollection<Polygon | MultiPolygon, BudgetProperties>;

function featureISO(feature: BudgetFeature): string {
  const props = feature.properties;
  return canonicalISO(props.iso) ?? canonicalISO(props.ISO_A3) ??
    canonicalISO(props.ADM0_A3) ?? canonicalISO(props.GU_A3) ?? "";
}

export function createMilitaryBudgetLayer(
  data: BudgetCollection | CountryCollection | null,
  bounds: { min: number; max: number },
  options: AnalyticsLayerOptions = {},
  countries: ReadonlyArray<AnalyticsCountry> = [],
): Layer {
  const budgetByIso = new Map<string, number>();
  for (const country of countries) {
    const iso = canonicalISO(country.isoCode);
    if (iso) budgetByIso.set(iso, country.militaryBudgetBn);
  }
  const range = bounds.max - bounds.min || 1;
  const colorScale = scaleSequential(budgetColorInterpolator).domain([bounds.min, bounds.max]);
  return new GeoJsonLayer({
    id: "analytics-budget",
    data: data ?? undefined,
    visible: !!data,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: true,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,
    getFillColor: ((feature: BudgetFeature) => {
      const budget = typeof feature.properties.militaryBudgetBn === "number"
        ? feature.properties.militaryBudgetBn
        : budgetByIso.get(featureISO(feature)) ?? 0;
      if (budget <= 0) return [15, 25, 40, 100];
      // Important: d3 scaleSequential receives the real value, not a second normalized value.
      return colorScale(Math.max(bounds.min, Math.min(bounds.max, budget))) as [number, number, number, number];
    }) as (feature: object) => [number, number, number, number],
    getElevation: ((feature: BudgetFeature) => {
      const budget = typeof feature.properties.militaryBudgetBn === "number"
        ? feature.properties.militaryBudgetBn
        : budgetByIso.get(featureISO(feature)) ?? 0;
      const ratio = Math.max(0, Math.min(1, (budget - bounds.min) / range));
      return budget > 0 ? 2500 + ratio * 24000 : 0;
    }) as (feature: object) => number,
    getLineColor: ((feature: BudgetFeature) =>
      featureISO(feature) === canonicalISO(options.selectedISO) ? [255, 255, 255, 240] : [0, 190, 155, 100]) as (feature: object) => [number, number, number, number],
    getLineWidth: 1,
    onHover: options.onHover,
    onClick: options.onClick,
    transitions: { getFillColor: { duration: 500 }, getElevation: { duration: 700 } },
    updateTriggers: {
      getFillColor: [bounds.min, bounds.max, data, canonicalISO(options.selectedISO)],
      getLineColor: [canonicalISO(options.selectedISO)],
      getElevation: [bounds.min, bounds.max, data],
    },
  });
}

// ─── Navy fleet — arcs into regional clusters ──────────────────────────

function createFleetArcLayer(
  points: ReadonlyArray<MetricPoint>,
  bins: ReadonlyArray<MetricBin>,
  bounds: { min: number; max: number },
  options: AnalyticsLayerOptions,
): Layer {
  const binByIso = new Map<string, MetricBin>();
  for (const bin of bins) for (const iso of bin.members) binByIso.set(iso, bin);
  const arcs = points
    .map((point) => ({
      ...point,
      targetPosition: binByIso.get(point.iso)?.position ?? point.position,
    }))
    .filter((point) => Math.abs(point.position[0] - point.targetPosition[0]) + Math.abs(point.position[1] - point.targetPosition[1]) > 0.2);
  const colorScale = scaleSequential(navyColorInterpolator).domain([bounds.min, bounds.max]);
  return new ArcLayer({
    id: "analytics-navy-arcs",
    data: arcs,
    pickable: true,
    greatCircle: true,
    widthUnits: "pixels",
    widthMinPixels: 1,
    widthMaxPixels: 8,
    getSourcePosition: (point: (typeof arcs)[number]) => point.position,
    getTargetPosition: (point: (typeof arcs)[number]) => point.targetPosition,
    getSourceColor: (point: (typeof arcs)[number]) => colorScale(point.value) as [number, number, number, number],
    getTargetColor: () => [0, 230, 255, 210],
    getWidth: (point: (typeof arcs)[number]) => 1 + normalized(point.value, bounds) * 5,
    getHeight: 0.22,
    onHover: options.onHover,
    onClick: options.onClick,
    transitions: { getWidth: { duration: 650 } },
    updateTriggers: { getSourceColor: [bounds.min, bounds.max], getWidth: [bounds.min, bounds.max] },
  });
}

export function createNavyLayer(countries: ReadonlyArray<AnalyticsCountry>, options: AnalyticsLayerOptions = {}): Layer {
  const points = metricPoints(countries, "totalNavy");
  const bins = binPoints(points);
  const bounds = getBounds(points.map((point) => point.value));
  const clusterLayer = new ColumnLayer({
    id: "analytics-navy-clusters",
    ...commonColumnProps(bins, navyColorInterpolator, [0, 155, 255, 180], 65000, 150000, options),
  });
  return createCompositeAnalyticsLayer("analytics-navy", [createFleetArcLayer(points, bins, bounds, options), clusterLayer]);
}

// ─── Aviation and armour — binned 2.5D columns ─────────────────────────

function createBinnedEquipmentLayer(
  id: string,
  countries: ReadonlyArray<AnalyticsCountry>,
  key: "totalAircraft" | "totalTanks",
  colorInterpolator: (value: number) => [number, number, number, number],
  lineColor: [number, number, number, number],
  options: AnalyticsLayerOptions,
): Layer {
  const points = binPoints(metricPoints(countries, key));
  return new ColumnLayer({
    id,
    ...commonColumnProps(points, colorInterpolator, lineColor, 80000, 220000, options),
    radiusMaxPixels: 42,
  });
}

export function createAircraftLayer(countries: ReadonlyArray<AnalyticsCountry>, options: AnalyticsLayerOptions = {}): Layer {
  return createBinnedEquipmentLayer("analytics-aircraft", countries, "totalAircraft", aircraftColorInterpolator, [120, 160, 255, 180], options);
}

export function createTankLayer(countries: ReadonlyArray<AnalyticsCountry>, options: AnalyticsLayerOptions = {}): Layer {
  return createBinnedEquipmentLayer("analytics-tanks", countries, "totalTanks", tankColorInterpolator, [245, 190, 70, 180], options);
}

// ─── Nuclear arsenal — country columns with animated pulse ─────────────

export function createNukeLayer(countries: ReadonlyArray<AnalyticsCountry>, options: AnalyticsLayerOptions = {}): Layer {
  const points = metricPoints(countries, "nuclearWarheads");
  return new ColumnLayer({
    id: "analytics-nukes",
    ...commonColumnProps(points, nukeColorInterpolator, [255, 75, 75, 230], 60000, 340000, options),
    radiusMaxPixels: 48,
    transitions: {
      getRadius: { duration: 900 },
      getElevation: { duration: 900 },
      getFillColor: { duration: 650 },
    },
  });
}

// ─── Small composite wrapper keeps the public builder API stable ───────

class AnalyticsCompositeLayer extends CompositeLayer<{ layers: Layer[] }> {
  static layerName = "AnalyticsCompositeLayer";
  renderLayers(): Layer[] {
    return this.props.layers;
  }
}

function createCompositeAnalyticsLayer(id: string, layers: Layer[]): Layer {
  return new AnalyticsCompositeLayer({ id, layers, pickable: true });
}

export { budgetColorInterpolator, navyColorInterpolator, aircraftColorInterpolator, tankColorInterpolator, nukeColorInterpolator };
