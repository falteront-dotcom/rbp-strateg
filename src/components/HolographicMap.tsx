"use client";

import React from "react";
import type { ActiveUnit } from "@/lib/rbp-engine";

const VERTICALS = Array.from({ length: 11 }, (_, index) => index * 100);
const HORIZONTALS = Array.from({ length: 7 }, (_, index) => index * 100);

/** Functional theater grid. Unit markers are rendered by TacticalHUD above this layer. */
export default function HolographicMap({ units = [] }: { units?: ActiveUnit[]; c2Nodes?: string[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#061219]">
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <rect width="1000" height="600" fill="#061219" />
        <g stroke="#29434e" strokeWidth="0.8" opacity="0.68">
          {VERTICALS.map(x => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="600" />)}
          {HORIZONTALS.map(y => <line key={`h-${y}`} x1="0" y1={y} x2="1000" y2={y} />)}
        </g>
        <g stroke="#3e6471" strokeWidth="1" opacity="0.45" fill="none">
          <circle cx="500" cy="300" r="75" />
          <circle cx="500" cy="300" r="150" />
          <circle cx="500" cy="300" r="225" />
          <line x1="500" y1="0" x2="500" y2="600" />
          <line x1="0" y1="300" x2="1000" y2="300" />
        </g>
        <g fill="#52717c" fontFamily="var(--font-mono)" fontSize="10">
          {VERTICALS.slice(1, -1).map((x, index) => <text key={`vx-${x}`} x={x + 5} y="18">{String(index + 1).padStart(2, "0")}</text>)}
          {HORIZONTALS.slice(1, -1).map((y, index) => <text key={`hy-${y}`} x="8" y={y - 7}>{String.fromCharCode(65 + index)}</text>)}
          <text x="20" y="580">ТЕАТР / 1000 × 600</text>
          <text x="980" y="580" textAnchor="end">СЕТКА 100</text>
        </g>
        <g stroke="#4fb287" strokeWidth="0.9" opacity="0.3">
          {units.flatMap(unit => units
            .filter(other => other.id !== unit.id && other.unit.side === unit.unit.side)
            .filter(other => Math.hypot(other.lon - unit.lon, other.lat - unit.lat) < 30)
            .map(other => (
              <line key={`${unit.id}-${other.id}`} x1={`${unit.lon}%`} y1={`${unit.lat}%`} x2={`${other.lon}%`} y2={`${other.lat}%`} />
            )))}
        </g>
      </svg>
    </div>
  );
}
