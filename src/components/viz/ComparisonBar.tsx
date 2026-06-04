"use client";

import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ComparisonBarProps {
  leftValue: number;
  rightValue: number;
  leftLabel: string;
  rightLabel: string;
  maxValue?: number;
  leftColor?: string;
  rightColor?: string;
  label?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ComparisonBar({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  maxValue,
  leftColor = "#22d3ee",
  rightColor = "#ef4444",
  label,
}: ComparisonBarProps) {
  const max = maxValue ?? Math.max(leftValue, rightValue, 1);
  const leftPct = Math.min(100, (leftValue / max) * 100);
  const rightPct = Math.min(100, (rightValue / max) * 100);
  const delta = leftValue - rightValue;
  const deltaPct = rightValue > 0 ? ((delta / rightValue) * 100).toFixed(1) : "∞";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      {label && (
        <div className="text-[9px] text-slate-500 tracking-wider uppercase">{label}</div>
      )}
      <div className="flex items-center gap-1">
        {/* Left bar (grows right to left from center) */}
        <div className="flex-1 flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${leftPct}%` }}
            transition={{ duration: 0.6 }}
            className="h-2 rounded-l-full"
            style={{ backgroundColor: leftColor }}
          />
        </div>
        {/* Center delta */}
        <div className="w-12 text-center flex-shrink-0">
          <span className={`text-[9px] font-bold ${delta > 0 ? "text-cyan-400" : delta < 0 ? "text-red-400" : "text-slate-400"}`}>
            {delta > 0 ? "+" : ""}{deltaPct}%
          </span>
        </div>
        {/* Right bar (grows left to right from center) */}
        <div className="flex-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rightPct}%` }}
            transition={{ duration: 0.6 }}
            className="h-2 rounded-r-full"
            style={{ backgroundColor: rightColor }}
          />
        </div>
      </div>
      <div className="flex justify-between text-[9px]">
        <span style={{ color: leftColor }}>{leftLabel}: {leftValue.toFixed(1)}</span>
        <span style={{ color: rightColor }}>{rightLabel}: {rightValue.toFixed(1)}</span>
      </div>
    </motion.div>
  );
}
