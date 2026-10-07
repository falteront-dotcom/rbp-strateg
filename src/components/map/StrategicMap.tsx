"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { DeckGL } from "@deck.gl/react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { MapErrorBoundary } from './MapErrorBoundary';
import { StrategicAtlas } from './StrategicAtlas';

import "mapbox-gl/dist/mapbox-gl.css";

import { ChoroplethLayer } from "./ChoroplethLayer";
import type { CountryBPData } from "./ChoroplethLayer";
import { MapControls, MAP_STYLE_URLS } from "./MapControls";
import type { MapStyle } from "./MapControls";
import { CountryPopup } from "./CountryPopup";
import { MapLegend } from "./MapLegend";
import type { AnalyticsLayerKey } from "./LayerSelector";
import {
  loadCountryBoundaries,
  mergeWithBPData,
  normalizeISO3,
} from "@/lib/geo/country-boundaries";
import type { CountryCollection, CountryBPRecord } from "@/lib/geo/country-boundaries";
import {
  createMilitaryBudgetLayer,
  createNavyLayer,
  createAircraftLayer,
  createNukeLayer,
  createTankLayer,
} from "./AnalyticsLayers";

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
  /** Optional thematic selector for expanded map mode. */
  onLayerChange?: (layer: AnalyticsLayerKey) => void;
  /** Hide the compact map inspector when a full detail panel is visible. */
  showInspector?: boolean;
  /** Full country data for analytics layers (budget, navy, etc.) */
  countriesRaw?: ReadonlyArray<CountryMapData>;
  /** External locate request: centers the atlas camera on the point (token-free mode). */
  focusPoint?: { lat: number; lng: number; seq: number } | null;
}

interface HoverState {
  iso: string | null;
  longitude: number;
  latitude: number;
  country: CountryBPData | null;
}

// ─── Analytics Layer Builders ──────────────────────────────────────────

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
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-tactical-primary/50">
              system.status
            </span>
            <span className="font-mono text-[10px] tracking-wider text-amber-500/70 ml-auto">
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
              <div className="font-mono text-[10px] tracking-widest uppercase text-tactical-secondary/50 mb-1">
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
              <div className="font-mono text-[10px] tracking-widest uppercase text-tactical-secondary/50 mb-1.5">
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
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                Приложение работает без карты — список стран и аналитика доступны в боковой панели.
                Перезапустите сервер после изменения .env.local.
              </p>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="px-4 py-1.5 border-t border-tactical-primary/10 flex items-center justify-between bg-tactical-primary/[0.02]">
            <span className="font-mono text-[10px] text-tactical-secondary/30 tracking-widest uppercase">
              РБП Центр v2.0
            </span>
            <span className="font-mono text-[10px] text-tactical-secondary/30 tracking-wider">
              map.disabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────

function MapboxStrategicMap({
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
  const [mapPatched, setMapPatched] = useState(false);

  // ─── Patch mapbox-gl LngLat dynamically before rendering MapGL ──
  // We use dynamic import() instead of static import because Turbopack
  // crashes on static `import mapbox-gl` in client components.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('mapbox-gl');
        const mgl = mod.default || mod;
        const OrigLngLat = mgl.LngLat;
        if (!OrigLngLat || (OrigLngLat as any)._safePatched) return;
        // Mapbox exposes the constructor only after the client bundle loads.
        // eslint-disable-next-line react-hooks/unsupported-syntax
        class SafeLngLat extends OrigLngLat {
          static _safePatched = true;
          constructor(lng: number, lat: number) {
            super(
              typeof lng === 'number' && isFinite(lng) ? lng : 0,
              typeof lat === 'number' && isFinite(lat) ? lat : 0
            );
          }
        }
        Object.setPrototypeOf(SafeLngLat, OrigLngLat);
        Object.keys(OrigLngLat).forEach((key) => {
          try { (SafeLngLat as any)[key] = (OrigLngLat as any)[key]; } catch {}
        });
        mgl.LngLat = SafeLngLat as any;
        if (!cancelled) setMapPatched(true);
      } catch (e) {
        console.warn('[StrategicMap] Failed to patch mapbox-gl:', e);
        if (!cancelled) setMapPatched(true); // render anyway
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      const normalizedISO = normalizeISO3(iso);
      const country = normalizedISO
        ? countryBPData.find((c) => normalizeISO3(c.iso) === normalizedISO) ?? null
        : null;
      setHover({
        iso: normalizedISO,
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
    const budgetValues = countriesRaw.map((country) => country.militaryBudgetBn);
    const budgetBounds = {
      min: budgetValues.length ? Math.min(...budgetValues) : 0,
      max: budgetValues.length ? Math.max(...budgetValues) : 100,
    };
    const analyticsOptions = {
      selectedISO,
      onHover: (info: PickingInfo) => {
        const object = info.object as {
          iso?: string;
          members?: string[];
          properties?: Record<string, unknown>;
        } | null | undefined;
        const props = object?.properties;
        const iso = normalizeISO3(object?.iso ?? object?.members?.[0] ??
          (typeof props?.ISO_A3 === "string" ? props.ISO_A3 :
            typeof props?.ADM0_A3 === "string" ? props.ADM0_A3 : null));
        handleCountryHover(iso, info);
      },
      onClick: (info: PickingInfo) => {
        const object = info.object as { iso?: string; members?: string[] } | null | undefined;
        handleCountryClick(normalizeISO3(object?.iso ?? object?.members?.[0]));
      },
    };

    switch (activeLayer) {
      case "budget":
        return geoJson
          ? [createMilitaryBudgetLayer(geoJson, budgetBounds, analyticsOptions, countriesRaw)]
          : [];
      case "fleet":
        return [createNavyLayer(countriesRaw, analyticsOptions)];
      case "aviation":
        return [createAircraftLayer(countriesRaw, analyticsOptions)];
      case "tanks":
        return [createTankLayer(countriesRaw, analyticsOptions)];
      case "nukes":
        return [createNukeLayer(countriesRaw, analyticsOptions)];
      default:
        return [];
    }
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
      {/* Only render map when we have exact pixel dimensions AND mapbox is patched */}
      {pixelSize && mapPatched && tokenValid ? (
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
              }}
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
          </MapErrorBoundary>

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
            <span className="animate-pulse">Загрузка геоданных...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Local atlas is fully functional when a Mapbox token is not configured. */
export function StrategicMap(props: StrategicMapProps) {
  return isTokenValid(MAPBOX_TOKEN)
    ? <MapboxStrategicMap {...props} />
    : <StrategicAtlas {...props} />;
}

export default StrategicMap;
