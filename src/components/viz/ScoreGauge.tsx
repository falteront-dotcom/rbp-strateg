"use client";

import { useId } from "react";
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
  const id = useId().replace(/:/g, "");
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius; // half circle
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const color = colorScale(score);
  const dashOffset = circumference * (1 - progress);
  const height = size / 2 + 16;
  const y = size / 2 + 4;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center"
    >
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-gauge`} x1="4" y1={y} x2={size - 4} y2={y} gradientUnits="userSpaceOnUse">
            <stop stopColor={color} stopOpacity="0.35" />
            <stop offset="0.5" stopColor={color} stopOpacity="1" />
            <stop offset="1" stopColor={color} stopOpacity="0.75" />
          </linearGradient>
          <radialGradient id={`${id}-halo`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${size / 2} ${y}) rotate(90) scale(${size / 2} ${size / 3})`}>
            <stop stopColor={color} stopOpacity="0.22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-glow`} x="-40%" y="-80%" width="180%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx={size / 2} cy={y} rx={size * 0.45} ry={size * 0.2} fill={`url(#${id}-halo)`} />
        {/* Background arc */}
        <path
          d={`M 4 ${y} A ${radius} ${radius} 0 0 1 ${size - 4} ${y}`}
          fill="none"
          stroke="#0f172a"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path
          d={`M 4 ${y} A ${radius} ${radius} 0 0 1 ${size - 4} ${y}`}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray="2 5"
        />
        {/* Progress arc */}
        <motion.path
          d={`M 4 ${y} A ${radius} ${radius} 0 0 1 ${size - 4} ${y}`}
          fill="none"
          stroke={`url(#${id}-gauge)`}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          filter={`url(#${id}-glow)`}
        />
        {/* Fine ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const angle = Math.PI * (1 - tick);
          const r1 = radius - 3;
          const r2 = radius + 3;
          const x1 = size / 2 + Math.cos(angle) * r1;
          const yy1 = y - Math.sin(angle) * r1;
          const x2 = size / 2 + Math.cos(angle) * r2;
          const yy2 = y - Math.sin(angle) * r2;
          return <line key={tick} x1={x1} y1={yy1} x2={x2} y2={yy2} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />;
        })}
        {/* Score text */}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.21}
          fontWeight="900"
          fontFamily="monospace"
          style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
        >
          {score.toFixed(0)}
        </text>
        {/* Tier label */}
        <text
          x={size / 2}
          y={size / 2 + 10}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={size * 0.09}
          fontFamily="monospace"
          letterSpacing="0.12em"
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
