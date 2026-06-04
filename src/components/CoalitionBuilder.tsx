"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, Minus, Users, Swords, GitCompareArrows, Loader2 } from "lucide-react";
import {
  PREDEFINED_COALITIONS,
  COALITION_BP_COMPONENTS,
  COALITION_BP_LABELS,
  COALITION_TEXT_CLASSES,
  COALITION_BG_CLASSES,
  isoToFlag,
  aggregateCoalitionBP,
  compareCoalitions,
  type CoalitionBP,
  type CoalitionMember,
  type CoalitionComparison,
  type ISOCode,
} from "@/lib/coalitions";
import CoalitionCard from "./CoalitionCard";

/** Country row from /api/countries — minimal fields for the builder */
interface CountryOption {
  isoCode: string;
  nameRu: string;
  side: string;
  coalition: string | null;
  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
}

interface CoalitionBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-loaded country data from parent — avoids redundant /api/countries fetch */
  countries?: CountryOption[];
}

export function CoalitionBuilder({ isOpen, onClose, countries: countriesProp }: CoalitionBuilderProps) {
  /** All countries — use prop data if available, otherwise fetch */
  const [allCountries, setAllCountries] = useState<CountryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Selected ISO codes for custom coalition */
  const [selectedCodes, setSelectedCodes] = useState<ISOCode[]>([]);
  /** Custom coalition name */
  const [customName, setCustomName] = useState<string>("Custom");
  /** Search query */
  const [searchQuery, setSearchQuery] = useState<string>("");
  /** Predefined coalition results from API */
  const [predefinedResults, setPredefinedResults] = useState<CoalitionBP[]>([]);
  /** Active view: "builder" | "predefined" | "compare" */
  const [view, setView] = useState<"builder" | "predefined" | "compare">("predefined");
  /** Compare: two coalition keys */
  const [compareA, setCompareA] = useState<string>("NATO");
  const [compareB, setCompareB] = useState<string>("CSTO");

  /** Fetch countries (only if not provided via prop) and predefined coalitions on mount */
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function fetchData(): Promise<void> {
      setIsLoading(true);
      try {
        // Use prop data if available, otherwise fetch from API
        const countriesData = countriesProp ?? (await (await fetch("/api/countries")).json()) as CountryOption[];
        const coalitionsRes = await fetch("/api/coalitions");

        if (cancelled) return;

        const coalitionsData = (await coalitionsRes.json()) as CoalitionBP[];

        if (!cancelled) {
          setAllCountries(countriesData);
          setPredefinedResults(coalitionsData);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [isOpen, countriesProp]);

  /** Search-filtered list of countries NOT already selected */
  const filteredCountries = useMemo(() => {
    const selectedSet = new Set(selectedCodes);
    const q = searchQuery.toLowerCase().trim();
    return allCountries
      .filter((c) => {
        if (selectedSet.has(c.isoCode)) return false;
        if (!q) return true;
        return (
          c.nameRu.toLowerCase().includes(q) ||
          c.isoCode.toLowerCase().includes(q) ||
          c.side.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.bpTotal - a.bpTotal);
  }, [allCountries, selectedCodes, searchQuery]);

  /** Custom coalition aggregated from selectedCodes */
  const customCoalition = useMemo<CoalitionBP>(() => {
    const members: CoalitionMember[] = allCountries
      .filter((c) => selectedCodes.includes(c.isoCode))
      .map((c) => ({
        isoCode: c.isoCode,
        nameRu: c.nameRu,
        side: c.side,
        bpTotal: c.bpTotal,
        bpWeapon: c.bpWeapon,
        bpManpower: c.bpManpower,
        bpLogistics: c.bpLogistics,
        bpC2: c.bpC2,
        bpEconomy: c.bpEconomy,
        bpDoctrine: c.bpDoctrine,
        bpReadiness: c.bpReadiness,
        bpTerrain: c.bpTerrain,
      }));
    return aggregateCoalitionBP(customName, selectedCodes, members);
  }, [selectedCodes, customName, allCountries]);

  /** Coalition comparison result */
  const comparison = useMemo<CoalitionComparison | null>(() => {
    const coalitionA = predefinedResults.find((c) => c.name === compareA);
    const coalitionB = predefinedResults.find((c) => c.name === compareB);
    if (!coalitionA || !coalitionB) return null;
    return compareCoalitions(coalitionA, coalitionB);
  }, [predefinedResults, compareA, compareB]);

  /** Add a country to the custom coalition */
  const addCountry = useCallback((iso: ISOCode) => {
    setSelectedCodes((prev) => (prev.includes(iso) ? prev : [...prev, iso]));
  }, []);

  /** Remove a country from the custom coalition */
  const removeCountry = useCallback((iso: ISOCode) => {
    setSelectedCodes((prev) => prev.filter((c) => c !== iso));
  }, []);

  /** Load a predefined coalition into the builder */
  const loadPredefined = useCallback((name: string) => {
    const codes = PREDEFINED_COALITIONS.get(name);
    if (codes) {
      setSelectedCodes([...codes]);
      setCustomName(name);
      setView("builder");
    }
  }, []);

  /** Selected members sorted by BP */
  const selectedMembers = useMemo(
    () =>
      allCountries
        .filter((c) => selectedCodes.includes(c.isoCode))
        .sort((a, b) => b.bpTotal - a.bpTotal),
    [allCountries, selectedCodes],
  );

  if (!isOpen) return null;

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
            className="w-full max-w-6xl max-h-[90vh] glass-panel rounded-2xl overflow-hidden flex flex-col"
          >
            {/* ─── Header ─── */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-tactical-accent">
                  <Users size={18} />
                  <h2 className="font-black tracking-widest uppercase text-sm">
                    Анализ Коалиций
                  </h2>
                </div>
                {/* Total BP of custom coalition — large styled number */}
                {selectedCodes.length > 0 && (
                  <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
                    <span className="text-[8px] text-tactical-secondary/60 tracking-widest uppercase font-mono">
                      Total BP
                    </span>
                    <span
                      className="text-2xl font-black text-tactical-primary tabular-nums"
                      style={{ textShadow: "0 0 16px currentColor" }}
                    >
                      {customCoalition.totalBP.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View switcher */}
                {(["predefined", "builder", "compare"] as const).map((v) => {
                  const labels: Record<string, string> = {
                    predefined: "Коалиции",
                    builder: "Конструктор",
                    compare: "Сравнение",
                  };
                  const isActive = view === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer ${
                        isActive
                          ? "bg-tactical-accent/20 border border-tactical-accent/40 text-tactical-accent"
                          : "bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
                      }`}
                    >
                      {labels[v]}
                    </button>
                  );
                })}
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button
                  onClick={onClose}
                  className="p-1.5 text-white/40 hover:text-tactical-primary transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ─── Content ─── */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-tactical-secondary/60">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-sm font-bold tracking-widest uppercase">
                    Загрузка данных...
                  </span>
                </div>
              ) : (
                <>
                  {/* ═══ PREDEFINED VIEW ═══ */}
                  {view === "predefined" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {predefinedResults.map((coalition) => (
                        <div key={coalition.name} className="relative">
                          <CoalitionCard coalition={coalition} />
                          <button
                            onClick={() => loadPredefined(coalition.name)}
                            className="absolute top-2 right-2 z-10 p-1.5 bg-tactical-accent/10 hover:bg-tactical-accent/20 border border-tactical-accent/30 rounded-md transition-colors cursor-pointer"
                            title="Загрузить в конструктор"
                          >
                            <Plus size={12} className="text-tactical-accent" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ═══ BUILDER VIEW ═══ */}
                  {view === "builder" && (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-6 h-full min-h-[500px]">
                      {/* Left: Country search + list */}
                      <div className="flex flex-col gap-4">
                        {/* Predefined quick-add buttons */}
                        <div>
                          <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
                            Быстрое Добавление
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Array.from(PREDEFINED_COALITIONS.keys()).map((name) => {
                              const textCls = COALITION_TEXT_CLASSES[name] ?? "text-tactical-primary";
                              const bgCls = COALITION_BG_CLASSES[name] ?? "bg-tactical-primary/10 border-tactical-primary/30";
                              return (
                                <button
                                  key={name}
                                  onClick={() => loadPredefined(name)}
                                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all cursor-pointer border ${bgCls} ${textCls} hover:opacity-80`}
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                          <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-secondary/40"
                          />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск страны..."
                            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-md text-[11px] text-white placeholder-white/30 outline-none focus:border-tactical-primary/50 transition-colors font-mono"
                          />
                        </div>

                        {/* Country list */}
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.isoCode}
                              onClick={() => addCountry(c.isoCode)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 hover:border-tactical-primary/30 transition-all cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base leading-none">{isoToFlag(c.isoCode)}</span>
                                <span className="text-[10px] text-white/80 font-bold truncate">
                                  {c.nameRu}
                                </span>
                                <span
                                  className={`text-[8px] px-1.5 py-0.5 rounded border font-bold tracking-wider ${
                                    c.side === "NATO"
                                      ? "text-tactical-nato border-tactical-nato/30 bg-tactical-nato/10"
                                      : c.side === "RUS"
                                        ? "text-tactical-rus border-tactical-rus/30 bg-tactical-rus/10"
                                        : c.side === "CHINA"
                                          ? "text-tactical-china border-tactical-china/30 bg-tactical-china/10"
                                          : "text-slate-400 border-slate-400/30 bg-slate-400/10"
                                  }`}
                                >
                                  {c.side}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-tactical-primary font-bold tabular-nums">
                                  {c.bpTotal.toFixed(1)}
                                </span>
                                <Plus
                                  size={12}
                                  className="text-tactical-primary/40 group-hover:text-tactical-primary transition-colors"
                                />
                              </div>
                            </button>
                          ))}
                          {filteredCountries.length === 0 && (
                            <div className="text-center py-8 text-[10px] text-white/30 tracking-wider uppercase">
                              Ничего не найдено
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Coalition card + selected list */}
                      <div className="flex flex-col gap-4">
                        {/* Custom coalition name */}
                        <div>
                          <label className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-1 block">
                            Название Коалиции
                          </label>
                          <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-[11px] text-white outline-none focus:border-tactical-primary/50 transition-colors font-mono font-bold"
                          />
                        </div>

                        {/* Selected members */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
                              Выбранные Страны ({selectedCodes.length})
                            </span>
                            {selectedCodes.length > 0 && (
                              <button
                                onClick={() => setSelectedCodes([])}
                                className="text-[8px] text-red-400/60 hover:text-red-400 tracking-widest uppercase cursor-pointer transition-colors"
                              >
                                Очистить
                              </button>
                            )}
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {selectedMembers.map((c) => (
                              <div
                                key={c.isoCode}
                                className="flex items-center justify-between px-3 py-1.5 bg-tactical-primary/5 rounded-md border border-tactical-primary/20 hover:border-tactical-primary/40 transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm leading-none">{isoToFlag(c.isoCode)}</span>
                                  <span className="text-[10px] text-white/80 font-bold">
                                    {c.nameRu}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-tactical-primary font-bold tabular-nums">
                                    {c.bpTotal.toFixed(1)}
                                  </span>
                                  <button
                                    onClick={() => removeCountry(c.isoCode)}
                                    className="p-0.5 text-red-400/40 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                  >
                                    <Minus size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {selectedCodes.length === 0 && (
                              <div className="text-center py-6 text-[10px] text-white/20 tracking-wider uppercase">
                                Выберите страны из списка
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Running total preview */}
                        {selectedCodes.length > 0 && (
                          <div className="glass-panel rounded-lg p-3 border border-tactical-primary/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase">
                                Суммарный БП
                              </span>
                              <span
                                className="text-xl font-black text-tactical-primary tabular-nums"
                                style={{ textShadow: "0 0 12px currentColor" }}
                              >
                                {customCoalition.totalBP.toFixed(1)}
                              </span>
                            </div>
                            {/* Mini component bars */}
                            <div className="space-y-1">
                              {COALITION_BP_COMPONENTS.map((comp) => {
                                const val = customCoalition.componentScores[comp];
                                return (
                                  <div key={comp} className="flex items-center gap-2">
                                    <span className="text-[7px] text-tactical-secondary/40 tracking-wider uppercase w-16 truncate">
                                      {COALITION_BP_LABELS[comp]}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-tactical-primary/60 transition-all duration-300"
                                        style={{ width: `${Math.min(val, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-[8px] text-tactical-primary font-bold tabular-nums w-8 text-right">
                                      {val.toFixed(1)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Full coalition card */}
                        {selectedCodes.length > 0 && (
                          <div className="max-h-[360px] overflow-y-auto">
                            <CoalitionCard coalition={customCoalition} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ═══ COMPARE VIEW ═══ */}
                  {view === "compare" && (
                    <div className="flex flex-col gap-6">
                      {/* Coalition selectors */}
                      <div className="flex items-center justify-center gap-4">
                        <select
                          value={compareA}
                          onChange={(e) => setCompareA(e.target.value)}
                          className="bg-slate-950/80 border border-tactical-nato/30 text-sm p-2.5 rounded-md outline-none text-white font-bold focus:border-tactical-nato/50"
                        >
                          {predefinedResults.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.memberCount})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full border border-tactical-accent/30 bg-tactical-accent/10 flex items-center justify-center font-black text-tactical-accent text-xs italic shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                            VS
                          </div>
                        </div>

                        <select
                          value={compareB}
                          onChange={(e) => setCompareB(e.target.value)}
                          className="bg-slate-950/80 border border-tactical-rus/30 text-sm p-2.5 rounded-md outline-none text-white font-bold focus:border-tactical-rus/50"
                        >
                          {predefinedResults.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.memberCount})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Side-by-side cards */}
                      {comparison && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <CoalitionCard
                            coalition={comparison.coalitionA}
                            comparison={comparison}
                            side="A"
                          />
                          <CoalitionCard
                            coalition={comparison.coalitionB}
                            comparison={comparison}
                            side="B"
                          />
                        </div>
                      )}

                      {/* Overall delta banner */}
                      {comparison && (
                        <div className="glass-panel rounded-lg p-4 border border-white/10 text-center">
                          <div className="text-[9px] text-tactical-secondary/60 tracking-widest uppercase mb-2">
                            Общая Дельта
                          </div>
                          <div className="flex items-center justify-center gap-4">
                            <span className="text-xl font-black text-tactical-nato tabular-nums">
                              {comparison.coalitionA.totalBP.toFixed(1)}
                            </span>
                            <span
                              className={`text-lg font-black tabular-nums ${
                                comparison.overallAdvantage === "A"
                                  ? "text-tactical-nato"
                                  : comparison.overallAdvantage === "B"
                                    ? "text-tactical-rus"
                                    : "text-yellow-400"
                              }`}
                            >
                              {comparison.totalDelta > 0
                                ? `+${comparison.totalDelta.toFixed(1)}`
                                : comparison.totalDelta.toFixed(1)}
                            </span>
                            <span className="text-xl font-black text-tactical-rus tabular-nums">
                              {comparison.coalitionB.totalBP.toFixed(1)}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-center gap-6">
                            {comparison.componentDeltas.map((d) => (
                              <div
                                key={d.component}
                                className="flex flex-col items-center"
                              >
                                <span className="text-[7px] text-tactical-secondary/40 tracking-wider uppercase">
                                  {d.label}
                                </span>
                                <span
                                  className={`text-[10px] font-bold tabular-nums ${
                                    d.advantage === "A"
                                      ? "text-tactical-nato"
                                      : d.advantage === "B"
                                        ? "text-tactical-rus"
                                        : "text-white/40"
                                  }`}
                                >
                                  {d.delta > 0 ? "+" : ""}{d.delta.toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CoalitionBuilder;
