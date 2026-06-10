"use client";

import { useMemo, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import type { CountryCompareData } from "@/lib/comparison";import { isoToFlag, formatLargeNumber } from "@/lib/comparison";

// ─── Props ──────────────────────────────────────────────────────────────────
interface ComparisonTabProps {
  countries: CountryCompareData[];
  onRemoveCountry: (iso: string) => void;
  onAddCountry: (iso: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = ["#22d3ee", "#ef4444", "#f59e0b", "#a78bfa"];
const COMPONENTS = [
  { key: "bpWeapon", label: "W · Оружие" },
  { key: "bpManpower", label: "M · Люди" },
  { key: "bpLogistics", label: "L · Логистика" },
  { key: "bpC2", label: "C2 · Управление" },
  { key: "bpEconomy", label: "E · Экономика" },
  { key: "bpDoctrine", label: "D · Доктрина" },
  { key: "bpReadiness", label: "R · Боеготовность" },
  { key: "bpTerrain", label: "T · География" },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────
export function ComparisonTab({ countries, onRemoveCountry, onAddCountry }: ComparisonTabProps) {
  const [addQuery, setAddQuery] = useState("");

  // Radar data for all selected countries
  const radarData = useMemo(() => {
    return COMPONENTS.map((comp) => {
      const entry: Record<string, unknown> = { component: comp.label };
      countries.forEach((c) => {
        entry[c.nameRu] = c[comp.key] as number;
      });
      return entry;
    });
  }, [countries]);


  // Hardware comparison data
  const hardwareData = useMemo(() => {
    const metrics = [
      { key: "totalTanks", label: "Танки" },
      { key: "totalAircraft", label: "Авиация" },
      { key: "totalNavy", label: "ВМФ" },
      { key: "totalArtillery", label: "Артиллерия" },
    ];
    return metrics.map((m) => {
      const entry: Record<string, unknown> = { metric: m.label };
      countries.forEach((c) => {
        entry[`${c.nameRu}`] = (c as unknown as Record<string, unknown>)[m.key] as number ?? 0;
      });
      return entry;
    });
  }, [countries]);

  // Advantage analysis
  const advantages = useMemo(() => {
    if (countries.length < 2) return [];
    const results: string[] = [];
    COMPONENTS.forEach((comp) => {
      const best = countries.reduce((a, b) =>
        (b[comp.key] as number) > (a[comp.key] as number) ? b : a
      );
      const worst = countries.reduce((a, b) =>
        (b[comp.key] as number) < (a[comp.key] as number) ? b : a
      );
      const diff = (best[comp.key] as number) - (worst[comp.key] as number);
      if (diff > 5) {
        results.push(`${best.nameRu} лидирует в ${comp.label} (+${diff.toFixed(1)})`);
      }
    });
    return results;
  }, [countries]);

  if (countries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 font-mono text-xs">
        Выберите страны для сравнения
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {/* ─── Country Selector Row ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 flex-wrap">
        {countries.map((c, idx) => (
          <div
            key={c.isoCode}
            className="glass-panel rounded-md px-3 py-2 flex items-center gap-2"
            style={{ borderColor: `${COLORS[idx]}40` }}
          >
            <span className="text-sm">{isoToFlag(c.isoCode)}</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold" style={{ color: COLORS[idx] }}>
                {c.nameRu}
              </span>
              <span className="text-[9px] text-slate-400">
                БП: {c.bpTotal.toFixed(1)} · #{idx + 1}
              </span>
            </div>
            <button
              onClick={() => onRemoveCountry(c.isoCode)}
              className="text-slate-500 hover:text-red-400 text-xs ml-1"
            >
              ✕
            </button>
          </div>
        ))}
        {countries.length < 4 && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Добавить ISO..."
              className="w-24 bg-slate-950/80 border border-white/10 text-[10px] p-1.5 rounded outline-none focus:border-tactical-primary/50 text-slate-200 placeholder:text-slate-600"
              onKeyDown={(e) => {
                if (e.key === "Enter" && addQuery.trim()) {
                  onAddCountry(addQuery.trim().toUpperCase());
                  setAddQuery("");
                }
              }}
            />
          </div>
        )}
      </motion.div>

      {/* ─── Comparison Table ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-lg p-3 overflow-x-auto">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
          ◈ Сравнение компонентов
        </h3>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-1 text-slate-400 font-normal">Компонент</th>
              {countries.map((c, idx) => (
                <th key={c.isoCode} className="text-right py-1 font-bold" style={{ color: COLORS[idx] }}>
                  {c.nameRu}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPONENTS.map((comp) => {
              const vals = countries.map((c) => c[comp.key] as number);
              const maxVal = Math.max(...vals);
              const minVal = Math.min(...vals);
              return (
                <tr key={comp.key} className="border-b border-white/5">
                  <td className="py-1 text-slate-300">{comp.label}</td>
                  {countries.map((c, idx) => {
                    const val = c[comp.key] as number;
                    const delta = countries.length > 1 ? val - (countries[0][comp.key] as number) : 0;
                    const isMax = val === maxVal && countries.length > 1;
                    const isMin = val === minVal && countries.length > 1;
                    return (
                      <td key={idx} className="text-right py-1">
                        <span className={isMax ? "text-cyan-400 font-bold" : isMin ? "text-red-400" : "text-slate-300"}>
                          {val.toFixed(1)}
                        </span>
                        {idx > 0 && delta !== 0 && (
                          <span className={`ml-1 text-[8px] ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {delta > 0 ? "↑" : "↓"}{Math.abs(delta).toFixed(1)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="border-t border-tactical-primary/20 font-bold">
              <td className="py-1 text-tactical-primary">БП Всего</td>
              {countries.map((c, idx) => (
                <td key={idx} className="text-right py-1" style={{ color: COLORS[idx] }}>
                  {c.bpTotal.toFixed(1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </motion.div>

      {/* ─── Radar Chart Overlay ─────────────────────────────────────────── */}
      {countries.length >= 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-4">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
            ◈ Радар сравнения
          </h3>
          <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={1}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="component" tick={{ fill: "#94a3b8", fontSize: 9 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#475569", fontSize: 8 }} />
              {countries.map((c, idx) => (
                <Radar
                  key={c.isoCode}
                  name={c.nameRu}
                  dataKey={c.nameRu}
                  stroke={COLORS[idx]}
                  fill={COLORS[idx]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0e1520ee",
                  border: "1px solid #22d3ee40",
                  borderRadius: 8,
                  fontSize: 10,
                  fontFamily: "monospace",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ─── Hardware Comparison Bar Chart ────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-4">
        <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-3">
          ◈ Сравнение вооружений
        </h3>
        <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={1}>
          <BarChart data={hardwareData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
            {countries.map((c, idx) => (
              <Bar key={c.isoCode} dataKey={c.nameRu} fill={COLORS[idx]} />
            ))}
            <Tooltip
              contentStyle={{
                backgroundColor: "#0e1520ee",
                border: "1px solid #22d3ee40",
                borderRadius: 8,
                fontSize: 10,
                fontFamily: "monospace",
              }}
              formatter={(value: number | string | undefined) => formatLargeNumber(Number(value ?? 0))}
            />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ─── Advantage Analysis ──────────────────────────────────────────── */}
      {advantages.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel rounded-lg p-3">
          <h3 className="text-xs font-bold text-tactical-primary tracking-widest uppercase mb-2">
            ◈ Анализ преимуществ
          </h3>
          <div className="space-y-1">
            {advantages.map((text, idx) => (
              <div key={idx} className="text-[10px] text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400">▸</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
