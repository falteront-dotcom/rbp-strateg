"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
  X,
  GitCompareArrows,
  Trophy,
  ChevronDown,
  Shield,
  Users,
  Fuel,
  Radio,
  Landmark,
  BookOpen,
  AlertCircle,
  Mountain,
  Swords,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";import { COMPARISON_BP_COMPONENTS, COMPARISON_BP_LABELS, COMPARISON_BP_SHORT_LABELS, SIDE_STROKE_COLORS, SIDE_FILL_COLORS, SIDE_TEXT_CLASSES, SIDE_BG_CLASSES, isoToFlag, formatLargeNumber, getBPTierColor, getBPTierLabel, type CountryCompareData, type ComparisonResult, type MetricDelta } from "@/lib/comparison";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CountryComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  /** All countries from /api/countries, for selector population */
  allCountries: CountryCompareData[];
  /** Pre-selected ISO codes (e.g. from CountryCard's "Сравнить" button) */
  initialIsoCodes?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BP Component Icons Map
// ─────────────────────────────────────────────────────────────────────────────

const BP_ICONS: Record<string, React.ReactNode> = {
  bpWeapon: <Shield size={12} />,
  bpManpower: <Users size={12} />,
  bpLogistics: <Fuel size={12} />,
  bpC2: <Radio size={12} />,
  bpEconomy: <Landmark size={12} />,
  bpDoctrine: <BookOpen size={12} />,
  bpReadiness: <AlertCircle size={12} />,
  bpTerrain: <Mountain size={12} />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CountryComparison({
  isOpen,
  onClose,
  allCountries,
  initialIsoCodes,
}: CountryComparisonProps) {
  const [selectedIsoCodes, setSelectedIsoCodes] = useState<string[]>(
    initialIsoCodes?.slice(0, 4) ?? [],
  );
  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"radar" | "table" | "metrics">(
    "radar",
  );

  // ─── Fetch comparison from API ──────────────────────────────────────────
  const fetchComparison = useCallback(async () => {
    if (selectedIsoCodes.length < 2) return;

    setIsLoading(true);
    try {
      const params = selectedIsoCodes
        .map((iso) => `iso=${iso}`)
        .join("&");
      const res = await fetch(`/api/compare?${params}`);
      if (!res.ok) throw new Error("Comparison fetch failed");
      const data: ComparisonResult = await res.json();
      setComparisonResult(data);
    } catch {
      setComparisonResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIsoCodes]);

  // ─── Add / remove selectors ─────────────────────────────────────────────
  const addCountry = useCallback(() => {
    if (selectedIsoCodes.length >= 4) return;
    // Pick the first country not already selected
    const next = allCountries.find(
      (c) => !selectedIsoCodes.includes(c.isoCode),
    );
    if (next) {
      setSelectedIsoCodes((prev) => [...prev, next.isoCode]);
    }
  }, [selectedIsoCodes, allCountries]);

  const removeCountry = useCallback(
    (iso: string) => {
      setSelectedIsoCodes((prev) => prev.filter((c) => c !== iso));
      // Comparison result is stale whenever the country set changes
      setComparisonResult(null);
    },
    [],
  );

  const handleIsoChange = useCallback(
    (index: number, newIso: string) => {
      setSelectedIsoCodes((prev) => {
        const next = [...prev];
        next[index] = newIso;
        return next;
      });
      setComparisonResult(null);
    },
    [],
  );

  // ─── Derived data ───────────────────────────────────────────────────────
  const selectedCountries = useMemo(
    () =>
      selectedIsoCodes
        .map((iso) => allCountries.find((c) => c.isoCode === iso))
        .filter((c): c is CountryCompareData => c !== undefined),
    [selectedIsoCodes, allCountries],
  );

  // ─── Radar chart data ───────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (selectedCountries.length < 2) return [];

    return COMPARISON_BP_COMPONENTS.map((comp) => {
      const entry: Record<string, string | number> = {
        component: COMPARISON_BP_SHORT_LABELS[comp],
        fullMark: 100,
      };
      selectedCountries.forEach((country, idx) => {
        entry[`country${idx}`] = country[comp] as number;
      });
      return entry;
    });
  }, [selectedCountries]);

  // ─── BP bar chart data ──────────────────────────────────────────────────
  const barData = useMemo(() => {
    if (!comparisonResult) return [];

    return COMPARISON_BP_COMPONENTS.map((comp) => {
      const entry: Record<string, string | number> = {
        component: COMPARISON_BP_SHORT_LABELS[comp],
      };
      selectedCountries.forEach((country, idx) => {
        entry[`country${idx}`] = country[comp] as number;
      });
      return entry;
    });
  }, [comparisonResult, selectedCountries]);

  // ─── Country-specific radar keys for Recharts ────────────────────────────
  const radarKeys = useMemo(
    () => selectedCountries.map((_, idx) => `country${idx}`),
    [selectedCountries],
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[92vh] bg-slate-950 border border-tactical-accent/20 rounded-2xl shadow-2xl overflow-hidden glass-panel flex flex-col"
          >
            {/* ─── Header ──────────────────────────────────────────────── */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
              <div className="flex items-center gap-2 text-tactical-accent">
                <GitCompareArrows size={18} />
                <h2 className="font-black tracking-widest uppercase text-sm">
                  Сравнение Стран
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                aria-label="Close comparison"
              >
                <X size={20} />
              </button>
            </div>

            {/* ─── Country Selectors ───────────────────────────────────── */}
            <div className="p-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedIsoCodes.map((iso, idx) => {
                  const country = allCountries.find(
                    (c) => c.isoCode === iso,
                  );
                  const side = country?.side ?? "NEUTRAL";
                  const sideClass =
                    SIDE_TEXT_CLASSES[side] ?? SIDE_TEXT_CLASSES.NEUTRAL;
                  const bgClass =
                    SIDE_BG_CLASSES[side] ?? SIDE_BG_CLASSES.NEUTRAL;

                  return (
                    <div
                      key={iso}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                        bgClass,
                      )}
                    >
                      <span className="text-lg leading-none">
                        {isoToFlag(iso)}
                      </span>
                      <div className="relative">
                        <select
                          value={iso}
                          onChange={(e) =>
                            handleIsoChange(idx, e.target.value)
                          }
                          className="appearance-none bg-slate-900 border border-white/10 text-sm pl-2 pr-6 py-1 rounded outline-none text-white font-bold font-mono cursor-pointer"
                        >
                          {allCountries
                            .filter(
                              (c) =>
                                c.isoCode === iso ||
                                !selectedIsoCodes.includes(c.isoCode),
                            )
                            .map((c) => (
                              <option key={c.isoCode} value={c.isoCode}>
                                {c.nameRu} ({c.isoCode})
                              </option>
                            ))}
                        </select>
                        <ChevronDown
                          size={12}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
                        />
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-black tracking-widest",
                          sideClass,
                        )}
                      >
                        {side}
                      </span>
                      {selectedIsoCodes.length > 2 && (
                        <button
                          onClick={() => removeCountry(iso)}
                          className="ml-1 text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                          aria-label={`Remove ${iso}`}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {selectedIsoCodes.length < 4 && (
                  <button
                    onClick={addCountry}
                    className="px-3 py-2 border border-dashed border-white/15 rounded-lg text-white/40 hover:text-tactical-accent hover:border-tactical-accent/40 transition-all text-sm font-mono cursor-pointer"
                  >
                    + Добавить
                  </button>
                )}

                {/* Compare button */}
                <button
                  onClick={fetchComparison}
                  disabled={selectedIsoCodes.length < 2 || isLoading}
                  className={cn(
                    "ml-auto px-5 py-2 bg-tactical-accent text-slate-950 font-black uppercase tracking-widest text-xs rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer",
                    "shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                  )}
                >
                  <Swords size={14} />
                  {isLoading ? "Загрузка…" : "Сравнить"}
                </button>
              </div>
            </div>

            {/* ─── Results ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {comparisonResult ? (
                <div className="p-4 space-y-4">
                  {/* ─── Overall Winner Banner ──────────────────────────── */}
                  <OverallWinnerBanner result={comparisonResult} />

                  {/* ─── Tab Switcher ────────────────────────────────────── */}
                  <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                    {(
                      [
                        { key: "radar", label: "Радар", icon: <Shield size={12} /> },
                        { key: "table", label: "Таблица", icon: <TrendingUp size={12} /> },
                        { key: "metrics", label: "Метрики", icon: <AlertCircle size={12} /> },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-md text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          activeTab === tab.key
                            ? "bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/30"
                            : "text-white/40 hover:text-white/70 border border-transparent",
                        )}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* ─── Tab Content ─────────────────────────────────────── */}
                  <AnimatePresence mode="wait">
                    {activeTab === "radar" && (
                      <motion.div
                        key="radar"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Overlaid Radar Chart */}
                        <div className="w-full h-72 bg-slate-900/40 rounded-xl border border-tactical-accent/20 p-2 relative overflow-hidden">
                          <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                            <RadarChart
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                              data={radarData}
                            >
                              <PolarGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
                              <PolarAngleAxis
                                dataKey="component"
                                tick={{
                                  fill: "rgba(255,255,255,0.6)",
                                  fontSize: 9,
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: "bold",
                                }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                              />
                              {radarKeys.map((dataKey, idx) => {
                                const side =
                                  selectedCountries[idx]?.side ?? "NEUTRAL";
                                const stroke =
                                  SIDE_STROKE_COLORS[side] ??
                                  SIDE_STROKE_COLORS.NEUTRAL;
                                const fill =
                                  SIDE_FILL_COLORS[side] ??
                                  SIDE_FILL_COLORS.NEUTRAL;

                                return (
                                  <Radar
                                    key={dataKey}
                                    name={selectedCountries[idx]?.nameRu ?? `#${idx + 1}`}
                                    dataKey={dataKey}
                                    stroke={stroke}
                                    fill={fill}
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: stroke }}
                                  />
                                );
                              })}
                              <Legend
                                wrapperStyle={{
                                  fontSize: "10px",
                                  fontFamily: "var(--font-mono)",
                                }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* BP Bar Chart */}
                        <div className="w-full h-56 bg-slate-900/40 rounded-xl border border-tactical-accent/20 p-2 relative overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                            <BarChart data={barData} barCategoryGap="20%">
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.06)"
                              />
                              <XAxis
                                dataKey="component"
                                tick={{
                                  fill: "rgba(255,255,255,0.5)",
                                  fontSize: 8,
                                  fontFamily: "var(--font-mono)",
                                }}
                                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                              />
                              <YAxis
                                domain={[0, 100]}
                                tick={{
                                  fill: "rgba(255,255,255,0.4)",
                                  fontSize: 8,
                                  fontFamily: "var(--font-mono)",
                                }}
                                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "oklch(15% 0.02 240 / 95%)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: "8px",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "10px",
                                }}
                              />
                              {radarKeys.map((dataKey, idx) => {
                                const side =
                                  selectedCountries[idx]?.side ?? "NEUTRAL";
                                const color =
                                  SIDE_STROKE_COLORS[side] ??
                                  SIDE_STROKE_COLORS.NEUTRAL;
                                return (
                                  <Bar
                                    key={dataKey}
                                    dataKey={dataKey}
                                    name={selectedCountries[idx]?.nameRu ?? `#${idx + 1}`}
                                    radius={[3, 3, 0, 0]}
                                    fillOpacity={0.8}
                                  >
                                    {barData.map((_, cellIdx) => (
                                      <Cell key={cellIdx} fill={color} />
                                    ))}
                                  </Bar>
                                );
                              })}
                              <Legend
                                wrapperStyle={{
                                  fontSize: "10px",
                                  fontFamily: "var(--font-mono)",
                                }}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "table" && (
                      <motion.div
                        key="table"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ComparisonTable
                          result={comparisonResult}
                          countries={selectedCountries}
                        />
                      </motion.div>
                    )}

                    {activeTab === "metrics" && (
                      <motion.div
                        key="metrics"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <MetricsComparison
                          result={comparisonResult}
                          countries={selectedCountries}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* ─── Empty State ──────────────────────────────────────── */
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <GitCompareArrows
                    size={48}
                    className="text-tactical-accent/20 mb-4"
                  />
                  <p className="text-sm text-white/30 font-mono tracking-wider">
                    Выберите 2–4 страны и нажмите{" "}
                    <span className="text-tactical-accent font-bold">
                      Сравнить
                    </span>
                  </p>
                  {selectedIsoCodes.length >= 2 && !isLoading && (
                    <button
                      onClick={fetchComparison}
                      className="mt-4 px-6 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent font-bold tracking-widest text-xs rounded-lg hover:bg-tactical-accent/20 transition-all cursor-pointer uppercase"
                    >
                      <Swords size={14} className="inline mr-2" />
                      Запустить Сравнение
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

/** Overall winner banner at the top of results */
function OverallWinnerBanner({
  result,
}: {
  result: ComparisonResult;
}) {
  const { overallLeader, countries } = result;

  if (overallLeader === -1) {
    return (
      <div className="p-3 bg-tactical-accent/5 border border-tactical-accent/20 rounded-lg flex items-center gap-3">
        <Minus size={16} className="text-tactical-accent/60" />
        <span className="text-xs font-mono text-white/60 tracking-widest uppercase">
          Паритет — Боевой Потенциал равен
        </span>
      </div>
    );
  }

  const winner = countries[overallLeader];
  const side = winner.side ?? "NEUTRAL";
  const sideClass = SIDE_TEXT_CLASSES[side] ?? SIDE_TEXT_CLASSES.NEUTRAL;
  const bgClass = SIDE_BG_CLASSES[side] ?? SIDE_BG_CLASSES.NEUTRAL;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-3 border rounded-lg flex items-center gap-3",
        bgClass,
      )}
    >
      <Trophy size={18} className="text-tactical-accent" />
      <div className="flex items-center gap-2 flex-1">
        <span className="text-lg">{isoToFlag(winner.isoCode)}</span>
        <div>
          <span className={cn("text-sm font-black", sideClass)}>
            {winner.nameRu}
          </span>
          <span className="text-xs text-white/50 ml-2 font-mono">
            Лидер по БП
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-black font-mono text-white tabular-nums">
          {winner.bpTotal.toFixed(1)}
        </div>
        <div
          className={cn(
            "text-[9px] font-bold tracking-widest uppercase",
            getBPTierColor(winner.bpTotal),
          )}
        >
          {getBPTierLabel(winner.bpTotal)}
        </div>
      </div>
    </motion.div>
  );
}

/** Comparison table with color-coded deltas per component */
function ComparisonTable({
  result,
  countries,
}: {
  result: ComparisonResult;
  countries: CountryCompareData[];
}) {
  // Use the first pairwise deltas for the table (or combine all)
  const allDeltas = result.componentDeltas;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-tactical-secondary/60 tracking-widest uppercase py-2 px-3 text-[9px]">
              Компонент
            </th>
            {countries.map((c) => {
              const side = c.side ?? "NEUTRAL";
              const sideClass =
                SIDE_TEXT_CLASSES[side] ?? SIDE_TEXT_CLASSES.NEUTRAL;
              return (
                <th
                  key={c.isoCode}
                  className={cn(
                    "text-right py-2 px-3 text-[10px] font-black tracking-wider uppercase",
                    sideClass,
                  )}
                >
                  <span className="mr-1">{isoToFlag(c.isoCode)}</span>
                  {c.nameRu}
                </th>
              );
            })}
            <th className="text-center text-tactical-accent/60 tracking-widest uppercase py-2 px-3 text-[9px]">
              Δ
            </th>
            <th className="text-center text-tactical-secondary/40 tracking-widest uppercase py-2 px-3 text-[9px]">
              Лидер
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Total BP row */}
          <tr className="border-b border-white/5 bg-tactical-accent/5">
            <td className="py-2 px-3 font-bold text-tactical-accent tracking-wider uppercase">
              Итого БП
            </td>
            {countries.map((c) => (
              <td
                key={c.isoCode}
                className="text-right py-2 px-3 font-black text-sm text-white tabular-nums"
              >
                {c.bpTotal.toFixed(1)}
              </td>
            ))}
            <td className="text-center py-2 px-3 text-tactical-accent font-bold">
              {result.pairwiseResults.length > 0
                ? `${result.pairwiseResults[0].totalDelta > 0 ? "+" : ""}${result.pairwiseResults[0].totalDelta.toFixed(1)}`
                : "—"}
            </td>
            <td className="text-center py-2 px-3">
              {result.overallLeader >= 0 ? (
                <span className="text-tactical-accent">
                  <Trophy size={12} className="inline" />{" "}
                  {isoToFlag(countries[result.overallLeader].isoCode)}
                </span>
              ) : (
                <Minus size={12} className="inline text-white/30" />
              )}
            </td>
          </tr>

          {/* Component rows */}
          {COMPARISON_BP_COMPONENTS.map((comp, compIdx) => {
            const values = countries.map((c) => c[comp] as number);
            const maxVal = Math.max(...values);
            const minVal = Math.min(...values);

            // Get delta from first pairwise if available
            const delta = allDeltas[0]?.[compIdx];

            return (
              <tr
                key={comp}
                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-2 px-3 text-white/60 flex items-center gap-1.5">
                  {BP_ICONS[comp]}
                  <span className="tracking-wider uppercase text-[9px]">
                    {COMPARISON_BP_LABELS[comp]}
                  </span>
                </td>
                {countries.map((c) => {
                  const val = c[comp] as number;
                  const isMax = val === maxVal && maxVal !== minVal;
                  const isMin = val === minVal && maxVal !== minVal;

                  return (
                    <td
                      key={c.isoCode}
                      className={cn(
                        "text-right py-2 px-3 font-bold tabular-nums",
                        isMax
                          ? "text-green-400"
                          : isMin
                            ? "text-red-400"
                            : "text-white/70",
                      )}
                    >
                      {val.toFixed(1)}
                      {isMax && (
                        <TrendingUp
                          size={10}
                          className="inline ml-1 text-green-400/60"
                        />
                      )}
                      {isMin && (
                        <TrendingDown
                          size={10}
                          className="inline ml-1 text-red-400/60"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="text-center py-2 px-3">
                  {delta ? (
                    <span
                      className={cn(
                        "font-bold",
                        delta.delta > 0.5
                          ? "text-green-400"
                          : delta.delta < -0.5
                            ? "text-red-400"
                            : "text-white/30",
                      )}
                    >
                      {delta.delta > 0 ? "+" : ""}
                      {delta.delta.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
                <td className="text-center py-2 px-3">
                  {delta && delta.advantage >= 0 ? (
                    <span className={SIDE_TEXT_CLASSES[countries[delta.advantage].side] ?? "text-white/60"}>
                      {isoToFlag(countries[delta.advantage].isoCode)}
                    </span>
                  ) : (
                    <Minus size={10} className="inline text-white/20" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Key metrics comparison with color-coded winner indicators */
function MetricsComparison({
  result,
  countries,
}: {
  result: ComparisonResult;
  countries: CountryCompareData[];
}) {
  return (
    <div className="space-y-2">
      {result.metricDeltas.map((metric) => (
        <MetricRow
          key={metric.label}
          metric={metric}
          countries={countries}
        />
      ))}
    </div>
  );
}

/** Single metric row with visual comparison bars */
function MetricRow({
  metric,
  countries,
}: {
  metric: MetricDelta;
  countries: CountryCompareData[];
}) {
  const maxVal = Math.max(...metric.values, 1);

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 space-y-2">
      <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase font-bold">
        {metric.label}
      </div>
      <div className="space-y-1.5">
        {countries.map((c, idx) => {
          const val = metric.values[idx];
          const isWinner = metric.winner === idx;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          const side = c.side ?? "NEUTRAL";
          const strokeColor =
            SIDE_STROKE_COLORS[side] ?? SIDE_STROKE_COLORS.NEUTRAL;

          return (
            <div key={c.isoCode} className="flex items-center gap-2">
              <span className="text-xs w-6">{isoToFlag(c.isoCode)}</span>
              <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className="h-full rounded"
                  style={{
                    backgroundColor: strokeColor,
                    opacity: isWinner ? 0.7 : 0.35,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[9px] font-bold font-mono text-white tabular-nums">
                    {formatLargeNumber(val)} {metric.unit}
                  </span>
                </div>
              </div>
              {isWinner && (
                <Trophy
                  size={12}
                  className="text-tactical-accent shrink-0"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
