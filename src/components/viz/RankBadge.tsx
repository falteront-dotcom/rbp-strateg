"use client";

import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RankBadgeProps {
  rank: number;
  size?: "sm" | "md" | "lg";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getRankStyle(rank: number): { color: string; bg: string; stars: number; chevrons: number } {
  if (rank <= 3) return { color: "#fbbf24", bg: "#fbbf2420", stars: 5 - Math.floor((rank - 1) / 1), chevrons: 0 };
  if (rank <= 10) return { color: "#94a3b8", bg: "#94a3b820", stars: 4, chevrons: 0 };
  if (rank <= 25) return { color: "#b45309", bg: "#b4530920", stars: 3, chevrons: 0 };
  if (rank <= 50) return { color: "#64748b", bg: "#64748b20", stars: 2, chevrons: 1 };
  return { color: "#475569", bg: "#47556920", stars: 1, chevrons: 2 };
}

const SIZES = {
  sm: { badge: "w-6 h-6 text-[9px]", stars: "text-[7px]" },
  md: { badge: "w-8 h-8 text-[10px]", stars: "text-[8px]" },
  lg: { badge: "w-10 h-10 text-xs", stars: "text-[9px]" },
};

// ─── Component ───────────────────────────────────────────────────────────────
export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const style = getRankStyle(rank);
  const sizeConfig = SIZES[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`${sizeConfig.badge} rounded-full flex flex-col items-center justify-center border font-mono font-bold`}
      style={{ borderColor: style.color, backgroundColor: style.bg, color: style.color }}
    >
      <span>{rank}</span>
      <span className={`${sizeConfig.stars} leading-none`}>
        {"★".repeat(Math.min(5, style.stars))}
      </span>
    </motion.div>
  );
}
