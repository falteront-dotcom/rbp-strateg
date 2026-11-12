"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { ArrowUpRight, Crosshair, Flame, Globe2, Maximize2, Minimize2, Minus, Plus, Radar, RotateCcw, Search, X } from "lucide-react";
import { clearBoundaryCache, getISOFromFeature, loadCountryBoundaries, normalizeISO3 } from "@/lib/geo/country-boundaries";
import type { CountryCollection } from "@/lib/geo/country-boundaries";
import { COUNTRY_NAMES_RU } from "@/lib/geo/country-names-ru";
import { getPositionOrNull } from "@/lib/geo/country-centroids";
import { bpColorCss } from "@/lib/geo/oklch";
import { STRATEGIC_FACILITIES } from "@/lib/facilities/strategic-facilities.generated";
import { CONFLICT_ZONES } from "@/lib/facilities/conflict-zones.generated";
import { CONFLICT_TYPE_LABELS_RU, FACILITY_TYPE_LABELS_RU, type ConflictZone, type FacilityType, type StrategicFacility } from "@/lib/facilities/types";
import type { CountryBPData } from "./ChoroplethLayer";
import type { CountryMapData } from "./map-types";
import { LayerSelector, type AnalyticsLayerKey } from "./LayerSelector";
import styles from "./StrategicAtlas.module.css";

interface Props {
  countryBPData: ReadonlyArray<CountryBPData>;
  countriesRaw?: ReadonlyArray<CountryMapData>;
  selectedISO: string | null;
  onCountryClick?: (iso: string) => void;
  activeLayer?: AnalyticsLayerKey;
  onLayerChange?: (layer: AnalyticsLayerKey) => void;
  showInspector?: boolean;
  className?: string;
  /** External locate request (e.g. from the country panel): centers the camera on the point. seq re-triggers repeats. */
  focusPoint?: { lat: number; lng: number; seq: number } | null;
}

const METRICS = {
  bp: { title: "Боевой потенциал", unit: "баллов БП", field: "bpTotal", note: "Сводный индекс модели РБП" },
  budget: { title: "Оборонный бюджет", unit: "млрд $", field: "militaryBudgetBn", note: "Военные расходы по странам" },
  fleet: { title: "Военно-морской флот", unit: "кораблей", field: "totalNavy", note: "Количество кораблей, не их боевая мощь" },
  aviation: { title: "Военная авиация", unit: "самолётов", field: "totalAircraft", note: "Общее количество воздушных судов" },
  tanks: { title: "Бронетехника", unit: "танков", field: "totalTanks", note: "Танковый парк по странам" },
  nukes: { title: "Ядерный арсенал", unit: "боеголовок", field: "nuclearWarheads", note: "Оценка арсенала, не развёрнутые силы" },
} as const;
const WIDTH = 1200;
const HEIGHT = 740;
const HOME = { x: 0, y: 0, k: 1 };

/** Muted functional colors per facility type — one hue per class of object. */
const FACILITY_COLORS: Readonly<Record<FacilityType, string>> = {
  air_base: "#6bb995",
  naval_base: "#6b86a8",
  army_base: "#8a9e6a",
  missile_site: "#c76a5a",
  radar_site: "#b8934a",
  space_facility: "#9d8ba8",
  nuclear_facility: "#d8b44a",
  intel_site: "#b07a92",
  logistics_hub: "#8fb3bd",
  chokepoint: "#e2e8ea",
  defense_industry: "#b3a35c",
};

/** Symbol shape per facility type; r is the marker radius in screen px. */
function FacilitySymbol({ type, color, r }: { type: FacilityType; color: string; r: number }) {
  switch (type) {
    case "missile_site":
    case "nuclear_facility":
      return <polygon points={`0,${-r} ${r * 0.9},${r * 0.7} ${-r * 0.9},${r * 0.7}`} fill={color} stroke="#0b201a" strokeWidth="1.2" />;
    case "radar_site":
    case "space_facility":
    case "intel_site":
      return <rect x={-r * 0.75} y={-r * 0.75} width={r * 1.5} height={r * 1.5} transform="rotate(45)" fill={color} stroke="#0b201a" strokeWidth="1.2" />;
    case "chokepoint":
      return <circle r={r * 0.8} fill="none" stroke={color} strokeWidth="2.2" />;
    case "logistics_hub":
      return <path d={`M${-r},0 H${r} M0,${-r} V${r}`} stroke={color} strokeWidth="2.2" />;
    case "defense_industry":
      // Factory silhouette: body + chimney.
      return <path d={`M${-r * 0.9},${r * 0.7} V${-r * 0.1} L${-r * 0.35},${-r * 0.35} V${-r * 0.1} L${r * 0.1},${-r * 0.3} V${-r * 0.75} H${r * 0.35} V${-r * 0.05} H${r * 0.9} V${r * 0.7} Z`} fill={color} stroke="#0b201a" strokeWidth="1" />;
    default: {
      const inner = type === "naval_base" ? r * 0.45 : 0;
      return <><circle r={r * 0.8} fill={color} stroke="#0b201a" strokeWidth="1.2" />{inner > 0 && <circle r={inner} fill="#0b201a" />}</>;
    }
  }
}
const format = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
const valid = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Token-free, local vector atlas. No tiles, API keys, or WebGL required. */
export function StrategicAtlas({ countryBPData, countriesRaw = [], selectedISO, onCountryClick, activeLayer = "bp", onLayerChange, showInspector = true, className, focusPoint = null }: Props) {
  const [geography, setGeography] = useState<CountryCollection | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [showFacilities, setShowFacilities] = useState(true);
  const [activeFacility, setActiveFacility] = useState<StrategicFacility | null>(null);
  const [hoveredFacility, setHoveredFacility] = useState<string | null>(null);
  const [disabledTypes, setDisabledTypes] = useState<ReadonlySet<FacilityType>>(new Set());
  const [showConflicts, setShowConflicts] = useState(false);
  const [activeZone, setActiveZone] = useState<ConflictZone | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [size, setSize] = useState({ width: WIDTH, height: HEIGHT });
  const rootRef = useRef<HTMLElement>(null);
  const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
  const searchId = useId();
  const [camera, setCamera] = useState(HOME);
  const [labels, setLabels] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const metric = METRICS[activeLayer];
  const selected = normalizeISO3(selectedISO);

  useEffect(() => {
    let cancelled = false;
    loadCountryBoundaries().then(data => {
      if (!cancelled) setGeography(data);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [attempt]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleFullscreen = () => {
      setExpanded(document.fullscreenElement === rootRef.current);
      if (!document.fullscreenElement) fullscreenButtonRef.current?.focus();
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  async function toggleExpanded() {
    if (expanded) {
      if (document.fullscreenElement === rootRef.current) await document.exitFullscreen();
      setExpanded(false);
      fullscreenButtonRef.current?.focus();
    } else {
      // CSS expansion is also available when browser fullscreen is not supported.
      try { await rootRef.current?.requestFullscreen(); } catch { /* use CSS expansion */ }
      setExpanded(true);
    }
  }

  const projection = useMemo(() => geoNaturalEarth1().scale(215).translate([WIDTH / 2, HEIGHT / 2 + 55]), []);

  // External locate request: center the camera on the facility at a label-friendly zoom.
  useEffect(() => {
    if (!focusPoint) return;
    const point = projection([focusPoint.lng, focusPoint.lat]);
    if (!point) return;
    const k = 4;
    setCamera({ k, x: WIDTH / 2 - point[0] * k, y: HEIGHT / 2 - point[1] * k });
    setShowFacilities(true);
  }, [focusPoint, projection]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const shapes = useMemo(() => geography?.features.flatMap(feature => {
    const iso = getISOFromFeature(feature);
    if (!iso || iso === "ATA") return [];
    return [{ iso, d: path(feature) ?? "", name: COUNTRY_NAMES_RU[iso] ?? feature.properties.NAME }];
  }) ?? [], [geography, path]);
  const rows = useMemo(() => {
    const raw = new Map(countriesRaw.map(country => [normalizeISO3(country.isoCode), country]));
    return countryBPData.flatMap(country => {
      const iso = normalizeISO3(country.iso);
      if (!iso) return [];
      const details = raw.get(iso);
      const value = activeLayer === "bp" ? country.bpScore : details?.[metric.field];
      return [{ ...country, iso, originalISO: country.iso, value: valid(value) ? value : null, details }];
    });
  }, [countryBPData, countriesRaw, activeLayer, metric.field]);
  const byISO = useMemo(() => new Map(rows.map(row => [row.iso, row])), [rows]);
  const ranked = useMemo(() => rows.filter(row => row.value !== null).sort((a, b) => b.value! - a.value!), [rows]);
  const max = ranked[0]?.value ?? 0;
  const min = ranked.at(-1)?.value ?? 0;
  const rank = useMemo(() => new Map(ranked.map(row => [row.iso, 1 + ranked.filter(other => other.value! > row.value!).length])), [ranked]);
  const focusISO = hovered ?? selected;
  const focus = focusISO ? byISO.get(focusISO) : null;
  const focusName = focus?.name ?? shapes.find(shape => shape.iso === focusISO)?.name;
  const filtered = rows.filter(row => `${row.name} ${row.details?.name ?? ""} ${row.iso} ${row.originalISO}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7);
  const screenScale = Math.min(size.width / WIDTH, size.height / HEIGHT);
  // Facility markers keep a constant screen size and thin out at low zoom so
  // dense regions (Europe, Middle East) stay readable at world view.
  const facilityMarks = useMemo(() => {
    const minValue = camera.k < 2 ? 7 : camera.k < 3.5 ? 5 : 1;
    const candidates = STRATEGIC_FACILITIES.flatMap(facility => {
      if (facility.strategicValue < minValue || disabledTypes.has(facility.type)) return [];
      const point = projection([facility.lng, facility.lat]);
      return point ? [{ facility, point }] : [];
    // Descending: the most valuable facility of a dense cluster survives decluttering.
    }).sort((a, b) => b.facility.strategicValue - a.facility.strategicValue);
    // Spatial decluttering in screen space: overlapping markers are unreachable
    // by pointer, so keep the most valuable one per cluster; the rest reappear on zoom-in.
    const kept: typeof candidates = [];
    const minScreenDistance = 20 / (camera.k * screenScale);
    for (const mark of candidates) {
      const blocked = kept.some(other =>
        Math.hypot(other.point[0] - mark.point[0], other.point[1] - mark.point[1]) < minScreenDistance);
      if (!blocked) kept.push(mark);
    }
    // Ascending strategic value: the most important facilities render LAST,
    // so in SVG z-order they sit on top of less important neighbors.
    return kept.sort((a, b) => a.facility.strategicValue - b.facility.strategicValue);
  }, [projection, camera.k, screenScale, disabledTypes]);
  // Types actually present in the data, in stable order, for the filter chips.
  const presentTypes = useMemo(() => {
    const seen = new Set(STRATEGIC_FACILITIES.map(f => f.type));
    return (Object.keys(FACILITY_TYPE_LABELS_RU) as FacilityType[]).filter(t => seen.has(t));
  }, []);
  const typeCounts = useMemo(() => {
    const counts = new Map<FacilityType, number>();
    for (const f of STRATEGIC_FACILITIES) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
    return counts;
  }, []);
  // Conflict zone centers projected once per projection; ring radius scales with zoom.
  const conflictMarks = useMemo(() => {
    return CONFLICT_ZONES.flatMap(zone => {
      const point = projection([zone.lng, zone.lat]);
      return point ? [{ zone, point }] : [];
    });
  }, [projection]);
  const visibleLabels = useMemo(() => {
    // Collision boxes use SVG screen-space units, so labels stay readable after resize/zoom.
    const candidates = [...ranked].sort((a, b) => Number(b.iso === selected) - Number(a.iso === selected));
    const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    const offsetX = (size.width - WIDTH * screenScale) / 2;
    const offsetY = (size.height - HEIGHT * screenScale) / 2;
    const limit = camera.k < 1.5 ? 8 : camera.k < 3 ? 18 : 40;
    return candidates.flatMap(row => {
      if (boxes.length >= limit) return [];
      const coordinates = getPositionOrNull(row.iso);
      const point = coordinates && projection(coordinates);
      if (!point) return [];
      const x = (point[0] * camera.k + camera.x) * screenScale + offsetX;
      const y = (point[1] * camera.k + camera.y) * screenScale + offsetY;
      const box = { x: x + 8, y: y - 19, w: row.name.length * 7 + 16, h: 37 };
      if (box.x < 0 || box.x + box.w > size.width || box.y < 0 || box.y + box.h > size.height) return [];
      // Reserve the HUD, toolbar and legend rather than drawing text underneath them.
      if ((box.x < 340 && box.y < (size.width < 1000 ? 248 : 200)) ||
          (box.x + box.w > size.width - 75 && box.y < 330) ||
          (box.x < 310 && box.y + box.h > size.height - 190) ||
          (size.width > 620 && box.x + box.w > size.width - 285 && box.y + box.h > size.height - 350)) return [];
      if (boxes.some(other => box.x < other.x + other.w && box.x + box.w > other.x && box.y < other.y + other.h && box.y + box.h > other.y)) return [];
      boxes.push(box);
      return [{ row, point }];
    });
  }, [ranked, selected, projection, camera, screenScale, size]);
  // Facility name labels appear only zoomed in (k>=3), decluttered in screen space,
  // so dense clusters (Middle East, Europe) stay readable.
  const visibleFacilityLabels = useMemo(() => {
    if (camera.k < 3 || !showFacilities) return [];
    const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    const offsetX = (size.width - WIDTH * screenScale) / 2;
    const offsetY = (size.height - HEIGHT * screenScale) / 2;
    const limit = 12;
    // Most valuable first so important labels win collisions.
    return [...facilityMarks].sort((a, b) => b.facility.strategicValue - a.facility.strategicValue).flatMap(({ facility, point }) => {
      if (boxes.length >= limit) return [];
      const x = (point[0] * camera.k + camera.x) * screenScale + offsetX;
      const y = (point[1] * camera.k + camera.y) * screenScale + offsetY;
      const w = facility.nameRu.length * 6 + 10;
      const box = { x: x + 10, y: y - 8, w, h: 16 };
      if (box.x < 0 || box.x + box.w > size.width || box.y < 0 || box.y + box.h > size.height) return [];
      if (boxes.some(other => box.x < other.x + other.w && box.x + box.w > other.x && box.y < other.y + other.h && box.y + box.h > other.y)) return [];
      boxes.push(box);
      return [{ facility, point }];
    });
  }, [facilityMarks, camera, screenScale, size, showFacilities]);
  // Logarithmic for physical quantities: a few large arsenals must not erase smaller countries.
  const ratio = (value: number) => max === min ? 0.5 : activeLayer === "bp"
    ? (value - min) / (max - min)
    : (Math.log1p(value) - Math.log1p(min)) / (Math.log1p(max) - Math.log1p(min));
  const ticks = [0, 0.5, 1].map(t => activeLayer === "bp" ? min + t * (max - min) : Math.expm1(Math.log1p(min) + t * (Math.log1p(max) - Math.log1p(min))));
  const gradient = `linear-gradient(90deg, ${Array.from({ length: 13 }, (_, i) => `${bpColorCss(i / 12)} ${i / 12 * 100}%`).join(",")})`;

  function select(iso: string, locate = false) {
    if (drag.current?.moved) return;
    const row = byISO.get(iso);
    if (!row) return;
    onCountryClick?.(row.originalISO); // Preserve PHI and other API keys at the application boundary.
    setQuery("");
    if (locate) {
      const coordinates = getPositionOrNull(iso);
      const point = coordinates && projection(coordinates);
      if (point) setCamera({ x: WIDTH / 2 - point[0] * 2.5, y: HEIGHT / 2 - point[1] * 2.5, k: 2.5 });
    }
  }
  function zoom(factor: number, point: [number, number] = [WIDTH / 2, HEIGHT / 2]) {
    setCamera(previous => {
      const k = Math.min(7, Math.max(1, previous.k * factor));
      return k === 1 ? HOME : { k, x: point[0] - (point[0] - previous.x) * k / previous.k, y: point[1] - (point[1] - previous.y) * k / previous.k };
    });
  }
  function localPoint(clientX: number, clientY: number): [number, number] {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return [WIDTH / 2, HEIGHT / 2];
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return [point.x, point.y];
  }

  return (
    <section ref={rootRef} className={`${styles.atlas} ${expanded ? styles.expanded : ""} ${className ?? ""}`} data-testid="strategic-atlas" data-fullscreen={expanded} aria-label="Стратегический атлас"
      onKeyDown={event => {
        if (event.key === "Escape" && expanded && !query) { event.preventDefault(); void toggleExpanded(); }
      }}> 
      <svg ref={svgRef} className={styles.map} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Интерактивная карта стран"
        onDoubleClick={event => zoom(1.7, localPoint(event.clientX, event.clientY))}
        onWheel={event => zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12, localPoint(event.clientX, event.clientY))}
        onPointerDown={event => {
          if (event.button !== 0) return;
          const [x, y] = localPoint(event.clientX, event.clientY);
          drag.current = { x, y, startX: camera.x, startY: camera.y, moved: false };
        }}
        onPointerMove={event => {
          const start = drag.current;
          if (!start || event.buttons !== 1) return;
          const [x, y] = localPoint(event.clientX, event.clientY);
          if (Math.hypot(x - start.x, y - start.y) > 4) {
            start.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setCamera(previous => ({ ...previous, x: Math.max(-WIDTH * previous.k, Math.min(WIDTH, start.startX + x - start.x)), y: Math.max(-HEIGHT * previous.k, Math.min(HEIGHT, start.startY + y - start.y)) }));
          }
        }}
        onPointerUp={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          // Keep moved until click has fired; the next pointerdown resets it.
        }}
        onPointerCancel={() => { drag.current = null; }}
        onPointerLeave={() => setHovered(null)}>
        <defs>
          <pattern id="atlas-no-data" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#192a36" /><path d="M0 6L6 0" stroke="#263d49" strokeWidth="0.6" /></pattern>
        </defs>
        <g data-testid="atlas-camera" transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
          <path d={path({ type: "Sphere" }) ?? ""} fill="#0c202c" stroke="#2a4656" strokeWidth="1" />
          <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="#284453" strokeOpacity="0.5" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          {shapes.map(shape => {
            const row = byISO.get(shape.iso);
            const value = row?.value;
            const isSelected = selected === shape.iso;
            return <path key={shape.iso} data-iso={shape.iso} d={shape.d}
              role={row ? "button" : undefined} tabIndex={row ? 0 : undefined}
              aria-label={`${shape.name}: ${value != null ? `${format(value)} ${metric.unit}` : "нет данных"}`}
              aria-pressed={row ? isSelected : undefined}
              fill={value != null ? bpColorCss(ratio(value)) : "url(#atlas-no-data)"}
              fillOpacity={selected && !isSelected && hovered !== shape.iso ? 0.63 : 0.9}
              stroke={isSelected ? "#ffe2a0" : hovered === shape.iso ? "#e4fbff" : "#668994"}
              strokeWidth={isSelected ? 2.4 : hovered === shape.iso ? 1.8 : 0.65}
              vectorEffect="non-scaling-stroke" className={styles.country}
              onPointerEnter={() => setHovered(shape.iso)} onPointerLeave={() => setHovered(null)} onFocus={() => { drag.current = null; setHovered(shape.iso); }} onBlur={() => setHovered(null)}
              onClick={() => select(shape.iso)}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(shape.iso); } }}>
              <title>{shape.name}: {value != null ? `${format(value)} ${metric.unit}` : "нет данных"}</title>
            </path>;
          })}
          {rows.filter(row => !shapes.some(shape => shape.iso === row.iso)).map(row => {
            const coordinates = getPositionOrNull(row.iso);
            const point = coordinates && projection(coordinates);
            if (!point) return null;
            return <circle key={row.iso} data-iso={row.iso} cx={point[0]} cy={point[1]} r={6 / camera.k}
              role="button" tabIndex={0} aria-label={`${row.name}: ${row.value != null ? `${format(row.value)} ${metric.unit}` : "нет данных"}`}
              aria-pressed={selected === row.iso} className={styles.country}
              fill={row.value != null ? bpColorCss(ratio(row.value)) : "#192a36"}
              stroke={selected === row.iso ? "#ffe2a0" : "#e4fbff"} strokeWidth={1.5} vectorEffect="non-scaling-stroke"
              onPointerEnter={() => setHovered(row.iso)} onPointerLeave={() => setHovered(null)}
              onFocus={() => { drag.current = null; setHovered(row.iso); }} onBlur={() => setHovered(null)}
              onClick={() => select(row.iso)}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(row.iso); } }}>
              <title>{row.name} · условный маркер, граница отсутствует в масштабе карты</title>
            </circle>;
          })}
          {showConflicts && conflictMarks.map(({ zone, point }) => {
            const isActive = activeZone?.id === zone.id;
            const isHovered = hoveredZone === zone.id;
            const ringR = (zone.radiusKm / 60) * 0.9;
            const color = zone.type === "war" ? "#c76a5a" : zone.type === "insurgency" ? "#c78a4a" : zone.type === "maritime_dispute" ? "#6f9dbb" : zone.type === "frozen" ? "#8fa1ac" : "#d8a03c";
            const opacity = 0.12 + zone.intensity * 0.02;
            return <g key={zone.id} data-testid="atlas-conflict" data-zone={zone.id}
              transform={`translate(${point[0]} ${point[1]}) scale(${1 / (camera.k * screenScale)})`}
              role="button" tabIndex={0} className={styles.facility}
              aria-label={`${zone.nameRu} · ${CONFLICT_TYPE_LABELS_RU[zone.type]}`}
              aria-pressed={isActive}
              onPointerEnter={() => setHoveredZone(zone.id)}
              onPointerLeave={() => setHoveredZone(null)}
              onFocus={() => { drag.current = null; setHoveredZone(zone.id); }}
              onBlur={() => setHoveredZone(null)}
              onClick={event => { if (drag.current?.moved) return; event.stopPropagation(); setActiveZone(zone); }}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveZone(zone); } }}>
              <circle r={Math.max(14, ringR)} fill="transparent" />
              <circle className={styles.conflictPulse} r={ringR} fill="none" stroke={color} strokeWidth="1.4" style={{ animationDuration: `${Math.max(2.6, 5.6 - zone.intensity * 0.3).toFixed(1)}s` }} pointerEvents="none" />
              <circle r={ringR} fill={color} fillOpacity={isActive || isHovered ? opacity * 1.8 : opacity} stroke={color} strokeOpacity="0.7" strokeWidth="1.2" pointerEvents="none" />
              <circle r="3.2" fill={color} stroke="#0b201a" strokeWidth="1.2" pointerEvents="none" />
              <title>{zone.nameRu} · {CONFLICT_TYPE_LABELS_RU[zone.type]} · интенсивность {zone.intensity}/10</title>
            </g>;
          })}
          {showFacilities && facilityMarks.map(({ facility, point }) => {
            const isActive = activeFacility?.id === facility.id;
            const isHovered = hoveredFacility === facility.id;
            const r = 4 + facility.strategicValue * 0.6;
            const hitRadius = Math.max(r + 2, Math.min(8, 10 / camera.k));
            return <g key={facility.id} data-testid="atlas-facility" data-facility={facility.id}
              transform={`translate(${point[0]} ${point[1]}) scale(${1 / (camera.k * screenScale)})`}
              role="button" tabIndex={0} className={styles.facility}
              aria-label={`${facility.nameRu} · ${FACILITY_TYPE_LABELS_RU[facility.type]}`}
              aria-pressed={isActive}
              onPointerEnter={() => setHoveredFacility(facility.id)}
              onPointerLeave={() => setHoveredFacility(null)}
              onFocus={() => { drag.current = null; setHoveredFacility(facility.id); }}
              onBlur={() => setHoveredFacility(null)}
              onClick={event => { if (drag.current?.moved) return; event.stopPropagation(); setActiveFacility(facility); }}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveFacility(facility); } }}>
              <circle r={hitRadius} fill="transparent" pointerEvents="all" />
              {facility.strategicValue >= 8 && <circle r={r + 3.5} fill="none" stroke={FACILITY_COLORS[facility.type]} strokeOpacity="0.4" strokeWidth="1" pointerEvents="none" />}
              {(isActive || isHovered) && <circle r={r + 4} fill="none" stroke="#f4e6c9" strokeWidth="1.6" pointerEvents="none" />}
              <g pointerEvents="none"><FacilitySymbol type={facility.type} color={FACILITY_COLORS[facility.type]} r={r} /></g>
              <title>{facility.nameRu} · {FACILITY_TYPE_LABELS_RU[facility.type]}</title>
            </g>;
          })}
          {visibleFacilityLabels.map(({ facility, point }) => (
            <g key={`lbl-${facility.id}`} data-testid="facility-label" transform={`translate(${point[0]} ${point[1]}) scale(${1 / (camera.k * screenScale)})`} className={styles.facilityLabel} pointerEvents="none">
              <text x="10" y="4">{facility.nameRu}</text>
            </g>
          ))}
          {labels && visibleLabels.map(({ row, point }) => {
            return <g key={row.iso} data-testid="atlas-label" transform={`translate(${point[0]} ${point[1]}) scale(${1 / (camera.k * screenScale)})`} className={styles.label}>
              <circle r="3" fill="#f4e6c9" stroke="#0b201a" strokeWidth="1.5" />
              <text x="8" y="-6">{row.name}</text><text x="8" y="10" className={styles.labelValue}>{format(row.value!)}</text>
            </g>;
          })}
        </g>
      </svg>

      <header className={styles.heading}>
        <div className={styles.eyebrow}><Globe2 size={13} /> СТРАТЕГИЧЕСКИЙ АТЛАС <span> / {String(Object.keys(METRICS).indexOf(activeLayer) + 1).padStart(2, "0")}</span></div>
        <h2>{metric.title}</h2>
        <p>{metric.note}</p>
        <div className={styles.summary}><span><b>{ranked.length}</b> стран с данными</span><span>Локальная векторная карта</span></div>
      </header>

      <div className={styles.search}>
        <Search size={15} /><input role="combobox" aria-label="Найти страну на карте" aria-autocomplete="list" aria-expanded={!!query} aria-controls={`${searchId}-list`} aria-activedescendant={query && filtered[searchIndex] ? `${searchId}-${searchIndex}` : undefined}
          placeholder="Страна или ISO-код…" value={query} onChange={event => { setQuery(event.target.value); setSearchIndex(-1); }}
          onKeyDown={event => {
            if (event.key === "Escape") { event.stopPropagation(); setQuery(""); setSearchIndex(-1); }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setSearchIndex(previous => filtered.length ? (previous + (event.key === "ArrowDown" ? 1 : filtered.length - 1) + filtered.length) % filtered.length : -1);
            }
            if (event.key === "Enter" && query && filtered.length) {
              event.preventDefault(); drag.current = null; select(filtered[Math.max(0, searchIndex)]?.iso ?? filtered[0].iso, true);
            }
          }} />
        {query && <><button aria-label="Очистить поиск карты" onClick={() => setQuery("")}><X size={14} /></button><div id={`${searchId}-list`} role="listbox" aria-label="Найденные страны" className={styles.results}>
          {filtered.length ? filtered.map((row, index) => <button role="option" aria-selected={index === searchIndex} id={`${searchId}-${index}`} key={row.iso} onClick={() => { drag.current = null; select(row.iso, true); }}><span>{row.name}</span><b>{row.value != null ? format(row.value) : "—"}</b></button>) : <p role="status">Страна не найдена</p>}
        </div></>} 
      </div>

      {expanded && onLayerChange && <div className={styles.fullscreenLayers}><LayerSelector activeLayer={activeLayer} onLayerChange={onLayerChange} /></div>}
      <div className={styles.tools} aria-label="Управление картой">
        <button ref={fullscreenButtonRef} aria-label={expanded ? "Свернуть карту" : "Развернуть карту"} title={expanded ? "Свернуть карту · Esc" : "Развернуть карту"} aria-pressed={expanded} onClick={() => void toggleExpanded()}>{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
        <button aria-label="Показать выбранную страну" title="Показать выбранную страну" disabled={!selected || !getPositionOrNull(selected)} onClick={() => { if (selected) { drag.current = null; select(selected, true); } }}><Crosshair size={18} /></button>
        <button aria-label="Увеличить масштаб" title="Увеличить масштаб" onClick={() => zoom(1.4)}><Plus size={18} /></button>
        <button aria-label="Уменьшить масштаб" title="Уменьшить масштаб" onClick={() => zoom(1 / 1.4)}><Minus size={18} /></button>
        <span>{camera.k.toFixed(1)}×</span>
        <button aria-label="Сбросить вид" title="Весь мир" onClick={() => setCamera(HOME)}><RotateCcw size={17} /></button>
        <button aria-label="Подписи стран" aria-pressed={labels} title="Подписи стран" onClick={() => setLabels(value => !value)}><span>Aa</span></button>
        <button aria-label="Базы и стратегические объекты" aria-pressed={showFacilities} title="Базы и стратегические объекты" data-testid="facilities-toggle" onClick={() => { setShowFacilities(value => !value); setActiveFacility(null); }}><Radar size={17} /></button>
        <button aria-label="Зоны конфликтов" aria-pressed={showConflicts} title="Зоны конфликтов" data-testid="conflicts-toggle" onClick={() => { setShowConflicts(value => !value); setActiveZone(null); }}><Flame size={17} /></button>
      </div>

      <div className={styles.regions} aria-label="Регионы карты">
        <button onClick={() => setCamera(HOME)}><Globe2 size={12} /> Мир</button>
        {[{ name: "Европа", point: [22, 51] as [number, number], k: 3.4 }, { name: "Азия", point: [100, 35] as [number, number], k: 2.4 }].map(region => <button key={region.name} onClick={() => { const point = projection(region.point)!; setCamera({ k: region.k, x: WIDTH / 2 - point[0] * region.k, y: HEIGHT / 2 - point[1] * region.k }); }}>{region.name}</button>)}
      </div>

      <div className={styles.legend} data-testid="atlas-legend">
        <div className={styles.legendTitle}><b>{metric.unit}</b><span>{activeLayer === "bp" ? "Линейная шкала" : "Логарифмическая шкала"}</span></div>
        <div className={styles.gradient} style={{ background: gradient }} />
        <div className={styles.ticks}>{ticks.map((value, index) => <span key={index}>{format(value)}</span>)}</div>
        <div className={styles.legendNote}><i /> Нет данных <span>Цвет — значение показателя</span></div>
      </div>

      {showInspector && <aside className={styles.inspector} data-testid="atlas-inspector" aria-label="Показатели страны">
        {focusISO ? <>
          <div className={styles.eyebrow}><Crosshair size={12} /> {selected === focusISO ? "ВЫБРАННАЯ СТРАНА" : "НА КАРТЕ"}<span>{focusISO}</span></div>
          <h3>{focusName ?? focusISO}</h3>
          <div className={styles.reading}>{focus?.value != null ? format(focus.value) : "—"}<small>{focus?.value != null ? metric.unit : "нет данных"}</small></div>
          {focus?.value != null && <div className={styles.rank}>Место <b>{rank.get(focusISO)}</b> из {ranked.length} в текущей выборке</div>}
          {focus?.details && <dl className={styles.facts}><div><dt>Бюджет, млрд $</dt><dd>{valid(focus.details.militaryBudgetBn) ? format(focus.details.militaryBudgetBn) : "—"}</dd></div><div><dt>Авиация</dt><dd>{valid(focus.details.totalAircraft) ? format(focus.details.totalAircraft) : "—"}</dd></div><div><dt>Танки</dt><dd>{valid(focus.details.totalTanks) ? format(focus.details.totalTanks) : "—"}</dd></div></dl>}
          {focus && <button className={styles.details} onClick={() => { drag.current = null; select(focusISO, true); }}>Открыть анализ страны <ArrowUpRight size={15} /></button>}
        </> : <>
          <div className={styles.eyebrow}>ЛИДЕРЫ ПО ПОКАЗАТЕЛЮ</div>
          {ranked.slice(0, 5).map((row, index) => <button className={styles.leader} key={row.iso} onClick={() => { drag.current = null; select(row.iso, true); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.name}</strong><b>{format(row.value!)}</b></button>)}
          <p className={styles.hint}>Выберите страну для подробного анализа</p>
        </>}
      </aside>}

      {activeZone && <aside className={styles.facilityCard} data-testid="conflict-card" aria-label="Зона конфликта">
        <div className={styles.eyebrow}><Flame size={12} /> {CONFLICT_TYPE_LABELS_RU[activeZone.type].toUpperCase()}<span>с {activeZone.since}</span>
          <button aria-label="Закрыть карточку зоны" onClick={() => setActiveZone(null)}><X size={13} /></button></div>
        <h3>{activeZone.nameRu}</h3>
        <p className={styles.facilityMeta}>Стороны: {activeZone.parties.join(", ") || "—"} · интенсивность {activeZone.intensity}/10</p>
        {activeZone.noteRu && <p className={styles.facilityNote}>{activeZone.noteRu}</p>}
        <p className={styles.facilitySource}>Источник: {activeZone.source}</p>
      </aside>}

      {activeFacility && <aside className={styles.facilityCard} data-testid="facility-card" aria-label="Стратегический объект">
        <div className={styles.eyebrow}><Radar size={12} /> {FACILITY_TYPE_LABELS_RU[activeFacility.type].toUpperCase()}<span>{activeFacility.hostIso}</span>
          <button aria-label="Закрыть карточку объекта" onClick={() => setActiveFacility(null)}><X size={13} /></button></div>
        <h3>{activeFacility.nameRu}</h3>
        <p className={styles.facilityMeta}>{activeFacility.hostName} · оператор: {activeFacility.operator} · значимость {activeFacility.strategicValue}/10</p>
        {activeFacility.noteRu && <p className={styles.facilityNote}>{activeFacility.noteRu}</p>}
        <p className={styles.facilitySource}>Источник: {activeFacility.source}</p>
      </aside>}

      {showFacilities && <div className={styles.typeFilters} role="group" aria-label="Фильтр типов объектов">
        {presentTypes.map(type => {
          const enabled = !disabledTypes.has(type);
          return <button key={type} type="button" aria-pressed={enabled} data-testid={`filter-${type}`}
            title={FACILITY_TYPE_LABELS_RU[type]}
            onClick={() => setDisabledTypes(previous => {
              const next = new Set(previous);
              if (next.has(type)) { next.delete(type); } else { next.add(type); }
              return next;
            })}>
            <i style={{ background: FACILITY_COLORS[type] }} />{FACILITY_TYPE_LABELS_RU[type]}
            <b>{typeCounts.get(type) ?? 0}</b>
          </button>;
        })}
      </div>}

      <footer className={styles.footer}><span>Natural Earth · границы условны</span><span>Данные: база РБП · не в реальном времени</span></footer>
      {!geography && <div className={styles.loading} role="status">{error ? <><b>Не удалось загрузить границы</b><p>Проверьте соединение с приложением.</p><button onClick={() => { clearBoundaryCache(); setError(false); setAttempt(value => value + 1); }}>Повторить</button></> : "Загрузка векторной карты…"}</div>}
    </section>
  );
}
