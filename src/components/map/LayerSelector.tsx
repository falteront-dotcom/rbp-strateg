"use client";

import { motion } from "framer-motion";
import { IntelLayerIcon } from "@/components/icons/StrategicIcons";

/** Available analytics overlay layers */
export type AnalyticsLayerKey =
  | "bp"
  | "budget"
  | "fleet"
  | "aviation"
  | "tanks"
  | "nukes"
  | "readiness"
  | "logistics"
  | "economy"
  | "manpower"
  | "c2"
  | "artillery"
  | "projection"
  | "alliances"
  | "bases"
  | "airRange"
  | "geoDetails"
  | "a2ad"
  | "chokepoints"
  | "corridors"
  | "flashpoints"
  | "density"
  | "risk";

/** Layer metadata for the selector */
interface LayerOption {
  key: AnalyticsLayerKey;
  label: string;
  shortLabel: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  { key: "bp", label: "Combat Potential", shortLabel: "BP" },
  { key: "budget", label: "Military Budget", shortLabel: "BGT" },
  { key: "fleet", label: "Naval Fleet", shortLabel: "FLEET" },
  { key: "aviation", label: "Air Force", shortLabel: "AIR" },
  { key: "tanks", label: "Armor Corps", shortLabel: "TNK" },
  { key: "nukes", label: "Nuclear Arsenal", shortLabel: "NUKE" },
  { key: "readiness", label: "Readiness / Tempo", shortLabel: "RDY" },
  { key: "logistics", label: "Logistics Reach", shortLabel: "LOG" },
  { key: "economy", label: "War Economy", shortLabel: "ECO" },
  { key: "manpower", label: "Mobilization Depth", shortLabel: "MOB" },
  { key: "c2", label: "C4ISR / EW", shortLabel: "C2" },
  { key: "artillery", label: "Artillery Mass", shortLabel: "ART" },
  { key: "projection", label: "Power Projection", shortLabel: "PROJ" },
  { key: "alliances", label: "Alliance Network", shortLabel: "ALLY" },
  { key: "bases", label: "Military Bases", shortLabel: "BASE" },
  { key: "airRange", label: "Aviation Combat Radius", shortLabel: "RNG" },
  { key: "geoDetails", label: "Geography / Cities / Nodes", shortLabel: "GEO" },
  { key: "a2ad", label: "A2/AD Denial Envelopes", shortLabel: "A2AD" },
  { key: "chokepoints", label: "Maritime Choke Points", shortLabel: "CHOKE" },
  { key: "corridors", label: "Supply Corridors", shortLabel: "SUP" },
  { key: "flashpoints", label: "Crisis Flashpoints", shortLabel: "HOT" },
  { key: "density", label: "BP Density", shortLabel: "DENS" },
  { key: "risk", label: "Escalation Risk", shortLabel: "RISK" },
];

interface LayerSelectorProps {
  /** Currently active analytics layer */
  activeLayer: AnalyticsLayerKey;
  /** Callback when a layer is selected */
  onLayerChange: (layer: AnalyticsLayerKey) => void;
  /** Optional class name */
  className?: string;
}

export function LayerSelector({
  activeLayer,
  onLayerChange,
  className,
}: LayerSelectorProps) {
  return (
    <div className={`flex min-w-0 max-w-[60vw] items-center gap-2 ${className ?? ""}`}>
      <div className="hidden 2xl:block shrink-0 text-[8px] tracking-[0.22em] text-tactical-primary/45 uppercase font-mono px-1">
        Layer
      </div>

      {/* Layer buttons */}
      <div className="custom-scrollbar flex min-w-0 flex-1 flex-row flex-nowrap gap-1 overflow-x-auto overflow-y-hidden pb-1 pr-1">
        {LAYER_OPTIONS.map((opt) => {
          const isActive = activeLayer === opt.key;

          return (
            <motion.button
              key={opt.key}
              onClick={() => onLayerChange(opt.key)}
              className={`
                group relative shrink-0 font-mono text-[10px] tracking-[0.12em] uppercase
                px-2.5 py-1.5 rounded-md border transition-colors duration-150
                cursor-pointer select-none layer-btn-glow
                ${
                  isActive
                    ? "border-tactical-primary/60 text-tactical-primary bg-tactical-primary/10 layer-btn-glow-active shadow-[0_0_12px_oklch(75%_0.18_200/15%)]"
                    : "border-white/8 text-white/35 bg-transparent hover:border-tactical-primary/25 hover:text-white/60 hover:bg-tactical-primary/5"
                }
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              title={opt.label}
            >
              {/* Active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="layer-indicator"
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-tactical-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon + short label */}
              <span className="flex items-center gap-1">
                <IntelLayerIcon name={opt.key} size={15} className="shrink-0" />
                <span>{opt.shortLabel}</span>
              </span>

              {/* Scanline shimmer on active */}
              {isActive && (
                <div className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none">
                  <div className="absolute inset-0 animate-scanline bg-gradient-to-b from-transparent via-tactical-primary/5 to-transparent" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default LayerSelector;
