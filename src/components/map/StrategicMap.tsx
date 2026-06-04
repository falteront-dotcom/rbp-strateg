"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { DeckGL } from "@deck.gl/react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { scaleSequential } from "d3-scale";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";

import "mapbox-gl/dist/mapbox-gl.css";

import { ChoroplethLayer } from "./ChoroplethLayer";
import type { CountryBPData } from "./ChoroplethLayer";
import { MapControls, MAP_STYLE_URLS } from "./MapControls";
import type { MapStyle } from "./MapControls";
import { CountryPopup } from "./CountryPopup";
import { MapLegend } from "./MapLegend";
import { LayerSelector } from "./LayerSelector";
import type { AnalyticsLayerKey } from "./LayerSelector";
import {
  loadCountryBoundaries,
  mergeWithBPData,
} from "@/lib/geo/country-boundaries";
import type { CountryCollection, CountryBPRecord } from "@/lib/geo/country-boundaries";
import { getPosition } from "@/lib/geo/country-centroids";

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
export interface CountryMapData {
  isoCode: string;
  name: string;
  nameRu: string;
  militaryBudgetBn: number;
  totalTanks: number;
  totalAircraft: number;
  totalNavy: number;
  nuclearWarheads: number;
  bpTotal: number;
}

/** Default initial view state: centered on Eastern Europe */
const INITIAL_VIEW = {
  longitude: 30,
  latitude: 50,
  zoom: 3,
  pitch: 45,
  bearing: 0,
} as const;

type ViewState = typeof INITIAL_VIEW;

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

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

function isTokenValid(token: string): boolean {
  if (!token || token.trim().length === 0) return false;
  if (token.startsWith("pk.placeholder")) return false;
  if (token === "pk.your_mapbox_token_here") return false;
  // Valid Mapbox public tokens start with "pk." and are >20 chars
  return token.startsWith("pk.") && token.length > 20;
}

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
  const tokenValid = isTokenValid(MAPBOX_TOKEN);

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

  // ─── Deck.gl layers ─────────────────────────────────────
  const deckLayers = useMemo<Layer[]>(() => {
    // ─── BP Choropleth (default) ────────────────────────────
    if (activeLayer === "bp") {
      if (!choroplethVisible || !enrichedGeoJson) return [];
      const layer = ChoroplethLayer({
        data: enrichedGeoJson,
        countryBPData,
        selectedISO,
        hoveredISO: hover.iso,
        onCountryHover: handleCountryHover,
        onCountryClick: handleCountryClick,
        minBP,
        maxBP,
      });
      return [layer];
    }

    // ─── Analytics Layers ──────────────────────────────────
    const layers: Layer[] = [];

    switch (activeLayer) {
      case "budget": {
        const budgetLayer = buildBudgetGeoJsonLayer(geoJson, countriesRaw);
        if (budgetLayer) layers.push(budgetLayer);
        break;
      }
      case "fleet": {
        layers.push(
          buildScatterLayer(
            "analytics-navy",
            countriesRaw,
            "totalNavy",
            navyColorInterpolator,
            [0, 180, 220, 120],
            15000,
            180000,
          ),
        );
        break;
      }
      case "aviation": {
        layers.push(
          buildScatterLayer(
            "analytics-aircraft",
            countriesRaw,
            "totalAircraft",
            aircraftColorInterpolator,
            [100, 130, 255, 120],
            20000,
            200000,
          ),
        );
        break;
      }
      case "tanks": {
        layers.push(
          buildScatterLayer(
            "analytics-tanks",
            countriesRaw,
            "totalTanks",
            tankColorInterpolator,
            [200, 160, 60, 120],
            18000,
            190000,
          ),
        );
        break;
      }
      case "nukes": {
        layers.push(
          buildScatterLayer(
            "analytics-nukes",
            countriesRaw,
            "nuclearWarheads",
            nukeColorInterpolator,
            [255, 60, 60, 180],
            30000,
            250000,
          ),
        );
        break;
      }
    }

    return layers;
  }, [
    activeLayer,
    enrichedGeoJson,
    geoJson,
    countryBPData,
    selectedISO,
    hover.iso,
    choroplethVisible,
    minBP,
    maxBP,
    handleCountryHover,
    handleCountryClick,
    countriesRaw,
  ]);

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
      map.easeTo({ zoom: Math.max(1, currentZoom - 1), duration: 300 });
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

  // ─── Token check — render fallback if Mapbox token is missing/invalid ──
  if (!tokenValid) {
    return <MapTokenFallback className={className} />;
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className ?? ""}`}>
      {/* Only render map when we have exact pixel dimensions */}
      {pixelSize && tokenValid ? (
        <>
          {/* Mapbox base map — sibling below DeckGL */}
          <div style={{ position: "absolute", zIndex: 0, width: `${pixelSize.w}px`, height: `${pixelSize.h}px`, top: 0, left: 0 }}>
            <MapGL
              ref={mapRef}
              {...viewState}
              mapStyle={styleUrl}
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: `${pixelSize.w}px`, height: `${pixelSize.h}px` }}
              projection="mercator"
              antialias
            >
              {/* Country hover popup — only in BP mode */}
              {activeLayer === "bp" && (
                <CountryPopup
                  country={hover.country}
                  longitude={hover.longitude}
                  latitude={hover.latitude}
                  visible={hover.iso !== null && hover.country !== null}
                  onDetailsClick={handlePopupDetails}
                />
              )}
            </MapGL>
          </div>

          {/* DeckGL overlay — sibling above MapGL */}
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) => {
              const lng = (vs as Record<string, unknown>).longitude;
              const lat = (vs as Record<string, unknown>).latitude;
              const zm = (vs as Record<string, unknown>).zoom;
              if (
                typeof lng === 'number' && isFinite(lng) &&
                typeof lat === 'number' && isFinite(lat) &&
                typeof zm === 'number' && isFinite(zm)
              ) {
                setViewState(vs as ViewState);
              }
            }}
            layers={deckLayers}
            controller={true}
            style={{ position: "absolute", width: `${pixelSize.w}px`, height: `${pixelSize.h}px`, top: "0", left: "0", zIndex: "1", pointerEvents: "auto" }}
            getCursor={({ isHovering }: { isHovering: boolean }) =>
              isHovering ? "pointer" : "default"
            }
          />
        </>
      ) : !tokenValid ? (
        <MapTokenFallback className={className} />
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

      {/* Legend — only in BP mode */}
      {activeLayer === "bp" && (
        <MapLegend minBP={minBP} maxBP={maxBP} visible={choroplethVisible} />
      )}

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
