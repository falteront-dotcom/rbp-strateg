"use client";

import { useMemo } from "react";import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrendPoint {
  year: number;
  bp?: number;
  [key: string]: number | undefined;
}

interface ForecastPoint {
  year: number;
  forecast: number;
  upper: number;
  lower: number;
}

interface TrendChartProps {
  historical: TrendPoint[];
  forecast?: ForecastPoint[];
  label?: string;
  dataKey?: string;
  color?: string;
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TrendChart({
  historical,
  forecast = [],
  label = "БП",
  dataKey = "bp",
  color = "#22d3ee",
  height = 200,
}: TrendChartProps) {
  const combinedData = useMemo(() => {
    return [
      ...historical.map((h) => ({
        year: h.year,
        [dataKey]: h[dataKey],
        forecast: undefined as number | undefined,
        upper: undefined as number | undefined,
        lower: undefined as number | undefined,
      })),
      ...forecast.map((f) => ({
        year: f.year,
        [dataKey]: undefined as number | undefined,
        forecast: f.forecast,
        upper: f.upper,
        lower: f.lower,
      })),
    ];
  }, [historical, forecast, dataKey]);

  const forecastStart = forecast.length > 0 ? forecast[0].year : undefined;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {label && (
        <h3 className="text-[10px] font-bold text-tactical-primary tracking-widest uppercase mb-1">
          {label}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={1}>
        <AreaChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0e1520ee",
              border: "1px solid #22d3ee40",
              borderRadius: 8,
              fontSize: 10,
              fontFamily: "monospace",
            }}
          />
          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill={color}
            fillOpacity={0.08}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#0e1520"
            fillOpacity={0.5}
          />
          {/* Historical line */}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 2, fill: color }}
          />
          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#a78bfa"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
          />
          {/* Forecast start marker */}
          {forecastStart && (
            <ReferenceLine
              x={forecastStart}
              stroke="#475569"
              strokeDasharray="3 3"
              label={undefined}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-1 text-[9px]">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: color }} />
          Исторические данные
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 inline-block bg-purple-400" style={{ borderStyle: "dashed" }} />
          Прогноз
        </span>
      </div>
    </motion.div>
  );
}
