"use client";

import { useCallback, useState } from "react";
import { Popup } from "react-map-gl/mapbox";
import type { LngLatLike } from "mapbox-gl";
import { motion, AnimatePresence } from "framer-motion";
import type { CountryBPData } from "./ChoroplethLayer";

interface CountryPopupProps {
  /** Currently hovered country data */
  country: CountryBPData | null;
  /** Longitude of the hover point */
  longitude: number;
  /** Latitude of the hover point */
  latitude: number;
  /** Whether the popup is visible */
  visible: boolean;
  /** Callback when "Details" link is clicked */
  onDetailsClick: (iso: string) => void;
}

/** Format BP score with thousand separators */
function formatBP(score: number): string {
  return score.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
}

/** Get BP tier label */
function getBPTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "CRITICAL", color: "text-red-400" };
  if (score >= 60) return { label: "HIGH", color: "text-yellow-400" };
  if (score >= 40) return { label: "MODERATE", color: "text-teal-400" };
  if (score >= 20) return { label: "LOW", color: "text-cyan-400" };
  return { label: "MINIMAL", color: "text-slate-400" };
}

export function CountryPopup({
  country,
  longitude,
  latitude,
  visible,
  onDetailsClick,
}: CountryPopupProps) {
  const handleDetailsClick = useCallback(() => {
    if (country) onDetailsClick(country.iso);
  }, [country, onDetailsClick]);

  if (!visible || !country) return null;

  const tier = getBPTier(country.bpScore);
  const anchor: LngLatLike = [longitude, latitude];

  return (
    <AnimatePresence>
      {visible && (
        <Popup
          longitude={anchor[0]}
          latitude={anchor[1]}
          anchor="bottom"
          offset={[0, 8] as [number, number]}
          closeOnClick={false}
          closeButton={false}
          maxWidth="280px"
          className="country-popup"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="glass-panel rounded-md p-3 min-w-[220px] font-mono"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-tactical-primary tracking-wider uppercase truncate">
                {country.name}
              </h3>
              <span
                className={`text-[10px] font-bold tracking-widest ${tier.color}`}
              >
                {tier.label}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-tactical-primary/20 mb-2" />

            {/* BP Score */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[10px] text-tactical-secondary/70 tracking-wider uppercase">
                BP Score
              </span>
              <span className="text-lg font-bold text-tactical-primary tabular-nums">
                {formatBP(country.bpScore)}
              </span>
            </div>

            {/* Rank */}
            {country.bpRank !== null && (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[10px] text-tactical-secondary/70 tracking-wider uppercase">
                  Rank
                </span>
                <span className="text-sm font-semibold text-white/80 tabular-nums">
                  #{country.bpRank}
                </span>
              </div>
            )}

            {/* Alliance / Region */}
            {country.alliance && (
              <div className="text-[10px] text-tactical-accent/60 tracking-wider uppercase mt-1">
                {country.alliance} · {country.region}
              </div>
            )}

            {/* Details link */}
            <button
              onClick={handleDetailsClick}
              className="mt-2 text-[10px] tracking-widest uppercase text-tactical-primary/80 hover:text-tactical-primary transition-colors cursor-pointer"
            >
              ▸ Details
            </button>
          </motion.div>
        </Popup>
      )}
    </AnimatePresence>
  );
}

export default CountryPopup;
