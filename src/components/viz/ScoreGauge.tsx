"use client";

import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
  colorScale?: (score: number) => string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function defaultColorScale(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#22d3ee";
  if (score >= 20) return "#3b82f6";
  return "#64748b";
}

function getTier(score: number): string {
  if (score >= 80) return "КРИТ";
  if (score >= 60) return "ВЫС";
  if (score >= 40) return "СРЕД";
  if (score >= 20) return "НИЗ";
  return "МИН";
}

// ─── Component ───────────────────────────────────────────────────────────────
export function ScoreGauge({
  score,
  label,
  size = 80,
  colorScale = defaultColorScale,
}: ScoreGaugeProps) {
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius; // half circle
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const color = colorScale(score);
  const dashOffset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        {/* Background arc */}
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <motion.path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.2}
          fontWeight="bold"
          fontFamily="monospace"
        >
          {score.toFixed(0)}
        </text>
        {/* Tier label */}
        <text
          x={size / 2}
          y={size / 2 + 10}
          textAnchor="middle"
          fill="#64748b"
          fontSize={size * 0.09}
          fontFamily="monospace"
        >
          {getTier(score)}
        </text>
      </svg>
      {label && (
        <span className="text-[9px] text-slate-500 mt-0.5 tracking-wider">{label}</span>
      )}
    </motion.div>
  );
}
