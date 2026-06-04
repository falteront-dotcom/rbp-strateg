"use client";

import { GeoJsonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { scaleSequential } from "d3-scale";
import type { CountryCollection, NaturalEarthProperties } from "@/lib/geo/country-boundaries";

/** BP data bound to a country for the choropleth */
export interface CountryBPData {
  iso: string;
  name: string;
  bpScore: number;
  bpRank: number | null;
  region: string;
  alliance: string | null;
}

/** Extended properties after BP merge */
interface BPEnrichedProperties extends NaturalEarthProperties {
  bpScore: number;
  bpRank: number | null;
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

/** Simplified OKLCH → sRGB conversion */
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

/** OKLCH color interpolator: teal → yellow → red-orange */
function bpColorInterpolator(t: number): [number, number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  let lightness: number;
  let chroma: number;
  let hue: number;
  if (tc <= 0.5) {
    const s = tc * 2;
    lightness = 75 + s * 10;
    chroma = 0.18;
    hue = 200 - s * 110;
  } else {
    const s = (tc - 0.5) * 2;
    lightness = 85 - s * 20;
    chroma = 0.18 + s * 0.07;
    hue = 90 - s * 65;
  }
  const rgb = oklchToRgb(lightness / 100, chroma, hue);
  return [rgb[0], rgb[1], rgb[2], 200];
}

/** Extract ISO from enriched feature */
function featureISO(feature: BPFeature): string | null {
  const p = feature.properties;
  if (p.ISO_A3 && p.ISO_A3 !== "-99") return p.ISO_A3 as string;
  if (p.ADM0_A3 && p.ADM0_A3 !== "-99") return p.ADM0_A3 as string;
  if (p.GU_A3 && p.GU_A3 !== "-99") return p.GU_A3 as string;
  return null;
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
  // NOTE: This is a PURE FUNCTION, not a React component with hooks.
  // It is called inside useMemo in StrategicMap, so no hooks allowed here.

  const colorScale = scaleSequential(bpColorInterpolator).domain([minBP, maxBP]);

  // Merge GeoJSON with BP data
  const bpMap = new Map<string, CountryBPData>();
  for (const rec of countryBPData) bpMap.set(rec.iso, rec);
  const enrichedData: CountryCollection | null = data ? {
    type: "FeatureCollection",
    features: data.features.map((f) => {
      const iso =
        f.properties.ISO_A3 !== "-99"
          ? f.properties.ISO_A3
          : f.properties.ADM0_A3 !== "-99"
            ? f.properties.ADM0_A3
            : f.properties.GU_A3 !== "-99"
              ? f.properties.GU_A3
              : null;
      const bp = iso ? bpMap.get(iso) : undefined;
      return {
        ...f,
        properties: {
          ...f.properties,
          bpScore: bp?.bpScore ?? 0,
          bpRank: bp?.bpRank ?? null,
        },
      };
    }),
  } : null;

  const layer = new GeoJsonLayer({
        id: "choropleth-bp",
        data: enrichedData ?? undefined,
        visible: !!enrichedData,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        wireframe: false,
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 3,
        // deck.gl 9: accessors receive (feature) directly
        getFillColor: ((feature: BPFeature) => {
          const iso = featureISO(feature);
          const bp = feature.properties.bpScore;
          if (bp <= 0) return [20, 30, 40, 80];
          const range = maxBP - minBP || 1;
          const t = (bp - minBP) / range;
          const baseColor = colorScale(t) as [number, number, number, number];

          if (iso && iso === hoveredISO) {
            return [
              Math.min(255, baseColor[0] + 30),
              Math.min(255, baseColor[1] + 30),
              Math.min(255, baseColor[2] + 30),
              240,
            ];
          }
          if (selectedISO && iso !== selectedISO) {
            return [baseColor[0], baseColor[1], baseColor[2], 100];
          }
          if (iso && iso === selectedISO) {
            return [
              Math.min(255, baseColor[0] + 15),
              Math.min(255, baseColor[1] + 15),
              Math.min(255, baseColor[2] + 15),
              255,
            ];
          }
          return baseColor;
        }) as any,
        getLineColor: ((feature: BPFeature) => {
          const iso = featureISO(feature);
          if (iso && iso === selectedISO) return [0, 220, 230, 255];
          if (iso && iso === hoveredISO) return [0, 180, 200, 220];
          return [0, 150, 180, 60];
        }) as any,
        getLineWidth: ((feature: BPFeature) => {
          const iso = featureISO(feature);
          if (iso === selectedISO) return 3;
          if (iso === hoveredISO) return 2;
          return 1;
        }) as any,
        onHover: (info: PickingInfo) => {
          const feature = info.object as BPFeature | undefined;
          const iso = feature ? featureISO(feature) : null;
          onCountryHover(iso, info);
        },
        onClick: (info: PickingInfo) => {
          const feature = info.object as BPFeature | undefined;
          const iso = feature ? featureISO(feature) : null;
          onCountryClick(iso);
        },
        updateTriggers: {
          getFillColor: [hoveredISO, selectedISO, enrichedData, minBP, maxBP],
          getLineColor: [hoveredISO, selectedISO],
          getLineWidth: [hoveredISO, selectedISO],
        },
      });

  return layer;
}

export default ChoroplethLayer;
