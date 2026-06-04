"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
type TerrainType = "plains" | "forest" | "mountain" | "urban" | "water" | "desert";

interface TerrainCell {
  type: TerrainType;
  elevation: number;  // 0-3
  cover: number;      // 0-5 defense bonus
  moveCost: number;   // 1-4 movement points
  visibility: number; // 1-5 range
}

interface TacticalUnit {
  id: string;
  name: string;
  type: "infantry" | "armor" | "artillery" | "air_defense" | "aviation";
  side: "blue" | "red";
  strength: number;
  range: number;
  mobility: number;
  armor: number;
  firepower: number;
  row: number;
  col: number;
}

interface TacticalMapProps {
  gridSize?: number;
  onCellClick?: (row: number, col: number) => void;
  units?: TacticalUnit[];
  selectedUnit?: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TERRAIN_CONFIG: Record<TerrainType, { color: string; icon: string; cover: number; moveCost: number; visibility: number }> = {
  plains: { color: "#2d4a2d", icon: "━", cover: 1, moveCost: 1, visibility: 5 },
  forest: { color: "#1a3a1a", icon: "♠", cover: 3, moveCost: 2, visibility: 2 },
  mountain: { color: "#4a3a2a", icon: "▲", cover: 4, moveCost: 3, visibility: 4 },
  urban: { color: "#3a3a4a", icon: "⌂", cover: 4, moveCost: 2, visibility: 1 },
  water: { color: "#1a2a3a", icon: "≈", cover: 0, moveCost: 4, visibility: 5 },
  desert: { color: "#4a3a1a", icon: "·", cover: 0, moveCost: 1, visibility: 5 },
};

const UNIT_ICONS: Record<string, Record<string, string>> = {
  blue: {
    infantry: "⊹",
    armor: "▣",
    artillery: "⊙",
    air_defense: "⊕",
    aviation: "✈",
  },
  red: {
    infantry: "⊹",
    armor: "▣",
    artillery: "⊙",
    air_defense: "⊕",
    aviation: "✈",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateTerrain(size: number): TerrainCell[][] {
  // Seeded pseudo-random terrain generation
  const grid: TerrainCell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: TerrainCell[] = [];
    for (let c = 0; c < size; c++) {
      const hash = ((r * 7 + c * 13 + r * c) % 17) / 17;
      let type: TerrainType;
      if (hash < 0.35) type = "plains";
      else if (hash < 0.55) type = "forest";
      else if (hash < 0.7) type = "mountain";
      else if (hash < 0.82) type = "urban";
      else if (hash < 0.92) type = "water";
      else type = "desert";

      const cfg = TERRAIN_CONFIG[type];
      row.push({
        type,
        elevation: type === "mountain" ? 2 + Math.floor(hash * 2) : type === "water" ? 0 : 1,
        cover: cfg.cover,
        moveCost: cfg.moveCost,
        visibility: cfg.visibility,
      });
    }
    grid.push(row);
  }
  return grid;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TacticalMap({
  gridSize = 10,
  onCellClick,
  units = [],
  selectedUnit,
}: TacticalMapProps) {
  const [terrain] = useState<TerrainCell[][]>(() => generateTerrain(gridSize));
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const unitMap = useMemo(() => {
    const map = new Map<string, TacticalUnit>();
    for (const u of units) {
      map.set(`${u.row}-${u.col}`, u);
    }
    return map;
  }, [units]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      onCellClick?.(row, col);
    },
    [onCellClick]
  );

  return (
    <div className="space-y-2">
      {/* Map grid */}
      <div
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          maxWidth: gridSize * 40,
        }}
      >
        {terrain.map((row, r) =>
          row.map((cell, c) => {
            const unit = unitMap.get(`${r}-${c}`);
            const isHovered = hoveredCell?.row === r && hoveredCell?.col === c;
            const cfg = TERRAIN_CONFIG[cell.type];

            return (
              <motion.div
                key={`${r}-${c}`}
                className="aspect-square rounded-sm flex items-center justify-center cursor-pointer relative border"
                style={{
                  backgroundColor: cfg.color,
                  borderColor: isHovered ? "#22d3ee" : "transparent",
                  fontSize: "10px",
                }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleCellClick(r, c)}
                onMouseEnter={() => setHoveredCell({ row: r, col: c })}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {/* Terrain icon */}
                <span className="text-slate-600/40 text-[8px] select-none">{cfg.icon}</span>

                {/* Unit overlay */}
                {unit && (
                  <span
                    className="absolute inset-0 flex items-center justify-center font-bold"
                    style={{
                      color: unit.side === "blue" ? "#22d3ee" : "#ef4444",
                      fontSize: "12px",
                      textShadow: "0 0 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {UNIT_ICONS[unit.side]?.[unit.type] ?? "?"}
                  </span>
                )}

                {/* Selected unit indicator */}
                {unit && selectedUnit === unit.id && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-tactical-primary animate-pulse" />
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[9px] font-mono">
        {Object.entries(TERRAIN_CONFIG).map(([type, cfg]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
            <span className="text-slate-400 capitalize">{type}</span>
          </span>
        ))}
      </div>

      {/* Hovered cell info */}
      {hoveredCell && (
        <div className="glass-panel rounded-md px-3 py-1.5 text-[10px] font-mono text-slate-400 space-y-0.5">
          <div>
            Клетка ({hoveredCell.row},{hoveredCell.col}) —{" "}
            <span className="text-slate-300 capitalize">
              {terrain[hoveredCell.row]?.[hoveredCell.col]?.type ?? "—"}
            </span>
          </div>
          <div className="flex gap-3">
            <span>Укрытие: {terrain[hoveredCell.row]?.[hoveredCell.col]?.cover ?? "—"}</span>
            <span>Стоимость движ.: {terrain[hoveredCell.row]?.[hoveredCell.col]?.moveCost ?? "—"}</span>
            <span>Видимость: {terrain[hoveredCell.row]?.[hoveredCell.col]?.visibility ?? "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
