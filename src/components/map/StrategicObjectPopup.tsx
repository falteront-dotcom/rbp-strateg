"use client";

import { Popup } from "react-map-gl/maplibre";
import type { LngLatLike } from "maplibre-gl";
import type { StrategicObject, StrategicObjectType } from "@/lib/geo/strategic-objects";

interface StrategicObjectPopupProps {
  object: StrategicObject | null;
  longitude: number;
  latitude: number;
  onCountryClick: (iso: string) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<StrategicObjectType, string> = {
  capital: "Capital",
  city: "City",
  port: "Port",
  airport: "Airport",
  "military-base": "Military installation",
  "naval-base": "Naval base",
  "strategic-site": "Strategic site",
  "military-range": "Military range",
};

const CONFIDENCE_COLORS = {
  high: "#5bd4c8",
  medium: "#f5c85b",
  low: "#e56b68",
} as const;

export function StrategicObjectPopup({ object, longitude, latitude, onCountryClick, onClose }: StrategicObjectPopupProps) {
  if (!object) return null;
  const anchor: LngLatLike = [longitude, latitude];
  const canOpenCountry = object.isoCode !== "UNK" && object.isoCode.length === 3;

  return (
    <Popup
      longitude={anchor[0]}
      latitude={anchor[1]}
      anchor="bottom"
      offset={[0, 8] as [number, number]}
      closeOnClick={false}
      closeButton
      onClose={onClose}
      maxWidth="300px"
      className="strategic-object-popup"
    >
      <div className="min-w-[230px] max-w-[270px] font-mono text-[10px] text-slate-200">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider text-cyan-100">{object.name}</div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-cyan-300/70">{TYPE_LABELS[object.type]}</div>
          </div>
          <span className="shrink-0 rounded border px-1.5 py-0.5 text-[8px] uppercase tracking-wider" style={{ borderColor: CONFIDENCE_COLORS[object.confidence], color: CONFIDENCE_COLORS[object.confidence] }}>
            {object.confidence}
          </span>
        </div>
        <div className="space-y-1.5 border-t border-white/10 pt-2 text-white/60">
          {object.designation && <div><span className="text-white/35">REF </span>{object.designation}</div>}
          {object.operator && <div><span className="text-white/35">OPERATOR </span>{object.operator}</div>}
          <div><span className="text-white/35">COUNTRY </span>{object.isoCode}</div>
          <div><span className="text-white/35">SOURCE </span>{object.source}</div>
          <div><span className="text-white/35">SOURCE DATE </span>{object.sourceDate.slice(0, 10)}</div>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2 text-[9px] leading-relaxed text-white/40">
          Publicly documented open-source record. Missing records do not imply absence.
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {canOpenCountry && (
            <button type="button" onClick={() => onCountryClick(object.isoCode)} className="text-[9px] uppercase tracking-wider text-cyan-300 hover:text-cyan-100">
              Country details
            </button>
          )}
          {object.sourceUrl && (
            <a href={object.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto text-[9px] uppercase tracking-wider text-cyan-300 hover:text-cyan-100">
              Open source ↗
            </a>
          )}
        </div>
      </div>
    </Popup>
  );
}
