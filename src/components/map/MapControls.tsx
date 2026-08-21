"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Compass,
  RotateCcw,
  Layers,
  Map,
  Satellite,
} from "lucide-react";

/** Available map styles */
export type MapStyle = "dark-v11" | "satellite-v9" | "dark-dem";

/**
 * MapLibre/OpenFreeMap styles. They are public and require no Mapbox token.
 * The style keys remain stable for the existing toolbar and scenario state.
 */
export const MAP_STYLE_URLS: Record<MapStyle, string> = {
  "dark-v11": "https://tiles.openfreemap.org/styles/liberty",
  "satellite-v9": "https://tiles.openfreemap.org/styles/liberty",
  "dark-dem": "https://tiles.openfreemap.org/styles/liberty",
};

interface MapControlsProps {
  /** Zoom in handler */
  onZoomIn: () => void;
  /** Zoom out handler */
  onZoomOut: () => void;
  /** Reset view handler */
  onReset: () => void;
  /** Compass click handler (reset north) */
  onCompass: () => void;
  /** Map style change handler */
  onStyleChange: (style: MapStyle) => void;
  /** Current active map style */
  activeStyle: MapStyle;
  /** Whether layer selector is open */
  layerOpen: boolean;
  /** Toggle layer selector */
  onToggleLayers: () => void;
  /** Whether the choropleth layer is visible */
  choroplethVisible: boolean;
  /** Toggle choropleth layer visibility */
  onToggleChoropleth: () => void;
}

interface HUDButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  /** True when the button opens a menu/panel (adds keyboard menu semantics). */
  ariaExpanded?: boolean;
}

function HUDButton({ onClick, active, label, children, ariaExpanded }: HUDButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaExpanded ? "true" : undefined}
      className={`
        glass-panel rounded-md p-2 cursor-pointer
        transition-colors duration-150
        ${
          active
            ? "border-tactical-primary/50 text-tactical-primary"
            : "text-white/60 hover:text-tactical-primary hover:border-tactical-primary/30"
        }
      `}
    >
      {children}
    </button>
  );
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onCompass,
  onStyleChange,
  activeStyle,
  layerOpen,
  onToggleLayers,
  choroplethVisible,
  onToggleChoropleth,
}: MapControlsProps) {
  const handleStyleSelect = useCallback(
    (style: MapStyle) => () => {
      onStyleChange(style);
    },
    [onStyleChange]
  );

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 font-mono">
      {/* Zoom controls */}
      <div className="flex flex-col gap-1">
        <HUDButton onClick={onZoomIn} label="Увеличить масштаб">
          <ZoomIn size={18} />
        </HUDButton>
        <HUDButton onClick={onZoomOut} label="Уменьшить масштаб">
          <ZoomOut size={18} />
        </HUDButton>
      </div>

      {/* Compass & Reset */}
      <HUDButton onClick={onCompass} label="Сбросить направление">
        <Compass size={18} />
      </HUDButton>
      <HUDButton onClick={onReset} label="Сбросить вид">
        <RotateCcw size={18} />
      </HUDButton>

      {/* Layer selector */}
      <div className="relative">
        <HUDButton
          onClick={onToggleLayers}
          active={layerOpen}
          label="Слои карты"
          ariaExpanded={layerOpen}
        >
          <Layers size={18} />
        </HUDButton>

        {/* Layer dropdown */}
        {layerOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute top-0 right-full mr-2 glass-panel rounded-md p-2 min-w-[180px]"
          >
            {/* Map Styles */}
            <div className="text-[10px] tracking-widest text-tactical-primary/60 uppercase mb-2 px-1">
              Стиль карты
            </div>
            {(
              [
                { key: "dark-v11" as MapStyle, icon: Map, label: "Тактическая тёмная" },
                { key: "satellite-v9" as MapStyle, icon: Satellite, label: "Спутник" },
                { key: "dark-dem" as MapStyle, icon: Map, label: "Тёмная (альт.)" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={handleStyleSelect(key)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer
                  ${
                    activeStyle === key
                      ? "bg-tactical-primary/15 text-tactical-primary"
                      : "text-white/60 hover:text-tactical-primary hover:bg-tactical-primary/5"
                  }
                `}
              >
                <Icon size={14} />
                <span className="tracking-wider">{label}</span>
                {activeStyle === key && (
                  <span className="ml-auto text-tactical-primary">●</span>
                )}
              </button>
            ))}

            {/* Divider */}
            <div className="h-px bg-tactical-primary/10 my-2" />

            {/* Data Layers */}
            <div className="text-[10px] tracking-widest text-tactical-primary/60 uppercase mb-2 px-1">
              Слои данных
            </div>
            <button
              onClick={onToggleChoropleth}
              type="button"
              aria-pressed={choroplethVisible}
              className={`
                w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer
                ${
                  choroplethVisible
                    ? "bg-tactical-primary/15 text-tactical-primary"
                    : "text-white/40 hover:text-tactical-primary/80"
                }
              `}
            >
              <Layers size={14} />
              <span className="tracking-wider">Хороплет БП</span>
              <span className="ml-auto text-[10px]">
                {choroplethVisible ? "ВКЛ" : "ВЫКЛ"}
              </span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default MapControls;
