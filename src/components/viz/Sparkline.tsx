"use client";

import { useId } from "react";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#22d3ee",
  showDots = false,
}: SparklineProps) {
  const id = useId().replace(/:/g, "");
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const coords = data.map((val, idx) => {
    const x = idx * stepX;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  const points = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-block overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} stopOpacity="0.35" />
          <stop offset="0.5" stopColor={color} stopOpacity="1" />
          <stop offset="1" stopColor={color} stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          <stop stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-spark-glow`} x="-20%" y="-80%" width="140%" height="260%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={`M 0 ${height - 1} H ${width}`} stroke="rgba(148,163,184,0.14)" strokeWidth="1" strokeDasharray="2 4" />
      {/* Fill area */}
      <motion.polygon
        points={fillPoints}
        fill={`url(#${id}-fill)`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      {/* Line */}
      <motion.polyline
        points={points}
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
        filter={`url(#${id}-spark-glow)`}
      />
      {/* Terminal accent */}
      <circle cx={coords.at(-1)?.x ?? width} cy={coords.at(-1)?.y ?? height / 2} r="2" fill={color} opacity="0.9" />
      {/* Dots */}
      {showDots &&
        coords.map(({ x, y }, idx) => (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={1.5}
            fill={color}
            opacity={idx === coords.length - 1 ? 1 : 0.45}
          />
        ))}
    </motion.svg>
  );
}
