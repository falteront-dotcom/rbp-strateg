"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import type { CountryCompareData } from "@/lib/comparison";
import { isoToFlag, formatLargeNumber, getBPTierLabel, getBPTierColor } from "@/lib/comparison";

// ─── Props ──────────────────────────────────────────────────────────────────
interface AnalyticsTabProps {
  countries: CountryCompareData[];
  selectedISO: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDistribution(countries: CountryCompareData[]) {
  const bins = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "20-40", min: 20, max: 40, count: 0 },
    { range: "40-60", min: 40, max: 60, count: 0 },
    { range: "60-80", min: 60, max: 80, count: 0 },
    { range: "80-100", min: 80, max: 100, count: 0 },
  ];
  for (const c of countries) {
    const bin = bins.find((b) => c.bpTotal >= b.min && c.bpTotal < b.max);
    if (bin) bin.count++;
  }
  return bins;
}

function getTrendData(country: CountryCompareData[]): { year: number; bp: number; forecast?: number; upper?: number; lower?: number }[] {
  if (country.length === 0) return [];
  const c = country[0];
  const baseBP = c.bpTotal;
  const years = [];
  // Mock 5-year historical
  for (let y = 2020; y <= 2024; y++) {
    const variation = (Math.sin(y * 0.7) * 3) + (y - 2020) * 0.5;
    years.push({ year: y, bp: Math.max(0, baseBP - 2 + variation) });
  }
  // Mock 3-year forecast
  for (let y = 2025; y <= 2027; y++) {
    const fbp = baseBP + (y - 2024) * 0.8;
    years.push({ year: y, bp: undefined as unknown as number, forecast: fbp, upper: fbp + 3, lower: fbp - 3 });
  }
  return years;
}

function getAnomalies(countries: CountryCompareData[]) {
  // Countries where BP significantly differs from what economy alone would predict
  return countries
    .map((c) => {
      const expectedBP = (c.bpEconomy / 100) * 60 + 20; // rough estimate
      const anomaly = c.bpTotal - expectedBP;
      return { ...c, expectedBP, anomaly, type: anomaly > 10 ? "over" : anomaly < -10 ? "under" : "normal" };
    })
    .filter((c) => c.type !== "normal")
    .sort((a, b) => Math.abs(b.anomaly) - Math.abs(a.anomaly))
    .slice(0, 10);
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AnalyticsTab({ countries, selectedISO }: AnalyticsTabProps) {
  const [sortKey, setSortKey] = useState<"bpTotal" | "bpWeapon" | "bpEconomy">("bpTotal");

  const selected = useMemo(
    () => countries.find((c) => c.isoCode === selectedISO),
    [countries, selectedISO]
  );

  const rankedCountries = useMemo(
    () => [...countries].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number)).slice(0, 50),
    [countries, sortKey]
  );

  const distribution = useMemo(() => getDistribution(countries), [countries]);
  const trendData = useMemo(() => selected ? getTrendData([selected]) : [], [selected]);
  const anomalies = useMemo(() => getAnomalies(countries), [countries]);

  // Power concentration
  const concentration = useMemo(() => {
    const totalBP = countries.reduce((s, c) => s + c.bpTotal, 0);
    const sorted = [...countries].sort((a, b) => b.bpTotal - a.bpTotal);
    const top5 = sorted.slice(0, 5).reduce((s, c) => s + c.bpTotal, 0);
    const top10 = sorted.slice(0, 10).reduce((s, c) => s + c.bpTotal, 0);
    const top25 = sorted.slice(0, 25).reduce((s, c) => s + c.bpTotal, 0);
    return [
      { group: "Топ-5", pct: totalBP > 0 ? ((top5 / totalBP) * 100).toFixed(1) : "0" },
      { group: "Топ-10", pct: totalBP > 0 ? ((top10 / totalBP) * 100).toFixed(1) : "0" },
      { group: "Топ-25", pct: totalBP > 0 ? ((top25 / totalBP) * 100).toFixed(1) : "0" },
      { group: "Остальные", pct: totalBP > 0 ? (((totalBP - top25) / totalBP) * 100).toFixed(1) : "0" },
    ];
  }, [countries]);

  return (
    <div className="space-y-4 font-mono">
      {/* ─── Global Rankings ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase">
            ◈ Мировой рейтинг
          </h3>
          <div className="flex gap-1">
            {([["bpTotal", "БП"], ["bpWeapon", "Оружие"], ["bpEconomy", "Экономика"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-2 py-0.5 text-[9px] rounded border ${
                  sortKey === key
                    ? "border-tactical-primary/50 text-tactical-primary bg-tactical-primary/10"
                    : "border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
          {rankedCountries.map((c, idx) => (
            <div
              key={c.isoCode}
              className={`flex items-center justify-between py-1 px-2 rounded text-[10px] ${
                c.isoCode === selectedISO ? "bg-tactical-primary/10 border border-tactical-primary/30" : ""
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="w-5 text-right text-slate-500">{idx + 1}</span>
                <span className="text-sm">{isoToFlag(c.isoCode)}</span>
                <span className="text-slate-300 truncate">{c.nameRu}</span>
                <span className="text-[8px] text-slate-600">{c.side}</span>
              </div>
              <span className="font-bold" style={{ color: getBPTierColor(c[sortKey] as number) }}>
                {(c[sortKey] as number).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── BP Distribution ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-lg p-4">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Распределение БП
        </h3>
        <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={1}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="range" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0e1520ee",
                border: "1px solid #22d3ee40",
                borderRadius: 8,
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />
            <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]}>
              {distribution.map((_, idx) => (
                <Cell key={idx} fill={["#64748b", "#3b82f6", "#22d3ee", "#f59e0b", "#ef4444"][idx]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ─── Trend + Forecast ────────────────────────────────────────────── */}
      {selected && trendData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-4">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
            ◈ Тренд: {selected.nameRu}
          </h3>
          <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={1}>
            <AreaChart data={trendData}>
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
              <Area type="monotone" dataKey="bp" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#a78bfa" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#a78bfa" fillOpacity={0.05} />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#a78bfa" fillOpacity={0.05} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-2 text-[9px]">
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-cyan-400 inline-block" /> Исторические</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-purple-400 inline-block" style={{ borderStyle: "dashed" }} /> Прогноз</span>
          </div>
        </motion.div>
      )}

      {/* ─── Anomaly Detection ──────────────────────────────────────────── */}
      {anomalies.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
            ◈ Аномалии (БП ≠ экономика)
          </h3>
          <div className="space-y-1">
            {anomalies.map((c) => (
              <div key={c.isoCode} className="flex items-center justify-between text-[10px] py-1 px-2 rounded hover:bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{isoToFlag(c.isoCode)}</span>
                  <span className="text-slate-300">{c.nameRu}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">БП: {c.bpTotal.toFixed(1)}</span>
                  <span className="text-slate-500">Ожид: {c.expectedBP.toFixed(1)}</span>
                  <span className={c.type === "over" ? "text-emerald-400" : "text-red-400"}>
                    {c.anomaly > 0 ? "↑" : "↓"}{Math.abs(c.anomaly).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Power Concentration ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
          ◈ Концентрация мощи
        </h3>
        <div className="space-y-2">
          {concentration.map((c) => (
            <div key={c.group} className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-400 w-16">{c.group}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-tactical-primary"
                  style={{ width: `${Math.min(100, parseFloat(c.pct))}%` }}
                />
              </div>
              <span className="text-slate-300 w-10 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
