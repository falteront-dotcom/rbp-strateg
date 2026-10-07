"use client";

import { GeoJsonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { scaleSequential } from "d3-scale";
import { bpColorInterpolator } from "@/lib/geo/oklch";
import { normalizeISO3 } from "@/lib/geo/country-boundaries";
import type { CountryCollection, NaturalEarthProperties } from "@/lib/geo/country-boundaries";

export { bpColorInterpolator, oklchToRgb } from "@/lib/geo/oklch";

/** BP data bound to a country for the choropleth. */
export interface CountryBPData {
  iso: string;
  name: string;
  bpScore: number;
  bpRank: number | null;
  region: string;
  alliance: string | null;
}

/** Extended properties after BP merge. */
interface BPEnrichedProperties extends NaturalEarthProperties {
  bpScore: number;
  bpRank: number | null;
  hasBPData: boolean;
}

type BPFeature = Feature<Polygon | MultiPolygon, BPEnrichedProperties>;

interface ChoroplethLayerProps {
  data: CountryCollection | null;
  countryBPData: ReadonlyArray<CountryBPData>;
  selectedISO: string | null;
  hoveredISO: string | null;
  onCountryHover: (iso: string | null, info: PickingInfo) => void;
  onCountryClick: (iso: string | null) => void;
  minBP: number;
  maxBP: number;
}

function canonicalISO(value: unknown): string | null {
  return normalizeISO3(value);
}

/** Extract ISO from Natural Earth features, including disputed territories. */
export function featureISO(feature: BPFeature): string | null {
  const properties = feature.properties;
  return (
    canonicalISO(properties.ISO_A3) ??
    canonicalISO(properties.ADM0_A3) ??
    canonicalISO(properties.GU_A3)
  );
}

function finiteBP(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function normaliseDomain(minBP: number, maxBP: number): [number, number] {
  const min = Number.isFinite(minBP) ? minBP : 0;
  const max = Number.isFinite(maxBP) ? maxBP : min + 1;
  return max > min ? [min, max] : [min, min + 1];
}

function dimmed(color: [number, number, number, number]): [number, number, number, number] {
  return [color[0], color[1], color[2], 104];
}

export function ChoroplethLayer({
  data,
  countryBPData,
  selectedISO,
  hoveredISO,
  onCountryHover,
  onCountryClick,
  minBP,
  maxBP,
}: ChoroplethLayerProps) {
  // This is a pure layer factory, called from StrategicMap's useMemo.
  const domain = normaliseDomain(minBP, maxBP);
  // d3-scale maps real BP values to [0, 1] before invoking the OKLCH palette.
  // Do not pass an already-normalised value back into this scale.
  const colorScale = scaleSequential(bpColorInterpolator).domain(domain);
  const selected = canonicalISO(selectedISO);
  const hovered = canonicalISO(hoveredISO);

  const bpMap = new Map<string, CountryBPData>();
  for (const record of countryBPData) {
    const iso = canonicalISO(record.iso);
    if (iso) bpMap.set(iso, record);
  }

  const enrichedData: CountryCollection | null = data
    ? {
        type: "FeatureCollection",
        features: data.features.map((feature) => {
          const iso = canonicalISO(feature.properties.ISO_A3)
            ?? canonicalISO(feature.properties.ADM0_A3)
            ?? canonicalISO(feature.properties.GU_A3);
          const bp = iso ? bpMap.get(iso) : undefined;
          const score = finiteBP(bp?.bpScore);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              bpScore: score ?? 0,
              bpRank: bp?.bpRank ?? null,
              hasBPData: score !== null,
            },
          };
        }),
      }
    : null;

  const layer = new GeoJsonLayer({
    id: "choropleth-bp",
    data: enrichedData ?? undefined,
    visible: !!enrichedData,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: true,
    wireframe: false,
    elevationScale: 1,
    getElevation: ((feature: BPFeature) => {
      const score = finiteBP(feature.properties.bpScore);
      if (score === null) return 0;
      const ratio = Math.max(0, Math.min(1, (score - domain[0]) / (domain[1] - domain[0])));
      // Keep the relief legible at the map's default pitch without turning
      // continental polygons into spikes.
      return 120 + ratio ** 1.15 * 1450;
    }) as any,
    material: {
      ambient: 0.62,
      diffuse: 0.78,
      shininess: 20,
      specularColor: [80, 210, 225],
    },
    lineWidthMinPixels: 0.75,
    lineWidthMaxPixels: 5,
    getFillColor: ((feature: BPFeature) => {
      const iso = featureISO(feature);
      if (!feature.properties.hasBPData) return [18, 29, 40, 166];

      const base = colorScale(feature.properties.bpScore) as [number, number, number, number];
      if (selected && iso !== selected) return dimmed(base);
      if (iso === selected) return [Math.min(255, base[0] + 18), Math.min(255, base[1] + 18), Math.min(255, base[2] + 18), 255];
      if (iso === hovered) return [Math.min(255, base[0] + 24), Math.min(255, base[1] + 24), Math.min(255, base[2] + 24), 250];
      return base;
    }) as any,
    getLineColor: ((feature: BPFeature) => {
      const iso = featureISO(feature);
      if (iso === selected) return [255, 226, 132, 255];
      if (iso === hovered) return [110, 242, 239, 255];
      if (!feature.properties.hasBPData) return [92, 112, 126, 150];
      return [87, 151, 169, 178];
    }) as any,
    getLineWidth: ((feature: BPFeature) => {
      const iso = featureISO(feature);
      if (iso === selected) return 4;
      if (iso === hovered) return 2.5;
      if (!feature.properties.hasBPData) return 0.8;
      return 1.1;
    }) as any,
    onHover: (info: PickingInfo) => {
      const feature = info.object as BPFeature | undefined;
      onCountryHover(feature ? featureISO(feature) : null, info);
    },
    onClick: (info: PickingInfo) => {
      const feature = info.object as BPFeature | undefined;
      onCountryClick(feature ? featureISO(feature) : null);
    },
    transitions: {
      getFillColor: 450,
      getLineColor: 300,
      getLineWidth: 300,
      getElevation: 650,
    },
    updateTriggers: {
      getFillColor: [hovered, selected, enrichedData, domain[0], domain[1]],
      getLineColor: [hovered, selected, enrichedData],
      getLineWidth: [hovered, selected, enrichedData],
      getElevation: [enrichedData, domain[0], domain[1]],
    },
  });

  return layer;
}

export default ChoroplethLayer;
