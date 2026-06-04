"use client";

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
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((val, idx) => {
      const x = idx * stepX;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <motion.svg
      width={width}
      height={height}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-block"
    >
      {/* Fill area */}
      <motion.polygon
        points={fillPoints}
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
      />
      {/* Line */}
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
      {/* Dots */}
      {showDots &&
        data.map((val, idx) => {
          const x = idx * stepX;
          const y = height - ((val - min) / range) * (height - 4) - 2;
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={1.5}
              fill={color}
              className="opacity-0"
            />
          );
        })}
    </motion.svg>
  );
}
