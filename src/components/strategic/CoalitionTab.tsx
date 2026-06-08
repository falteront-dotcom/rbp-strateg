"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Cell,
} from "recharts";
import {
  Swords,
  Shield,
  Users,
  Fuel,
  Radio,
  Landmark,
  BookOpen,
  AlertCircle,
  Mountain,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Plane,
  Ship,
  Crosshair,
} from "lucide-react";
import type { Country } from "@/db/schema";
import {
  COALITION_REGISTRY,
  COALITION_NAMES,
  COALITION_LABELS_RU,
  BP_LABELS_RU,
  getCountryCoalition,
  getCoalitionMembers,
  getCoalitionAggregateBP,
  getCoalitionComparison,
  simulateCoalitionSwitch,
  isoToFlag,
  formatLargeNumber,
  getBPTierLabel,
  getRankBadge,
  type AggregateBP,
  type SwitchScenario,
} from "@/lib/coalition-analysis";
import {
  COALITION_BP_COMPONENTS,
  type CoalitionBPComponent,
} from "@/lib/coalitions";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CoalitionTabProps {
  country: Country;
  allCountries: Country[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon map for BP components
// ─────────────────────────────────────────────────────────────────────────────

const BP_ICONS: Record<CoalitionBPComponent, React.ReactNode> = {
  bpWeapon: <Shield size={11} />,
  bpManpower: <Users size={11} />,
  bpLogistics: <Fuel size={11} />,
  bpC2: <Radio size={11} />,
  bpEconomy: <Landmark size={11} />,
  bpDoctrine: <BookOpen size={11} />,
  bpReadiness: <AlertCircle size={11} />,
  bpTerrain: <Mountain size={11} />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom Recharts tooltip
// ─────────────────────────────────────────────────────────────────────────────

function HudTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel px-3 py-2 rounded-md text-[10px] font-mono border border-white/10">
      <div className="text-tactical-primary font-bold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span className="text-white/60">{p.dataKey}</span>
          <span className="text-tactical-primary font-bold">
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper component
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-panel rounded-lg overflow-hidden border border-white/5"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          <span className="text-tactical-accent">{icon}</span>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase text-tactical-primary">
            {title}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function CoalitionTab({ country, allCountries }: CoalitionTabProps) {
  // ─── Derived state ────────────────────────────────────────────────────
  const currentCoalition = useMemo(
    () => getCountryCoalition(country.isoCode, country.side),
    [country.isoCode, country.side],
  );

  const members = useMemo(
    () => getCoalitionMembers(currentCoalition.name, allCountries),
    [currentCoalition.name, allCountries],
  );

  const aggregate = useMemo(
    () => {
      const agg = getCoalitionAggregateBP(members);
      agg.coalitionName = currentCoalition.name;
      return agg;
    },
    [members, currentCoalition.name],
  );

  const comparison = useMemo(
    () => getCoalitionComparison([...COALITION_NAMES], allCountries),
    [allCountries],
  );

  // ─── Radar overlay: selected 2 coalitions ────────────────────────────
  const [radarCoalitionA, setRadarCoalitionA] = useState<string>("NATO");
  const [radarCoalitionB, setRadarCoalitionB] = useState<string>("CSTO");

  const radarData = useMemo(() => {
    const aggA = comparison.aggregates.find((a) => a.coalitionName === radarCoalitionA);
    const aggB = comparison.aggregates.find((a) => a.coalitionName === radarCoalitionB);
    if (!aggA || !aggB) return [];

    return COALITION_BP_COMPONENTS.map((comp) => {
      const key = comp as keyof AggregateBP;
      const valA = (aggA[key] as number) / Math.max(aggA.memberCount, 1);
      const valB = (aggB[key] as number) / Math.max(aggB.memberCount, 1);
      return {
        component: BP_LABELS_RU[comp],
        [radarCoalitionA]: Number(valA.toFixed(1)),
        [radarCoalitionB]: Number(valB.toFixed(1)),
      };
    });
  }, [comparison, radarCoalitionA, radarCoalitionB]);

  // ─── What-if scenario ─────────────────────────────────────────────────
  const [targetCoalition, setTargetCoalition] = useState<string>("CSTO");
  const scenario = useMemo(
    () => simulateCoalitionSwitch(country.isoCode, targetCoalition, allCountries),
    [country.isoCode, targetCoalition, allCountries],
  );

  // ─── Comparison bar chart data ────────────────────────────────────────
  const barData = useMemo(
    () => comparison.aggregates.map((agg) => ({
      name: COALITION_LABELS_RU[agg.coalitionName] ?? agg.coalitionName,
      totalBP: agg.totalBP,
      coalitionName: agg.coalitionName,
    })),
    [comparison],
  );

  // ─── Military balance stacked chart data ─────────────────────────────
  const militaryData = useMemo(
    () => comparison.militaryBalance.map((mb) => ({
      name: COALITION_LABELS_RU[mb.coalitionName] ?? mb.coalitionName,
      Танки: mb.totalTanks,
      Авиация: mb.totalAircraft,
      Флот: mb.totalNavy,
      coalitionName: mb.coalitionName,
    })),
    [comparison],
  );

  // ─── Coalition colors for chart cells ─────────────────────────────────
  const getHex = useCallback((name: string): string => {
    const info = COALITION_REGISTRY.get(name);
    return info?.colorHex ?? "#22d3ee";
  }, []);

  const getLabel = useCallback((name: string): string => {
    return COALITION_LABELS_RU[name] ?? name;
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 font-mono h-full overflow-y-auto pr-1">

      {/* ═══ 1. Current Coalition Badge ═════════════════════════════════ */}
      <Section title="Текущая Коалиция" icon={<Swords size={14} />}>
        <div className="flex items-center gap-4">
          <div
            className={`px-4 py-3 rounded-lg border ${currentCoalition.bgClass} flex items-center gap-3`}
          >
            <span className="text-2xl leading-none">
              {isoToFlag(country.isoCode)}
            </span>
            <div>
              <div
                className={`text-lg font-black tracking-[0.15em] uppercase ${currentCoalition.textClass}`}
                style={{ textShadow: `0 0 16px ${currentCoalition.colorHex}` }}
              >
                {getLabel(currentCoalition.name)}
              </div>
              <div className="text-[9px] text-white/40 tracking-widest uppercase mt-0.5">
                Сторона: {country.side}
              </div>
            </div>
          </div>

          <div className="flex-1 glass-panel rounded-lg p-3 border border-white/5">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-[8px] text-tactical-secondary/50 tracking-widest uppercase">
                  Участников
                </div>
                <div className="text-xl font-black text-tactical-primary tabular-nums">
                  {members.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8px] text-tactical-secondary/50 tracking-widest uppercase">
                  Суммарный БП
                </div>
                <div className="text-xl font-black text-tactical-primary tabular-nums">
                  {aggregate.totalBP.toFixed(0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[8px] text-tactical-secondary/50 tracking-widest uppercase">
                  Средний БП
                </div>
                <div className="text-xl font-black text-tactical-primary tabular-nums">
                  {members.length > 0 ? (aggregate.totalBP / members.length).toFixed(1) : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══ 2. Coalition Members List ══════════════════════════════════ */}
      <Section title={`Участники ${getLabel(currentCoalition.name)} (${members.length})`} icon={<Users size={14} />}>
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {members.map((m, idx) => {
            const isCurrent = m.isoCode === country.isoCode;
            const rank = idx + 1;
            return (
              <motion.div
                key={m.isoCode}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
                  isCurrent
                    ? `${currentCoalition.bgClass} ${currentCoalition.textClass}`
                    : "bg-white/5 border-white/5 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tabular-nums w-6 text-center">
                    {getRankBadge(rank)}
                  </span>
                  <span className="text-base leading-none">{isoToFlag(m.isoCode)}</span>
                  <span className="text-[11px] font-bold truncate max-w-[140px]">
                    {m.nameRu}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-white/30 tracking-wider uppercase">
                    {m.side}
                  </span>
                  <span className="text-[11px] text-tactical-primary font-black tabular-nums">
                    {(m.bpTotal ?? 0).toFixed(1)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* ═══ 3. Coalition Aggregate BP ══════════════════════════════════ */}
      <Section title={`Суммарный БП — ${getLabel(currentCoalition.name)}`} icon={<Shield size={14} />}>
        <div className="space-y-2">
          {/* Total */}
          <div className="flex items-center justify-between bg-white/[0.03] px-4 py-3 rounded-lg border border-white/5">
            <span className="text-[10px] font-bold tracking-widest uppercase text-tactical-primary">
              Итого
            </span>
            <span
              className={`text-2xl font-black tabular-nums ${currentCoalition.textClass}`}
              style={{ textShadow: `0 0 20px ${currentCoalition.colorHex}` }}
            >
              {aggregate.totalBP.toFixed(1)}
            </span>
          </div>

          {/* Component grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {COALITION_BP_COMPONENTS.map((comp) => {
              const key = comp as keyof AggregateBP;
              const val = aggregate[key] as number;
              const avgVal = members.length > 0 ? val / members.length : 0;
              return (
                <div
                  key={comp}
                  className="bg-white/5 rounded p-2 flex flex-col items-center border border-white/5"
                >
                  <span className="text-tactical-primary/50 mb-1">{BP_ICONS[comp]}</span>
                  <span className="text-[11px] font-black text-tactical-primary tabular-nums">
                    {val.toFixed(1)}
                  </span>
                  <span className="text-[7px] text-tactical-secondary/40 tracking-wider uppercase truncate w-full text-center">
                    {BP_LABELS_RU[comp]}
                  </span>
                  <span className="text-[7px] text-white/20 tabular-nums">
                    avg {avgVal.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ═══ 4. Coalition vs Coalition Comparison Bar Chart ════════════ */}
      <Section title="Сравнение Коалиций" icon={<Swords size={14} />}>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "oklch(75% 0.18 200 / 60%)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(75% 0.18 200 / 40%)", fontSize: 8, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<HudTooltip />} />
              <Bar dataKey="totalBP" radius={[4, 4, 0, 0]} barSize={32}>
                {barData.map((entry) => (
                  <Cell
                    key={entry.coalitionName}
                    fill={getHex(entry.coalitionName)}
                    fillOpacity={0.7}
                    stroke={getHex(entry.coalitionName)}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          {COALITION_NAMES.map((name) => {
            const info = COALITION_REGISTRY.get(name);
            if (!info) return null;
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: info.colorHex }}
                />
                <span className="text-[8px] text-white/50 font-bold tracking-wider uppercase">
                  {getLabel(name)}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ 5. Component Breakdown Radar Overlay ═══════════════════════ */}
      <Section title="Радар Компонентов" icon={<Crosshair size={14} />}>
        <div className="flex items-center gap-3 mb-3">
          <select
            value={radarCoalitionA}
            onChange={(e) => setRadarCoalitionA(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-[10px] p-1.5 rounded-md outline-none text-white font-bold focus:border-tactical-primary/50"
          >
            {COALITION_NAMES.map((name) => (
              <option key={name} value={name}>{getLabel(name)}</option>
            ))}
          </select>
          <span className="text-[9px] text-tactical-accent font-bold tracking-widest">VS</span>
          <select
            value={radarCoalitionB}
            onChange={(e) => setRadarCoalitionB(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-[10px] p-1.5 rounded-md outline-none text-white font-bold focus:border-tactical-primary/50"
          >
            {COALITION_NAMES.map((name) => (
              <option key={name} value={name}>{getLabel(name)}</option>
            ))}
          </select>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
              <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
              <PolarAngleAxis
                dataKey="component"
                tick={{
                  fill: "oklch(75% 0.18 200 / 60%)",
                  fontSize: 8,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <PolarRadiusAxis angle={90} domain={[0, "auto"]} tick={false} axisLine={false} />
              <Radar
                name={getLabel(radarCoalitionA)}
                dataKey={radarCoalitionA}
                stroke={getHex(radarCoalitionA)}
                fill={getHex(radarCoalitionA)}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name={getLabel(radarCoalitionB)}
                dataKey={radarCoalitionB}
                stroke={getHex(radarCoalitionB)}
                fill={getHex(radarCoalitionB)}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend
                wrapperStyle={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                formatter={(value: string) => (
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>{value}</span>
                )}
              />
              <Tooltip content={<HudTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ═══ 6. Military Balance Stacked Bar Chart ═══════════════════════ */}
      <Section title="Военный Баланс" icon={<Ship size={14} />}>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={militaryData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "oklch(75% 0.18 200 / 60%)", fontSize: 9, fontFamily: "var(--font-mono)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "oklch(75% 0.18 200 / 40%)", fontSize: 8, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<HudTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                formatter={(value: string) => (
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>{value}</span>
                )}
              />
              <Bar dataKey="Танки" stackId="a" fill="#ef4444" fillOpacity={0.7} radius={[0, 0, 0, 0]} barSize={28} />
              <Bar dataKey="Авиация" stackId="a" fill="#3b82f6" fillOpacity={0.7} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Флот" stackId="a" fill="#2dd4bf" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-coalition detail cards */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {comparison.militaryBalance.slice(0, 6).map((mb) => {
            const info = COALITION_REGISTRY.get(mb.coalitionName);
            return (
              <div
                key={mb.coalitionName}
                className={`p-2 rounded-md border ${info?.bgClass ?? "bg-white/5 border-white/5"}`}
              >
                <div className={`text-[9px] font-black tracking-widest uppercase mb-1.5 ${info?.textClass ?? "text-white/60"}`}>
                  {getLabel(mb.coalitionName)}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="flex flex-col items-center">
                    <Crosshair size={8} className="text-red-400/60 mb-0.5" />
                    <span className="text-[8px] font-bold text-red-400 tabular-nums">
                      {formatLargeNumber(mb.totalTanks)}
                    </span>
                    <span className="text-[6px] text-white/20 uppercase">Танки</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Plane size={8} className="text-blue-400/60 mb-0.5" />
                    <span className="text-[8px] font-bold text-blue-400 tabular-nums">
                      {formatLargeNumber(mb.totalAircraft)}
                    </span>
                    <span className="text-[6px] text-white/20 uppercase">Авиация</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Ship size={8} className="text-teal-400/60 mb-0.5" />
                    <span className="text-[8px] font-bold text-teal-400 tabular-nums">
                      {formatLargeNumber(mb.totalNavy)}
                    </span>
                    <span className="text-[6px] text-white/20 uppercase">Флот</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══ 7. What-If Scenario ════════════════════════════════════════ */}
      <Section title="Сценарий Перехода" icon={<ArrowRightLeft size={14} />} defaultOpen={false}>
        <div className="space-y-4">
          {/* Target selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
              Страна:
            </span>
            <span className="text-sm leading-none">{isoToFlag(country.isoCode)}</span>
            <span className="text-[10px] font-bold text-white/80">{country.nameRu}</span>
            <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase ml-2">
              → В коалицию:
            </span>
            <select
              value={targetCoalition}
              onChange={(e) => setTargetCoalition(e.target.value)}
              className="bg-slate-950/80 border border-white/10 text-[10px] p-1.5 rounded-md outline-none text-white font-bold focus:border-tactical-primary/50"
            >
              {COALITION_NAMES
                .filter((n) => n !== currentCoalition.name)
                .map((name) => (
                  <option key={name} value={name}>{getLabel(name)}</option>
                ))}
            </select>
          </div>

          {scenario && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Current coalition impact */}
              <div className={`p-3 rounded-lg border ${currentCoalition.bgClass}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black tracking-widest uppercase ${currentCoalition.textClass}`}>
                    {getLabel(scenario.currentCoalition)}
                  </span>
                  <span className="text-[8px] text-white/30">без {country.nameRu}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-tactical-primary tabular-nums">
                    {scenario.currentWithout.totalBP.toFixed(1)}
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums ${
                    scenario.currentDelta < 0 ? "text-red-400" : "text-white/30"
                  }`}>
                    {scenario.currentDelta < 0 ? "" : "+"}
                    {scenario.currentDelta.toFixed(1)}
                  </span>
                </div>
                <div className="text-[7px] text-white/20 tracking-wider uppercase mt-1">
                  {scenario.currentWithout.memberCount} участников
                </div>
              </div>

              {/* Target coalition impact */}
              <div className="p-3 rounded-lg border border-tactical-accent/20 bg-tactical-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black tracking-widest uppercase text-tactical-accent">
                    {getLabel(scenario.targetCoalition)}
                  </span>
                  <span className="text-[8px] text-white/30">+ {country.nameRu}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-tactical-primary tabular-nums">
                    {scenario.targetWith.totalBP.toFixed(1)}
                  </span>
                  <span className={`text-[10px] font-bold tabular-nums ${
                    scenario.targetDelta > 0 ? "text-green-400" : "text-white/30"
                  }`}>
                    +{scenario.targetDelta.toFixed(1)}
                  </span>
                </div>
                <div className="text-[7px] text-white/20 tracking-wider uppercase mt-1">
                  {scenario.targetWith.memberCount} участников
                </div>
              </div>
            </div>
          )}

          {/* Component-by-component impact table */}
          {scenario && (
            <div className="mt-2">
              <div className="text-[8px] text-tactical-secondary/50 tracking-widest uppercase mb-2">
                Изменение по Компонентам
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {COALITION_BP_COMPONENTS.map((comp) => {
                  const key = comp as keyof AggregateBP;
                  const countryVal = country[key as keyof Country] as number ?? 0;
                  const isPositiveForTarget = countryVal > 0;
                  return (
                    <div
                      key={comp}
                      className="bg-white/5 rounded p-2 flex flex-col items-center border border-white/5"
                    >
                      <span className="text-tactical-primary/50 mb-0.5">{BP_ICONS[comp]}</span>
                      <span className={`text-[10px] font-bold tabular-nums ${
                        isPositiveForTarget ? "text-green-400" : "text-white/30"
                      }`}>
                        +{countryVal.toFixed(1)}
                      </span>
                      <span className="text-[6px] text-tactical-secondary/40 tracking-wider uppercase truncate w-full text-center">
                        {BP_LABELS_RU[comp]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary verdict */}
          {scenario && (
            <div className="glass-panel rounded-lg p-3 border border-tactical-accent/20 text-center">
              <div className="text-[9px] text-tactical-secondary/50 tracking-widest uppercase mb-1">
                Вывод
              </div>
              <div className="text-[11px] font-bold text-tactical-primary">
                Переход {country.nameRu} из {getLabel(scenario.currentCoalition)} в{" "}
                {getLabel(scenario.targetCoalition)}:
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div>
                  <span className={`text-[9px] font-bold ${currentCoalition.textClass}`}>
                    {getLabel(scenario.currentCoalition)}
                  </span>
                  <span className="text-[10px] text-red-400 font-bold tabular-nums ml-1">
                    {scenario.currentDelta.toFixed(1)}
                  </span>
                </div>
                <ArrowRightLeft size={12} className="text-tactical-accent" />
                <div>
                  <span className="text-[9px] font-bold text-tactical-accent">
                    {getLabel(scenario.targetCoalition)}
                  </span>
                  <span className="text-[10px] text-green-400 font-bold tabular-nums ml-1">
                    +{scenario.targetDelta.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

export default CoalitionTab;
