"use client";

import type { AnalyticsLayerKey } from "./map-types";

interface MapDataLegendProps {
  activeLayer: AnalyticsLayerKey;
  minValue: number;
  maxValue: number;
  objectsVisible: boolean;
  visibleObjects: number;
  totalObjects: number;
}

const METRIC_META: Record<AnalyticsLayerKey, { title: string; unit: string; low: string; high: string; colors: [string, string] }> = {
  bp: { title: "Combat Potential", unit: "BP", low: "LOW", high: "CRITICAL", colors: ["#00c7ad", "#ff4b35"] },
  budget: { title: "Military Budget", unit: "$B", low: "LOW", high: "HIGH", colors: ["#9b70d6", "#f4b6ff"] },
  fleet: { title: "Naval Fleet", unit: "units", low: "SMALL", high: "LARGE", colors: ["#3a9edb", "#a9f0ff"] },
  aviation: { title: "Air Force", unit: "aircraft", low: "SMALL", high: "LARGE", colors: ["#667eea", "#b8c5ff"] },
  tanks: { title: "Armor Corps", unit: "vehicles", low: "SMALL", high: "LARGE", colors: ["#6eaa45", "#d6e875"] },
  nukes: { title: "Nuclear Arsenal", unit: "warheads", low: "LOW", high: "HIGH", colors: ["#f0445e", "#ffbd4a"] },
};

function compactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function MapDataLegend({
  activeLayer,
  minValue,
  maxValue,
  objectsVisible,
  visibleObjects,
  totalObjects,
}: MapDataLegendProps) {
  const metric = METRIC_META[activeLayer];
  const gradient = `linear-gradient(90deg, ${metric.colors[0]}, ${metric.colors[1]})`;

  return (
    <div className="absolute bottom-5 left-5 z-10 w-[250px] font-mono text-[9px]">
      <div className="glass-panel rounded-md border border-white/10 bg-[#0c1822]/95 p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="truncate tracking-[0.18em] text-cyan-200/80 uppercase">{metric.title}</span>
          <span className="shrink-0 text-[8px] text-white/35 uppercase">{metric.unit}</span>
        </div>
        <div className="h-2 rounded-sm" style={{ background: gradient }} />
        <div className="mt-1 flex justify-between text-[8px] tabular-nums text-white/45">
          <span>{compactNumber(minValue)}</span>
          <span>{compactNumber(maxValue)}</span>
        </div>
        <div className="mt-1.5 flex justify-between text-[8px] tracking-[0.12em] uppercase">
          <span style={{ color: metric.colors[0] }}>{metric.low}</span>
          <span style={{ color: metric.colors[1] }}>{metric.high}</span>
        </div>
        <div className="mt-3 border-t border-white/10 pt-2">
          <div className="mb-1 tracking-[0.16em] text-white/45 uppercase">Object layer</div>
          <div className="flex items-center gap-2 text-white/65">
            <span className="inline-flex h-3 min-w-3 items-center justify-center rounded-full border border-[#071018] bg-[#24b8c7] px-0.5 text-[7px] font-bold text-[#071018]">n</span>
            <span>{objectsVisible ? `${visibleObjects} visible / ${totalObjects} loaded` : "hidden"}</span>
          </div>
          {objectsVisible && (
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] text-white/55">
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f5c85b]" />capital</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#e56b68]" />military base</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#dc6be5]" />naval base</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#7bb7ff]" />airfield</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ff9a62]" />range</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#f5c85b]" />strategic site</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#5bd4c8]" />port</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#34b8cb]" />city</span>
            </div>
          )}
          <div className="mt-2 text-[8px] leading-relaxed text-white/35">
            Cluster numbers show documented objects in the area. Click a cluster to zoom in.
          </div>
        </div>
      </div>
    </div>
  );
}
