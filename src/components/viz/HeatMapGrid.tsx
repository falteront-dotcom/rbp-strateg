"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeatMapGridProps {
  data: number[][];
  rowLabels: string[];
  colLabels: string[];
  colorScale?: (value: number) => string;
  maxValue?: number;
}

// ─── Default color scale ──────────────────────────────────────────────────────
function defaultHeatColor(value: number, max: number): string {
  const t = max > 0 ? value / max : 0;
  if (t >= 0.8) return "#ef4444";
  if (t >= 0.6) return "#f59e0b";
  if (t >= 0.4) return "#4fb287";
  if (t >= 0.2) return "#6b8fa0";
  return "#1e293b";
}

// ─── Component ───────────────────────────────────────────────────────────────
export function HeatMapGrid({
  data,
  rowLabels,
  colLabels,
  maxValue,
}: HeatMapGridProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const max = maxValue ?? Math.max(...data.flat(), 0.01);

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-0.5">
        <div className="w-8" /> {/* spacer for row labels */}
        {colLabels.map((label, idx) => (
          <div
            key={idx}
            className="flex-1 text-center text-[10px] text-slate-500 font-mono truncate"
            title={label}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {data.map((row, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-0.5">
          <div className="w-8 text-[10px] text-slate-500 font-mono truncate text-right pr-1" title={rowLabels[rowIdx]}>
            {rowLabels[rowIdx]}
          </div>
          {row.map((value, colIdx) => {
            const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
            return (
              <div
                key={colIdx}
                className="flex-1 aspect-square rounded-sm cursor-pointer border"
                style={{
                  backgroundColor: defaultHeatColor(value, max),
                  borderColor: isHovered ? "#4fb287" : "transparent",
                  borderWidth: isHovered ? 1 : 0,
                }}
                onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                onMouseLeave={() => setHoveredCell(null)}
                title={`${rowLabels[rowIdx]} × ${colLabels[colIdx]}: ${value.toFixed(2)}`}
              />
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-1 mt-1">
        <span className="text-[10px] text-slate-600">0</span>
        {["#1e293b", "#6b8fa0", "#4fb287", "#f59e0b", "#ef4444"].map((color, idx) => (
          <div
            key={idx}
            className="w-4 h-2 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="text-[10px] text-slate-600">{max.toFixed(1)}</span>
      </div>

      {/* Hovered cell info */}
      {hoveredCell && (
        <div className="text-[10px] text-slate-400 font-mono">
          {rowLabels[hoveredCell.row]} × {colLabels[hoveredCell.col]}:{" "}
          <span className="text-tactical-primary">
            {data[hoveredCell.row][hoveredCell.col].toFixed(3)}
          </span>
        </div>
      )}
    </div>
  );
}
