"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import type { CountryCollection } from "@/lib/geo/country-boundaries";
import type { StrategicObject } from "@/lib/geo/strategic-objects";
import type { AnalyticsLayerKey, CountryMapData } from "./map-types";

interface NativeMapLayersProps {
  countries: CountryCollection | null;
  objects: readonly StrategicObject[];
  countriesRaw: ReadonlyArray<CountryMapData>;
  activeLayer: AnalyticsLayerKey;
  minBP: number;
  maxBP: number;
  selectedISO: string | null;
  hoveredISO: string | null;
  visible: boolean;
  objectsVisible: boolean;
}

function rgba(color: [number, number, number, number]): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
}

function bpColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0.5) {
    const s = clamped * 2;
    return rgba([0, Math.round(205 + s * 35), Math.round(175 - s * 105), 220]);
  }
  const s = (clamped - 0.5) * 2;
  return rgba([Math.round(s * 255), Math.round(240 - s * 90), Math.round(70 - s * 45), 225]);
}

function objectFeatures(objects: readonly StrategicObject[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: objects.map((object) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [object.longitude, object.latitude] },
      properties: {
        id: object.id,
        isoCode: object.isoCode,
        name: object.name,
        type: object.type,
        confidence: object.confidence,
        source: object.source,
      },
    })),
  };
}

export function NativeMapLayers({
  countries,
  objects,
  countriesRaw,
  activeLayer,
  minBP,
  maxBP,
  selectedISO,
  hoveredISO,
  visible,
  objectsVisible,
}: NativeMapLayersProps) {
  const range = Math.max(1, maxBP - minBP);
  const low = bpColor(0);
  const middle = bpColor(0.5);
  const high = bpColor(1);
  const fillColor = [
    "case",
    ["<=", ["coalesce", ["get", "bpScore"], 0], 0],
    "rgba(29, 43, 52, 0.24)",
    [
      "interpolate",
      ["linear"],
      ["get", "bpScore"],
      minBP,
      low,
      minBP + range / 2,
      middle,
      maxBP,
      high,
    ],
  ] as unknown as ExpressionSpecification;
  const lineColor = [
    "case",
    ["==", ["get", "ISO_A3"], selectedISO ?? "__none__"],
    "#f5d76e",
    ["==", ["get", "ISO_A3"], hoveredISO ?? "__none__"],
    "#7de8ff",
    "rgba(80, 135, 151, 0.68)",
  ] as unknown as ExpressionSpecification;
  const metricKey = activeLayer === "budget" ? "militaryBudgetBn" : activeLayer === "fleet" ? "totalNavy" : activeLayer === "aviation" ? "totalAircraft" : activeLayer === "tanks" ? "totalTanks" : "nuclearWarheads";
  const metricValues = countriesRaw.map((country) => country[metricKey]).filter((value) => value > 0);
  const metricMin = metricValues.length ? Math.min(...metricValues) : 0;
  const metricMax = metricValues.length ? Math.max(...metricValues) : 1;
  const metricColor = activeLayer === "nukes" ? ["#f0445e", "#ffbd4a"] : activeLayer === "fleet" ? ["#3a9edb", "#a9f0ff"] : activeLayer === "aviation" ? ["#667eea", "#b8c5ff"] : activeLayer === "tanks" ? ["#6eaa45", "#d6e875"] : ["#9b70d6", "#f4b6ff"];
  const metricByIso = useMemo(() => new Map(countriesRaw.map((country) => [country.isoCode, country])), [countriesRaw]);
  const countryData = useMemo(() => countries ? ({
    ...countries,
    features: countries.features.map((feature) => {
      const iso = String(feature.properties.ISO_A3 ?? feature.properties.ADM0_A3 ?? "");
      const country = metricByIso.get(iso);
      return { ...feature, properties: { ...feature.properties, ...country } };
    }),
  }) : null, [countries, metricByIso]);
  const objectData = useMemo(() => objectFeatures(objects), [objects]);
  const metricFillColor = [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", metricKey], 0],
    metricMin,
    metricColor[0],
    metricMax,
    metricColor[1],
  ] as unknown as ExpressionSpecification;
  const fillOpacity = (activeLayer === "bp"
    ? [
      "case",
      ["==", ["get", "ISO_A3"], selectedISO ?? "__none__"],
      0.82,
      ["==", ["get", "ISO_A3"], hoveredISO ?? "__none__"],
      0.72,
      0.58,
    ]
    : 0.72) as number | ExpressionSpecification;
  const lineWidth = (activeLayer === "bp"
    ? [
      "case",
      ["==", ["get", "ISO_A3"], selectedISO ?? "__none__"],
      2.2,
      ["==", ["get", "ISO_A3"], hoveredISO ?? "__none__"],
      1.6,
      0.7,
    ]
    : 0.7) as number | ExpressionSpecification;

  if (!countryData) return null;

  return (
    <>
      <Source id="rbp-countries" type="geojson" data={countryData}>
        <Layer
          id="rbp-country-fill"
          type="fill"
          paint={{
            "fill-color": activeLayer === "bp" ? (visible ? fillColor : "rgba(0, 0, 0, 0)") : metricFillColor,
            "fill-opacity": fillOpacity,
          }}
        />
        <Layer
          id="rbp-country-line"
          type="line"
          paint={{
            "line-color": activeLayer === "bp" ? (visible ? lineColor : "rgba(50, 85, 99, 0.42)") : "rgba(106, 180, 191, 0.68)",
            "line-width": lineWidth,
          }}
        />
      </Source>

      <Source
        id="rbp-strategic-objects"
        type="geojson"
        data={objectData}
        cluster
        clusterMaxZoom={5}
        clusterRadius={42}
      >
        <Layer
          id="rbp-object-clusters"
          type="circle"
          filter={["has", "point_count"]}
          layout={{ visibility: objectsVisible ? "visible" : "none" }}
          paint={{
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#24b8c7",
              20,
              "#e7b948",
              80,
              "#ef785d",
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15,
              20,
              20,
              80,
              26,
            ],
            "circle-opacity": 0.88,
            "circle-stroke-color": "#08141d",
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="rbp-object-cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            visibility: objectsVisible ? "visible" : "none",
            "text-field": ["to-string", ["get", "point_count"]],
            "text-size": 10,
            "text-font": ["Open Sans Bold"],
            "text-allow-overlap": true,
          }}
          paint={{
            "text-color": "#071018",
          }}
        />
        <Layer
          id="rbp-object-points"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          layout={{ visibility: objectsVisible ? "visible" : "none" }}
          paint={{
            "circle-color": [
              "match",
              ["get", "type"],
              "capital",
              "#f5c85b",
              "military-base",
              "#e56b68",
              "naval-base",
              "#dc6be5",
              "airport",
              "#7bb7ff",
              "port",
              "#5bd4c8",
              "#34b8cb",
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2,
              2.5,
              5,
              4,
              10,
              6,
            ],
            "circle-opacity": 0.92,
            "circle-stroke-color": "#071018",
            "circle-stroke-width": 1,
          }}
        />
        <Layer
          id="rbp-object-labels"
          type="symbol"
          filter={[
            "all",
            ["!", ["has", "point_count"]],
            [
              "any",
              ["==", ["get", "type"], "capital"],
              ["==", ["get", "type"], "military-base"],
              ["==", ["get", "type"], "naval-base"],
            ],
          ] as unknown as FilterSpecification}
          minzoom={3.5}
          layout={{
            visibility: objectsVisible ? "visible" : "none",
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 3.5, 8, 7, 10],
            "text-font": ["Open Sans Regular"],
            "text-offset": [0, 1.15],
            "text-anchor": "top",
            "text-max-width": 10,
            "text-allow-overlap": false,
            "text-ignore-placement": false,
          }}
          paint={{
            "text-color": "#b9e5e8",
            "text-halo-color": "#071018",
            "text-halo-width": 1.2,
            "text-opacity": 0.86,
          }}
        />
      </Source>
    </>
  );
}
