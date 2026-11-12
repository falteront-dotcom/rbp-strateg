"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL from "react-map-gl/maplibre";
import { AttributionControl } from "@vis.gl/react-maplibre";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type { AnalyticsLayerKey } from "./LayerSelector";
import type { PickingInfo } from "@deck.gl/core";
import { MapErrorBoundary } from './MapErrorBoundary';

import "maplibre-gl/dist/maplibre-gl.css";

import type { CountryBPData } from "./ChoroplethLayer";
import { MapControls, MAP_STYLE_URLS } from "./MapControls";
import type { MapStyle } from "./MapControls";
import { CountryPopup } from "./CountryPopup";
import { StrategicObjectPopup } from "./StrategicObjectPopup";
import { ObjectLayerControls } from "./ObjectLayerControls";
import { MapDataLegend } from "./MapDataLegend";
import { NativeMapLayers } from "./NativeMapLayers";
import type { CountryMapData } from "./map-types";
import {
  loadCountryBoundaries,
  mergeWithBPData,
  normalizeISO3,
} from "@/lib/geo/country-boundaries";
import type { CountryCollection, CountryBPRecord } from "@/lib/geo/country-boundaries";
import { STRATEGIC_OBJECTS, type StrategicObject, type StrategicObjectType } from "@/lib/geo/strategic-objects";

// ─── OKLCH → sRGB conversion (shared with AnalyticsLayers) ─────────────

// ─── Analytics Layer Color Scales ──────────────────────────────────────

// ─── Scatter point type for analytics layers ──────────────────────────

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


/** Local GeoJSON map used when Mapbox credentials are absent. */
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
              attributionControl={false}
              interactiveLayerIds={["rbp-country-fill", "rbp-object-points", "rbp-object-clusters"]}
              onClick={handleNativeMapClick}
              onMouseMove={handleNativeMapHover}
              style={{ width: `${pixelSize.w}px`, height: `${pixelSize.h}px` }}
              projection="mercator"
            >
              {/* Атрибуция OSM/CARTO/MapLibre обязана быть видна: справа её
                  накрывает панель страны, снизу-справа — кнопка «РБП 3.0».
                  Левый нижний угол свободен всегда. */}
              <AttributionControl position="bottom-left" compact={false} />
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
            <span className="animate-pulse">Загрузка геоданных...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default StrategicMap;
