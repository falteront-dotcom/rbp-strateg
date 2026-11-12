"use client";

import type { StrategicObject, StrategicObjectType } from "@/lib/geo/strategic-objects";

interface ObjectLayerControlsProps {
  objects: readonly StrategicObject[];
  selected: ReadonlySet<StrategicObjectType>;
  onToggle: (type: StrategicObjectType) => void;
}

const GROUPS: Array<{ type: StrategicObjectType; label: string; color: string }> = [
  { type: "military-base", label: "Military bases", color: "#e56b68" },
  { type: "naval-base", label: "Naval bases", color: "#dc6be5" },
  { type: "military-range", label: "Ranges / danger areas", color: "#ff9a62" },
  { type: "airport", label: "Military airfields", color: "#7bb7ff" },
  { type: "strategic-site", label: "Strategic sites", color: "#f5c85b" },
  { type: "port", label: "Ports", color: "#5bd4c8" },
  { type: "capital", label: "Capitals", color: "#f5c85b" },
  { type: "city", label: "Cities", color: "#34b8cb" },
];

export function ObjectLayerControls({ objects, selected, onToggle }: ObjectLayerControlsProps) {
  return (
    <div className="absolute right-16 top-14 z-20 w-[230px] rounded-md border border-cyan-400/20 bg-[#0c1822]/95 p-3 font-mono text-[9px] shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
        <span className="tracking-[0.16em] text-cyan-200/80 uppercase">Object filters</span>
        <span className="text-white/35">{objects.length} loaded</span>
      </div>
      <div className="space-y-1.5">
        {GROUPS.map((group) => {
          const count = objects.filter((object) => object.type === group.type).length;
          const checked = selected.has(group.type);
          return (
            <label key={group.type} className="flex cursor-pointer items-center gap-2 text-white/65 hover:text-white/90">
              <input type="checkbox" checked={checked} onChange={() => onToggle(group.type)} className="sr-only" />
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-sm border" style={{ borderColor: group.color, backgroundColor: checked ? group.color : "transparent" }}>
                {checked && <span className="text-[8px] font-bold text-[#071018]">✓</span>}
              </span>
              <span className="flex-1">{group.label}</span>
              <span className="tabular-nums text-white/30">{count}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-3 border-t border-white/10 pt-2 text-[8px] leading-relaxed text-white/35">
        Open-source locations from OSM and reviewed public references. Coverage is incomplete.
      </div>
    </div>
  );
}
