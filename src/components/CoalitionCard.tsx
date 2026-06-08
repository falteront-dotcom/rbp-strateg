"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from "recharts";
import { Shield, Users, Fuel, Radio, Landmark, BookOpen, AlertCircle, Mountain, Swords } from "lucide-react";
import {
  COALITION_BP_COMPONENTS,
  COALITION_BP_LABELS,
  COALITION_TEXT_CLASSES,
  COALITION_BG_CLASSES,
  isoToFlag,
  type CoalitionBP,
  type CoalitionComparison,
  type CoalitionBPComponent,
} from "@/lib/coalitions";

/** BP component icons matching CountryCard */
const BP_ICONS: Record<CoalitionBPComponent, React.ReactNode> = {
  bpWeapon: <Shield size={12} />,
  bpManpower: <Users size={12} />,
  bpLogistics: <Fuel size={12} />,
  bpC2: <Radio size={12} />,
  bpEconomy: <Landmark size={12} />,
  bpDoctrine: <BookOpen size={12} />,
  bpReadiness: <AlertCircle size={12} />,
  bpTerrain: <Mountain size={12} />,
};

/** Props for standalone coalition card (no comparison) */
interface CoalitionCardProps {
  coalition: CoalitionBP;
  /** Optional comparison data to render side-by-side bars */
  comparison?: CoalitionComparison;
  /** Which side of the comparison this card represents: "A" or "B" */
  side?: "A" | "B";
}

/** Custom tooltip for Recharts */
function CoalitionTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-3 py-2 rounded-md text-[10px] font-mono">
      <div className="text-tactical-primary font-bold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-white/60">{p.dataKey}</span>
          <span className="text-tactical-primary font-bold">{(p.value as number).toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export function CoalitionCard({ coalition, comparison, side }: CoalitionCardProps) {
  const textClass = COALITION_TEXT_CLASSES[coalition.name] ?? "text-tactical-primary";
  const bgClass = COALITION_BG_CLASSES[coalition.name] ?? "bg-tactical-primary/10 border-tactical-primary/30";

  /** Radar chart data from 8 BP components */
  const radarData = useMemo(
    () =>
      COALITION_BP_COMPONENTS.map((comp) => ({
        component: COALITION_BP_LABELS[comp],
        value: coalition.componentScores[comp],
        fullMark: 100,
      })),
    [coalition],
  );

  /** Comparison bar data — pairs of A/B values per component */
  const comparisonBarData = useMemo(() => {
    if (!comparison) return [];
    return COALITION_BP_COMPONENTS.map((comp) => ({
      label: COALITION_BP_LABELS[comp],
      A: comparison.coalitionA.componentScores[comp],
      B: comparison.coalitionB.componentScores[comp],
    }));
  }, [comparison]);

  /** Flags row (max 8 visible, then +N) */
  const visibleFlags = coalition.members.slice(0, 8);
  const extraCount = coalition.members.length - visibleFlags.length;

  /** Overall advantage indicator */
  const advantageLabel = useMemo(() => {
    if (!comparison) return null;
    if (side === "A") {
      return comparison.overallAdvantage === "A"
        ? "ПРЕИМУЩЕСТВО"
        : comparison.overallAdvantage === "B"
          ? "УСТУПАЕТ"
          : "ПАРИТЕТ";
    }
    if (side === "B") {
      return comparison.overallAdvantage === "B"
        ? "ПРЕИМУЩЕСТВО"
        : comparison.overallAdvantage === "A"
          ? "УСТУПАЕТ"
          : "ПАРИТЕТ";
    }
    return null;
  }, [comparison, side]);

  const advantageColor = advantageLabel === "ПРЕИМУЩЕСТВО"
    ? "text-green-400"
    : advantageLabel === "УСТУПАЕТ"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-lg overflow-hidden flex flex-col h-full font-mono"
    >
      {/* ─── Header: Coalition name + flags ─── */}
      <div className={`p-4 border-b border-white/5 ${bgClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={16} className={textClass} />
            <h3 className={`text-sm font-black tracking-widest uppercase ${textClass}`}>
              {coalition.name}
            </h3>
          </div>
          {advantageLabel && (
            <span className={`text-[9px] font-bold tracking-widest ${advantageColor}`}>
              {advantageLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {visibleFlags.map((m) => (
            <span key={m.isoCode} className="text-lg leading-none" title={m.nameRu}>
              {isoToFlag(m.isoCode)}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-[10px] text-tactical-secondary/60 font-bold ml-1">
              +{extraCount}
            </span>
          )}
        </div>
      </div>

      {/* ─── Total BP Score ─── */}
      <div className="p-4 border-b border-white/5">
        <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-1">
          Суммарный БП
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-black tabular-nums ${textClass}`}
            style={{ textShadow: "0 0 16px currentColor" }}
          >
            {coalition.totalBP.toFixed(1)}
          </span>
          <span className="text-[10px] text-tactical-secondary/50 tracking-wider">
            {coalition.memberCount} участников
          </span>
        </div>
        {/* BP bar */}
        <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 via-yellow-400 to-red-400 transition-all duration-700"
            style={{ width: `${Math.min(coalition.totalBP / coalition.memberCount, 100)}%` }}
          />
        </div>
        <div className="text-[8px] text-tactical-secondary/40 mt-1 tracking-wider">
          Средний БП: {(coalition.totalBP / Math.max(coalition.memberCount, 1)).toFixed(1)}
        </div>
      </div>

      {/* ─── Radar Chart ─── */}
      <div className="p-4 border-b border-white/5">
        <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
          Профиль Компонентов
        </div>
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
              <PolarGrid stroke="oklch(100% 0 0 / 8%)" strokeDasharray="2 4" />
              <PolarAngleAxis
                dataKey="component"
                tick={{
                  fill: "oklch(75% 0.18 200 / 70%)",
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="БП"
                dataKey="value"
                stroke="oklch(75% 0.18 200)"
                fill="oklch(75% 0.18 200 / 20%)"
                strokeWidth={1.5}
                dot={{ r: 2, fill: "oklch(75% 0.18 200)" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Component Scores Mini Grid ─── */}
      <div className="p-3 border-b border-white/5">
        <div className="grid grid-cols-4 gap-1.5">
          {COALITION_BP_COMPONENTS.map((comp) => {
            const val = coalition.componentScores[comp];
            const delta = comparison
              ? side === "A"
                ? comparison.componentDeltas.find((d) => d.component === comp)
                : comparison.componentDeltas.find((d) => d.component === comp)
              : null;
            const advantage = delta?.advantage;
            const isWinning = side === "A" ? advantage === "A" : advantage === "B";
            const isLosing = side === "A" ? advantage === "B" : advantage === "A";
            return (
              <div
                key={comp}
                className={`bg-white/5 rounded p-1.5 flex flex-col items-center border transition-colors ${
                  isWinning
                    ? "border-green-500/30 bg-green-500/5"
                    : isLosing
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-white/5"
                }`}
              >
                <span className="text-tactical-primary/50 mb-0.5">{BP_ICONS[comp]}</span>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    val >= 80
                      ? "text-red-400"
                      : val >= 60
                        ? "text-yellow-400"
                        : val >= 40
                          ? "text-teal-400"
                          : "text-slate-400"
                  }`}
                >
                  {val.toFixed(1)}
                </span>
                <span className="text-[7px] text-tactical-secondary/40 tracking-wider uppercase truncate w-full text-center">
                  {COALITION_BP_LABELS[comp]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Comparison Bars (if comparison data provided) ─── */}
      {comparison && comparisonBarData.length > 0 && (
        <div className="p-4 border-b border-white/5">
          <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
            Сравнение Компонентов
          </div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <BarChart data={comparisonBarData} layout="vertical" margin={{ left: 4, right: 4, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: "oklch(75% 0.18 200 / 60%)", fontSize: 7, fontFamily: "var(--font-mono)" }}
                  axisLine={false}
                  width={72}
                />
                <Tooltip content={<CoalitionTooltip />} />
                <Bar dataKey="A" fill="oklch(70% 0.18 240 / 60%)" radius={[2, 2, 0, 0]} barSize={6} />
                <Bar dataKey="B" fill="oklch(65% 0.25 25 / 60%)" radius={[2, 2, 0, 0]} barSize={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-bold text-tactical-nato tracking-wider uppercase">
              {comparison.coalitionA.name}
            </span>
            <span className="text-[8px] font-bold text-tactical-rus tracking-wider uppercase">
              {comparison.coalitionB.name}
            </span>
          </div>
        </div>
      )}

      {/* ─── Member List ─── */}
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
          Участники ({coalition.memberCount})
        </div>
        <div className="space-y-1">
          {coalition.members.map((m) => (
            <div
              key={m.isoCode}
              className="flex items-center justify-between bg-white/5 px-2 py-1.5 rounded border border-white/5 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">{isoToFlag(m.isoCode)}</span>
                <span className="text-[10px] text-white/80 font-bold truncate">
                  {m.nameRu}
                </span>
              </div>
              <span className="text-[10px] text-tactical-primary font-bold tabular-nums">
                {m.bpTotal.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default CoalitionCard;
