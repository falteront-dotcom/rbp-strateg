"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL from "react-map-gl/maplibre";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import { scaleSequential } from "d3-scale";
import { MapErrorBoundary } from './MapErrorBoundary';
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

import "maplibre-gl/dist/maplibre-gl.css";

import type { CountryBPData } from "./ChoroplethLayer";
import { MapControls, MAP_STYLE_URLS } from "./MapControls";
import type { MapStyle } from "./MapControls";
import { CountryPopup } from "./CountryPopup";
import { StrategicObjectPopup } from "./StrategicObjectPopup";
import { ObjectLayerControls } from "./ObjectLayerControls";
import { MapDataLegend } from "./MapDataLegend";
import { NativeMapLayers } from "./NativeMapLayers";
import { LayerSelector } from "./LayerSelector";
import type { AnalyticsLayerKey } from "./LayerSelector";
import type { CountryMapData } from "./map-types";
import {
  findISOFromCoords,
  loadCountryBoundaries,
  mergeWithBPData,
} from "@/lib/geo/country-boundaries";
import type { CountryCollection, CountryBPRecord } from "@/lib/geo/country-boundaries";
import { getPosition } from "@/lib/geo/country-centroids";
import { STRATEGIC_OBJECTS, type StrategicObject, type StrategicObjectType } from "@/lib/geo/strategic-objects";

// ─── OKLCH → sRGB conversion (shared with AnalyticsLayers) ─────────────

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

// ─── Analytics Layer Color Scales ──────────────────────────────────────

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

// ─── Scatter point type for analytics layers ──────────────────────────

interface ScatterPoint {
  iso: string;
  name: string;
  position: [number, number];
  value: number;
}

/** Shape of a country row from the /api/countries response */

/** Default initial view state: a complete world view */
const INITIAL_VIEW = {
  longitude: 0,
  latitude: 20,
  zoom: 0.8,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
  width: 0,
  height: 0,
} as const;

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  padding: { top: number; bottom: number; left: number; right: number };
  width: number;
  height: number;
}

// ─── Props ────────────────────────────────────────────────────────────

interface StrategicMapProps {
  /** Callback when a country is clicked — receives ISO-A3 code */
  onCountryClick?: (iso: string) => void;
  /** Country BP data array for choropleth coloring */
  countryBPData: ReadonlyArray<CountryBPData>;
  /** Currently selected country ISO-A3 code */
  selectedISO: string | null;
  /** Optional class name for the container */
  className?: string;
  /** Active analytics layer — "bp" shows choropleth, others show scatter/geojson layers */
  activeLayer?: AnalyticsLayerKey;
  /** Full country data for analytics layers (budget, navy, etc.) */
  countriesRaw?: ReadonlyArray<CountryMapData>;
}

interface HoverState {
  iso: string | null;
  longitude: number;
  latitude: number;
  country: CountryBPData | null;
}

// ─── Analytics Layer Builders ──────────────────────────────────────────

/** Build a GeoJsonLayer for military budget heatmap */
function buildBudgetGeoJsonLayer(
  geoJson: CountryCollection | null,
  countriesRaw: ReadonlyArray<CountryMapData>,
): Layer | null {
  if (!geoJson) return null;

  const budgetByIso = new Map<string, number>();
  for (const c of countriesRaw) {
    budgetByIso.set(c.isoCode, c.militaryBudgetBn);
  }

  let minBudget = Infinity;
  let maxBudget = -Infinity;
  for (const val of budgetByIso.values()) {
    if (val < minBudget) minBudget = val;
    if (val > maxBudget) maxBudget = val;
  }
  if (!isFinite(minBudget)) minBudget = 0;
  if (!isFinite(maxBudget)) maxBudget = 100;
  const range = maxBudget - minBudget || 1;
  const colorScale = scaleSequential(budgetColorInterpolator).domain([minBudget, maxBudget]);

  return new GeoJsonLayer({
    id: "analytics-budget",
    data: geoJson,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    wireframe: false,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,
    getFillColor: ((feature: Feature<Polygon | MultiPolygon>) => {
      const iso = feature.properties?.iso ?? "";
      const budget = budgetByIso.get(iso) ?? 0;
      if (budget <= 0) return [20, 30, 40, 80];
      const t = (budget - minBudget) / range;
      return colorScale(t) as [number, number, number, number];
    }) as (feature: object) => [number, number, number, number],
    getLineColor: [0, 150, 180, 50] as [number, number, number, number],
    getLineWidth: 1,
    updateTriggers: {
      getFillColor: [minBudget, maxBudget],
    },
  });
}

/** Build a ScatterplotLayer for a given metric */
function objectImportance(object: StrategicObject): number {
  if (object.type === "capital") return 3;
  if (object.type === "military-base" || object.type === "naval-base" || object.type === "military-range" || object.type === "strategic-site" || object.operator) return 3;
  if (object.source === "Natural Earth Populated Places") return 2;
  return 1;
}

function objectIsInViewport(object: StrategicObject, viewState: ViewState): boolean {
  const longitudeSpan = Math.min(360, 360 / 2 ** (viewState.zoom - 1));
  const latitudeSpan = Math.min(180, 180 / 2 ** (viewState.zoom - 1));
  if (object.latitude < Math.max(-85, viewState.latitude - latitudeSpan / 2) || object.latitude > Math.min(85, viewState.latitude + latitudeSpan / 2)) return false;
  if (longitudeSpan >= 360) return true;
  let longitudeDelta = Math.abs(object.longitude - viewState.longitude) % 360;
  if (longitudeDelta > 180) longitudeDelta = 360 - longitudeDelta;
  return longitudeDelta <= longitudeSpan / 2;
}

function selectVisibleStrategicObjects(objects: readonly StrategicObject[], viewState: ViewState): StrategicObject[] {
  const minimumImportance = viewState.zoom < 2.3 ? 3 : viewState.zoom < 4 ? 2 : 1;
  const limit = viewState.zoom < 2.3 ? 250 : viewState.zoom < 4 ? 700 : 2500;
  return objects
    .filter((object) => objectImportance(object) >= minimumImportance && objectIsInViewport(object, viewState))
    .sort((left, right) => objectImportance(right) - objectImportance(left))
    .slice(0, limit);
}

function buildStrategicObjectsLayer(objects: readonly StrategicObject[], onClick: (object: StrategicObject) => void): Layer {
  return new ScatterplotLayer<StrategicObject>({
    id: "strategic-objects",
    data: objects,
    pickable: true,
    radiusUnits: "pixels",
    radiusMinPixels: 2,
    radiusMaxPixels: 7,
    getPosition: (object) => [object.longitude, object.latitude],
    getRadius: (object) => objectImportance(object) === 3 ? 5 : objectImportance(object) === 2 ? 3.5 : 2.5,
    getFillColor: (object) => objectImportance(object) === 3 ? [255, 196, 64, 235] : [34, 211, 238, 190],
    getLineColor: [2, 12, 24, 220],
    lineWidthMinPixels: 1,
    onClick: (info) => {
      const object = info.object as StrategicObject | undefined;
      if (object) onClick(object);
    },
    updateTriggers: { getRadius: objects.length, getFillColor: objects.length },
  });
}

function buildScatterLayer(
  id: string,
  countriesRaw: ReadonlyArray<CountryMapData>,
  metricKey: keyof CountryMapData,
  colorInterpolator: (t: number) => [number, number, number, number],
  lineColor: [number, number, number, number],
  minRadius: number,
  maxRadius: number,
): Layer {
  const values: number[] = [];
  const points: ScatterPoint[] = [];

  for (const c of countriesRaw) {
    const val = c[metricKey] as number;
    if (val > 0) {
      values.push(val);
      points.push({
        iso: c.isoCode,
        name: c.nameRu,
        position: getPosition(c.isoCode),
        value: val,
      });
    }
  }

  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 100;
  const range = max - min || 1;
  const colorScale = scaleSequential(colorInterpolator).domain([min, max]);

  return new ScatterplotLayer({
    id,
    data: points,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d: ScatterPoint) => d.position,
    getRadius: (d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return minRadius + t * maxRadius;
    },
    getFillColor: (d: ScatterPoint) => {
      const t = (d.value - min) / range;
      return colorScale(t) as [number, number, number, number];
    },
    getLineColor: lineColor,
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 60,
    updateTriggers: {
      getRadius: [min, max],
      getFillColor: [min, max],
    },
  });
}

// ─── Token Validation ──────────────────────────────────────────────────

// ─── Fallback Component ────────────────────────────────────────────────

function MapTokenFallback({ className }: { className?: string }) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden flex items-center justify-center ${className ?? ""}`}
    >
      {/* Tactical grid background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage:
          "linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.9)_100%)]" />

      {/* Scan-line effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.15) 2px, rgba(0,212,255,0.15) 4px)",
        backgroundSize: "100% 4px",
      }} />

      {/* Main fallback panel */}
      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="relative bg-slate-950/90 border border-tactical-primary/20 rounded-md overflow-hidden"
          style={{
            boxShadow: "0 0 40px rgba(0,212,255,0.08), inset 0 0 30px rgba(0,212,255,0.03)",
          }}
        >
          {/* Tactical corners — top-left + top-right */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-tactical-primary/60" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-tactical-primary/60" />
          {/* Tactical corners — bottom-left + bottom-right */}
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-tactical-primary/60" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-tactical-primary/60" />

          {/* Header bar */}
          <div className="px-4 py-2 border-b border-tactical-primary/15 flex items-center gap-2 bg-tactical-primary/[0.04]">
            <div className="w-2 h-2 rounded-full bg-tactical-primary/60 animate-pulse" />
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-tactical-primary/50">
              system.status
            </span>
            <span className="font-mono text-[9px] tracking-wider text-amber-500/70 ml-auto">
              TOKEN_MISSING
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <h2 className="font-mono text-sm font-bold tracking-wider text-tactical-primary">
                Требуется токен Mapbox
              </h2>
            </div>

            {/* Description */}
            <p className="font-mono text-[11px] text-slate-400 leading-relaxed">
              Для отображения стратегической карты необходим действующий токен Mapbox GL.
              Бесплатный токен можно получить на сайте Mapbox.
            </p>

            {/* Instructions block */}
            <div className="bg-slate-900/80 border border-white/5 rounded-sm p-3 space-y-2">
              <div className="font-mono text-[9px] tracking-widest uppercase text-tactical-secondary/50 mb-1">
                Инструкция
              </div>
              <ol className="font-mono text-[10px] text-slate-300 space-y-1.5 list-decimal list-inside">
                <li>
                  Перейдите на{" "}
                  <a
                    href="https://account.mapbox.com/auth/signup/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tactical-primary hover:text-tactical-accent underline underline-offset-2 transition-colors"
                  >
                    account.mapbox.com
                  </a>
                </li>
                <li>Зарегистрируйтесь (бесплатно)</li>
                <li>Создайте токен в разделе Access Tokens</li>
                <li>Добавьте токен в файл конфигурации</li>
              </ol>
            </div>

            {/* Config file path */}
            <div className="bg-slate-900/80 border border-white/5 rounded-sm p-3">
              <div className="font-mono text-[9px] tracking-widest uppercase text-tactical-secondary/50 mb-1.5">
                Файл конфигурации
              </div>
              <code className="font-mono text-[10px] text-amber-400/80 break-all">
                .env.local
              </code>
              <div className="mt-2 bg-slate-950 border border-white/5 rounded-sm p-2">
                <code className="font-mono text-[10px] text-tactical-primary/80">
                  NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1Ijo...
                </code>
              </div>
            </div>

            {/* Footer note */}
            <div className="flex items-start gap-2 pt-1">
              <div className="w-1 h-1 rounded-full bg-amber-500/50 mt-1.5 shrink-0" />
              <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
                Приложение работает без карты — список стран и аналитика доступны в боковой панели.
                Перезапустите сервер после изменения .env.local.
              </p>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="px-4 py-1.5 border-t border-tactical-primary/10 flex items-center justify-between bg-tactical-primary/[0.02]">
            <span className="font-mono text-[8px] text-tactical-secondary/30 tracking-widest uppercase">
              РБП Центр v2.0
            </span>
            <span className="font-mono text-[8px] text-tactical-secondary/30 tracking-wider">
              map.disabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TokenlessMapCanvasProps {
  layers: Layer[];
  viewState: ViewState;
  onViewStateChange: (viewState: ViewState) => void;
  pixelSize: { w: number; h: number } | null;
}

/** Local GeoJSON map used when Mapbox credentials are absent. */
function TokenlessMapCanvas({ layers, viewState, onViewStateChange, pixelSize }: TokenlessMapCanvasProps) {
  if (!pixelSize) {
    return <div className="w-full h-full bg-[#07101b]" />;
  }
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07101b]">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => {
          const value = next as ViewState;
          if (Number.isFinite(value.longitude) && Number.isFinite(value.latitude) && Number.isFinite(value.zoom)) onViewStateChange(value);
        }}
        layers={layers}
        controller
        style={{ position: "absolute", width: `${pixelSize.w}px`, height: `${pixelSize.h}px`, inset: "0", zIndex: 1 } as unknown as Partial<CSSStyleDeclaration>}
        getCursor={({ isHovering }: { isHovering: boolean }) => isHovering ? "pointer" : "grab"}
      />
      <div className="absolute left-4 top-4 z-10 border border-cyan-400/20 bg-slate-950/70 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-cyan-300/70 backdrop-blur-sm">
        Локальная карта · Mapbox token не требуется
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────

export function StrategicMap({
  onCountryClick,
  countryBPData,
  selectedISO,
  className,
  activeLayer = "bp",
  countriesRaw = [],
}: StrategicMapProps) {
  const mapRef = useRef<MapRef>(null);

  // ─── Pixel-dimension guard for Mapbox GL ────────────────────────
  // Mapbox GL throws "Invalid LngLat (NaN, 50)" when react-map-gl calls
  // setMaxBounds inside useIsomorphicLayoutEffect. This fires DURING the
  // React commit phase, BEFORE the browser paints. If MapGL's container
  // has CSS "width: 100%; height: 100%" but no computed pixel dimensions
  // yet (because the browser hasn't painted), Mapbox's unproject() gets
  // NaN for longitude.
  //
  // Fix: Measure the container's real pixel dimensions with
  // getBoundingClientRect, store them in state, and pass EXACT pixel
  // values as inline style to the MapGL wrapper. This way, when MapGL
  // mounts and its useIsomorphicLayoutEffect fires, the canvas has
  // concrete pixel dimensions and unproject() returns valid coords.
  //
  const containerRef = useRef<HTMLDivElement>(null);
  const [pixelSize, setPixelSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure immediately — even before paint, getBoundingClientRect
    // returns the layout-computed dimensions from CSS
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setPixelSize({ w: width, h: height });
        return true;
      }
      return false;
    };
    // Try immediate measurement
    if (measure()) return;
    // If 0 (e.g. CSS not yet applied), observe until sized
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ─── State ──────────────────────────────────────────────
  const [viewState, setViewState] = useState<ViewState>({ ...INITIAL_VIEW });
  const [geoJson, setGeoJson] = useState<CountryCollection | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark-v11");
  const [layerOpen, setLayerOpen] = useState(false);
  const [choroplethVisible, setChoroplethVisible] = useState(true);
  const [showStrategicObjects, setShowStrategicObjects] = useState(true);
  const [objectTypes, setObjectTypes] = useState<Set<StrategicObjectType>>(() => new Set(["capital", "city", "port", "airport", "military-base", "naval-base", "strategic-site", "military-range"]));
  const [strategicObjects, setStrategicObjects] = useState<StrategicObject[]>([...STRATEGIC_OBJECTS]);
  const [selectedObject, setSelectedObject] = useState<{ object: StrategicObject; longitude: number; latitude: number } | null>(null);
  const [hover, setHover] = useState<HoverState>({
    iso: null,
    longitude: 0,
    latitude: 0,
    country: null,
  });

  // ─── BP data bounds ──────────────────────────────────────
  const { minBP, maxBP } = useMemo(() => {
    if (countryBPData.length === 0) return { minBP: 0, maxBP: 100 };
    let min = Infinity;
    let max = -Infinity;
    for (const rec of countryBPData) {
      if (rec.bpScore < min) min = rec.bpScore;
      if (rec.bpScore > max) max = rec.bpScore;
    }
    return { minBP: min, maxBP: max };
  }, [countryBPData]);

  const metricBounds = useMemo(() => {
    const key = activeLayer === "budget" ? "militaryBudgetBn" : activeLayer === "fleet" ? "totalNavy" : activeLayer === "aviation" ? "totalAircraft" : activeLayer === "tanks" ? "totalTanks" : "nuclearWarheads";
    const values = countriesRaw.map((country) => country[key]).filter((value) => value > 0);
    return { min: values.length ? Math.min(...values) : 0, max: values.length ? Math.max(...values) : 1 };
  }, [activeLayer, countriesRaw]);

  // ─── Load global capitals and major cities from the local Natural Earth cache ──
  useEffect(() => {
    let cancelled = false;
    const regions = [-60, 0].flatMap((south) => [-180, -90, 0, 90].map((west) => ({ south, west, north: south + 60, east: west + 90 })));
    Promise.all(regions.map((region) => {
      const query = new URLSearchParams(Object.fromEntries(Object.entries({ ...region, zoom: 2 }).map(([key, value]) => [key, String(value)])));
      return fetch(`/api/map/objects?${query}`).then((response) => response.ok ? response.json() as Promise<{ objects?: StrategicObject[] }> : { objects: [] }).catch(() => ({ objects: [] }));
    })).then((responses) => {
      if (cancelled) return;
      setStrategicObjects((current) => {
        const merged = new Map(current.map((object) => [object.id, object]));
        for (const response of responses) for (const object of response.objects ?? []) merged.set(object.id, object);
        return [...merged.values()];
      });
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Load public geospatial objects for the current viewport ────────
  useEffect(() => {
    if (viewState.zoom < 3) return;
    let cancelled = false;
    const lonSpan = Math.min(90, 360 / 2 ** (viewState.zoom - 1));
    const latSpan = Math.min(45, 180 / 2 ** (viewState.zoom - 1));
    const south = Math.max(-60, viewState.latitude - latSpan / 2);
    const north = Math.min(80, viewState.latitude + latSpan / 2);
    const west = Math.max(-180, viewState.longitude - lonSpan / 2);
    const east = Math.min(180, viewState.longitude + lonSpan / 2);
    if (north <= south || east <= west) return;
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ south: String(south), west: String(west), north: String(north), east: String(east), zoom: String(Math.round(viewState.zoom)), military: "1" });
      fetch(`/api/map/objects?${query}`)
        .then((response) => response.ok ? response.json() as Promise<{ objects?: StrategicObject[] }> : { objects: [] })
        .then((response) => {
          if (cancelled) return;
          setStrategicObjects((current) => {
            const merged = new Map(current.map((object) => [object.id, object]));
            for (const object of response.objects ?? []) merged.set(object.id, object);
            return [...merged.values()];
          });
        })
        .catch(() => undefined);
    }, 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [viewState.latitude, viewState.longitude, viewState.zoom]);

  // ─── Load GeoJSON on mount ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadCountryBoundaries()
      .then((data) => {
        if (!cancelled) setGeoJson(data);
      })
      .catch((err: unknown) => {
        console.error("[StrategicMap] Failed to load GeoJSON:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Merge GeoJSON with BP data ─────────────────────────
  const enrichedGeoJson = useMemo(() => {
    if (!geoJson) return null;
    const records: CountryBPRecord[] = countryBPData.map((d) => ({
      iso: d.iso,
      name: d.name,
      bpScore: d.bpScore,
      bpRank: d.bpRank,
    }));
    return mergeWithBPData(geoJson, records);
  }, [geoJson, countryBPData]);

  // ─── Hover handler ──────────────────────────────────────
  const handleCountryHover = useCallback(
    (iso: string | null, info: PickingInfo) => {
      const country = iso
        ? countryBPData.find((c) => c.iso === iso) ?? null
        : null;
      setHover({
        iso,
        longitude: (info.coordinate?.[0] != null && isFinite(info.coordinate[0])) ? info.coordinate[0] : 0,
        latitude: (info.coordinate?.[1] != null && isFinite(info.coordinate[1])) ? info.coordinate[1] : 0,
        country,
      });
    },
    [countryBPData],
  );

  // ─── Click handler ──────────────────────────────────────
  const handleCountryClick = useCallback(
    (iso: string | null) => {
      if (iso && onCountryClick) onCountryClick(iso);
    },
    [onCountryClick],
  );

  const handleNativeMapClick = useCallback((event: MapMouseEvent) => {
    const features = event.features ?? [];
    const clusterFeature = features.find((candidate) => typeof (candidate.properties as Record<string, unknown> | undefined)?.cluster_id === "number");
    const clusterId = (clusterFeature?.properties as Record<string, unknown> | undefined)?.cluster_id;
    if (typeof clusterId === "number") {
      const source = mapRef.current?.getSource("rbp-strategic-objects") as { getClusterExpansionZoom?: (id: number) => Promise<number> } | undefined;
      source?.getClusterExpansionZoom?.(clusterId)
        .then((zoom) => mapRef.current?.getMap().easeTo({ center: [event.lngLat.lng, event.lngLat.lat], zoom, duration: 450 }))
        .catch(() => undefined);
      return;
    }
    const objectFeature = features.find((candidate) => candidate.layer.id === "rbp-object-points");
    const objectId = (objectFeature?.properties as Record<string, unknown> | undefined)?.id;
    if (typeof objectId === "string") {
      const object = strategicObjects.find((candidate) => candidate.id === objectId);
      if (object) setSelectedObject({ object, longitude: event.lngLat.lng, latitude: event.lngLat.lat });
      return;
    }
    const countryFeature = features.find((candidate) => candidate.layer.id === "rbp-country-fill");
    const properties = countryFeature?.properties as Record<string, unknown> | undefined;
    const iso = properties?.ISO_A3 ?? properties?.ADM0_A3 ?? properties?.isoCode;
    if (typeof iso === "string" && iso !== "-99" && iso !== "UNK") handleCountryClick(iso);
  }, [handleCountryClick, strategicObjects]);

  const handleNativeMapHover = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.find((candidate) => candidate.layer.id === "rbp-country-fill");
    const properties = feature?.properties as Record<string, unknown> | undefined;
    const iso = properties?.ISO_A3 ?? properties?.ADM0_A3;
    handleCountryHover(typeof iso === "string" && iso !== "-99" ? iso : null, {
      coordinate: [event.lngLat.lng, event.lngLat.lat],
    } as PickingInfo);
  }, [handleCountryHover]);

  // ─── Visible map objects ─────────────────────────────────
  const visibleStrategicObjects = useMemo(
    () => selectVisibleStrategicObjects(strategicObjects.filter((object) => objectTypes.has(object.type)), viewState),
    [objectTypes, strategicObjects, viewState],
  );

  const handleStrategicObjectClick = useCallback((object: StrategicObject) => {
    if (!onCountryClick) return;
    const iso = object.isoCode !== "UNK"
      ? object.isoCode
      : geoJson ? findISOFromCoords(geoJson, object.longitude, object.latitude) : null;
    if (iso) onCountryClick(iso);
  }, [geoJson, onCountryClick]);

  // ─── Map control handlers ────────────────────────────────
  const handleZoomIn = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: currentZoom + 1, duration: 300 });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      const currentZoom = map.getZoom();
      map.easeTo({ zoom: Math.max(0.8, currentZoom - 1), duration: 300 });
    }
  }, []);

  const handleReset = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      map.flyTo({
        center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
        zoom: INITIAL_VIEW.zoom,
        pitch: INITIAL_VIEW.pitch,
        bearing: INITIAL_VIEW.bearing,
        duration: 1200,
      });
    }
    setViewState(INITIAL_VIEW);
  }, []);

  const handleCompass = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      map.easeTo({ bearing: 0, duration: 600 });
    }
  }, []);

  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
  }, []);

  const handleToggleLayers = useCallback(() => {
    setLayerOpen((prev) => !prev);
  }, []);

  const handleToggleChoropleth = useCallback(() => {
    setChoroplethVisible((prev) => !prev);
  }, []);

  const handleToggleObjectType = useCallback((type: StrategicObjectType) => {
    setObjectTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // ─── Popup details handler ──────────────────────────────
  const handlePopupDetails = useCallback(
    (iso: string) => {
      if (onCountryClick) onCountryClick(iso);
    },
    [onCountryClick],
  );

  // ─── Close layer panel on outside click ─────────────────
  useEffect(() => {
    if (!layerOpen) return;
    const handleClick = () => setLayerOpen(false);
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClick, { once: true });
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [layerOpen]);

  const styleUrl = MAP_STYLE_URLS[mapStyle];

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className ?? ""}`}>
      {/* Only render map when we have exact pixel dimensions AND mapbox is patched */}
      {pixelSize ? (
        <>
          {/* Mapbox base map — sibling below DeckGL */}
          <MapErrorBoundary
            fallback={
              <div style={{ position: "absolute", zIndex: 0, width: pixelSize!.w, height: pixelSize!.h, top: 0, left: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e17' }}>
                <div className="text-tactical-primary font-mono text-xs opacity-60">Карта инициализируется...</div>
              </div>
            }
          >
          <div style={{ position: "absolute", zIndex: 0, width: `${pixelSize.w}px`, height: `${pixelSize.h}px`, top: 0, left: 0 }}>
            <MapGL
              ref={mapRef}
              initialViewState={{
                longitude: INITIAL_VIEW.longitude,
                latitude: INITIAL_VIEW.latitude,
                zoom: INITIAL_VIEW.zoom,
                pitch: INITIAL_VIEW.pitch,
                bearing: INITIAL_VIEW.bearing,
              }}
              onMoveEnd={(event) => {
                const next = event.viewState;
                if (!Number.isFinite(next.longitude) || !Number.isFinite(next.latitude) || !Number.isFinite(next.zoom)) return;
                setViewState((current) => ({
                  ...current,
                  longitude: next.longitude,
                  latitude: next.latitude,
                  zoom: next.zoom,
                  bearing: next.bearing,
                  pitch: next.pitch,
                }));
              }}
              mapStyle={styleUrl}
              interactiveLayerIds={["rbp-country-fill", "rbp-object-points", "rbp-object-clusters"]}
              onClick={handleNativeMapClick}
              onMouseMove={handleNativeMapHover}
              style={{ width: `${pixelSize.w}px`, height: `${pixelSize.h}px` }}
              projection="mercator"
            >
              <NativeMapLayers
                countries={enrichedGeoJson}
                objects={visibleStrategicObjects}
                countriesRaw={countriesRaw}
                activeLayer={activeLayer}
                minBP={minBP}
                maxBP={maxBP}
                selectedISO={selectedISO}
                hoveredISO={hover.iso}
                visible={choroplethVisible}
                objectsVisible={showStrategicObjects}
                objectTypes={objectTypes}
              />
              {/* Country hover popup */}
              <CountryPopup
                country={hover.country}
                longitude={hover.longitude}
                latitude={hover.latitude}
                visible={hover.iso !== null && hover.country !== null && selectedObject === null}
                onDetailsClick={handlePopupDetails}
              />
              <StrategicObjectPopup
                object={selectedObject?.object ?? null}
                longitude={selectedObject?.longitude ?? 0}
                latitude={selectedObject?.latitude ?? 0}
                onCountryClick={handlePopupDetails}
                onClose={() => setSelectedObject(null)}
              />
            </MapGL>
          </div>
          </MapErrorBoundary>


        </>
      ) : (
        <div className="w-full h-full bg-tactical-bg flex items-center justify-center text-tactical-primary font-mono text-sm">
          Загрузка карты...
        </div>
      )}

      {/* Map HUD controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onCompass={handleCompass}
        onStyleChange={handleStyleChange}
        activeStyle={mapStyle}
        layerOpen={layerOpen}
        onToggleLayers={handleToggleLayers}
        choroplethVisible={choroplethVisible}
        onToggleChoropleth={handleToggleChoropleth}
      />
      <button type="button" aria-label="Переключить стратегические объекты" onClick={() => setShowStrategicObjects((visible) => !visible)} className="absolute right-4 top-4 z-20 rounded border border-cyan-400/20 bg-slate-950/70 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-cyan-300 backdrop-blur-sm">
        Объекты {showStrategicObjects ? "ON" : "OFF"} · {visibleStrategicObjects.length}/{strategicObjects.length}
      </button>
      {showStrategicObjects && (
        <ObjectLayerControls objects={strategicObjects} selected={objectTypes} onToggle={handleToggleObjectType} />
      )}

      <MapDataLegend
        activeLayer={activeLayer}
        minValue={activeLayer === "bp" ? minBP : metricBounds.min}
        maxValue={activeLayer === "bp" ? maxBP : metricBounds.max}
        objectsVisible={showStrategicObjects}
        visibleObjects={visibleStrategicObjects.length}
        totalObjects={strategicObjects.length}
      />

      {/* Loading overlay */}
      {!geoJson && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="glass-panel rounded-md px-6 py-3 font-mono text-xs text-tactical-primary tracking-widest uppercase">
            <span className="animate-pulse">Loading GeoData...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategicMap;
