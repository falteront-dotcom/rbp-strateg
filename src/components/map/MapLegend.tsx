"use client";

import { useMemo } from "react";

interface MapLegendProps {
  /** Minimum BP value on the scale */
  minBP: number;
  /** Maximum BP value on the scale */
  maxBP: number;
  /** Whether the legend is visible */
  visible: boolean;
}

/** OKLCH color for a given t [0,1] — same algorithm as ChoroplethLayer */
function oklchToRgbCSS(t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  let l: number, c: number, h: number;
  if (tc <= 0.5) {
    const s = tc * 2;
    l = 75 + s * 10;
    c = 0.18;
    h = 200 - s * 110;
  } else {
    const s = (tc - 0.5) * 2;
    l = 85 - s * 20;
    c = 0.18 + s * 0.07;
    h = 90 - s * 65;
  }
  return `oklch(${l}% ${c} ${h})`;
}

function formatBP(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(0)}K`;
  return score.toFixed(0);
}

export function MapLegend({ minBP, maxBP, visible }: MapLegendProps) {
  /** Build gradient stops for CSS */
  const gradientCSS = useMemo(() => {
    const stops: string[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const color = oklchToRgbCSS(t);
      stops.push(`${color} ${(t * 100).toFixed(1)}%`);
    }
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }, []);

  /** Tick marks at key values */
  const ticks = useMemo(() => {
    const range = maxBP - minBP;
    const count = 5;
    const values: number[] = [];
    for (let i = 0; i <= count; i++) {
      values.push(minBP + (range * i) / count);
    }
    return values;
  }, [minBP, maxBP]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-6 left-6 z-10 font-mono">
      <div className="glass-panel rounded-md p-3 min-w-[240px]">
        {/* Title */}
        <div className="text-[10px] tracking-[0.2em] text-tactical-primary/70 uppercase mb-2">
          Combat Potential Index
        </div>

        {/* Gradient bar */}
        <div
          className="h-3 rounded-sm border border-tactical-primary/10"
          style={{ background: gradientCSS }}
        />

        {/* Tick labels */}
        <div className="flex justify-between mt-1">
          {ticks.map((val, idx) => (
            <span
              key={idx}
              className="text-[9px] text-white/40 tabular-nums tracking-wider"
            >
              {formatBP(val)}
            </span>
          ))}
        </div>

        {/* Tier labels */}
        <div className="flex justify-between mt-2 px-0.5">
          <span className="text-[8px] tracking-[0.15em] text-teal-400/70 uppercase">
            Low
          </span>
          <span className="text-[8px] tracking-[0.15em] text-yellow-400/70 uppercase">
            Moderate
          </span>
          <span className="text-[8px] tracking-[0.15em] text-red-400/70 uppercase">
            Critical
          </span>
        </div>
      </div>
    </div>
  );
}

export default MapLegend;
