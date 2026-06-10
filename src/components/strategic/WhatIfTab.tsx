"use client";

// ─────────────────────────────────────────────────────────────────────────────
// What-If Scenario Analysis Tab
// РБП-Стратег 2.0 — Military HUD Style
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  X,
  FlaskConical,
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
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  Zap,
  AlertTriangle,
  Atom,
  Ban,
  UsersRound,
} from "lucide-react";
import {
  COMPARISON_BP_SHORT_LABELS,
  COMPARISON_BP_COMPONENTS,
  type ComparisonBPComponent,
  type CountryCompareData,
  isoToFlag,
  formatLargeNumber,
  getBPTierLabel,
  getBPTierColor,
} from "@/lib/comparison";
import {
  calculateWhatIf,
  DEFAULT_SCENARIO_PARAMS,
  SCENARIO_PRESETS,
  encodeScenarioToURL,
  decodeScenarioFromURL,
  getDeltaColor,
  formatDelta,
  formatDeltaPercent,
  formatRankChange,
  type ScenarioParams,
  type ScenarioResult,
  type ComponentDelta,
  type AllianceOption,
  type ScenarioPreset,
} from "@/lib/what-if-engine";
import type { BPComponent, CountryRawData } from "@/lib/bp/types";
import { BP_COMPONENTS } from "@/lib/bp/types";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface WhatIfTabProps {
  isOpen: boolean;
  onClose: () => void;
  allCountries: CountryCompareData[];
  initialIsoCode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BP Component icon map
// ─────────────────────────────────────────────────────────────────────────────

const BP_ICONS: Record<string, React.ReactNode> = {
  weapon: <Shield size={14} />,
  manpower: <Users size={14} />,
  logistics: <Fuel size={14} />,
  c2: <Radio size={14} />,
  economy: <Landmark size={14} />,
  doctrine: <BookOpen size={14} />,
  readiness: <AlertCircle size={14} />,
  terrain: <Mountain size={14} />,
};

/** Map ComparisonBPComponent → BPComponent */
const COMP_TO_BP: Record<ComparisonBPComponent, BPComponent> = {
  bpWeapon: "weapon",
  bpManpower: "manpower",
  bpLogistics: "logistics",
  bpC2: "c2",
  bpEconomy: "economy",
  bpDoctrine: "doctrine",
  bpReadiness: "readiness",
  bpTerrain: "terrain",
};

const ALLIANCE_OPTIONS: AllianceOption[] = [
  "NATO",
  "CSTO",
  "BRICS",
  "Neutral",
  "AUKUS",
];

const ALLIANCE_LABELS: Record<AllianceOption, string> = {
  NATO: "НАТО",
  CSTO: "ОДКБ",
  BRICS: "БРИКС",
  Neutral: "Нейтралитет",
  AUKUS: "AUKUS",
};

// ─────────────────────────────────────────────────────────────────────────────
// Slider component
// ─────────────────────────────────────────────────────────────────────────────

interface SliderControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  color?: string;
}

function SliderControl({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  color = "cyan",
}: SliderControlProps) {
  const percent: number =
    ((value - min) / (max - min)) * 100;
  const trackColor: string =
    color === "cyan"
      ? "bg-cyan-400"
      : color === "red"
        ? "bg-red-400"
        : "bg-amber-400";
  const isNegative: boolean = value < 0;
  const displayValue: string =
    value > 0 ? `+${Math.round(value * 100)}%` : `${Math.round(value * 100)}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-cyan-400/70">{icon}</span>
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <span
          className={cn(
            "text-[11px] font-mono font-bold",
            isNegative ? "text-red-400" : value > 0 ? "text-cyan-400" : "text-slate-400",
          )}
        >
          {displayValue}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none cursor-pointer
            bg-slate-700/50 rounded-full
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-cyan-400
            [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-cyan-300/50
            [&::-moz-range-thumb]:w-3.5
            [&::-moz-range-thumb]:h-3.5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-cyan-400
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:cursor-pointer"
        />
        <div
          className={cn(
            "absolute top-0 left-0 h-1.5 rounded-full pointer-events-none",
            trackColor,
            "opacity-40",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle component
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleControlProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onChange: (v: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
  description?: string;
}

function ToggleControl({
  label,
  icon,
  active,
  onChange,
  activeLabel = "ВКЛ",
  inactiveLabel = "ВЫКЛ",
  description,
}: ToggleControlProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-cyan-400" : "text-slate-500"}>
          {icon}
        </span>
        <div>
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
            {label}
          </span>
          {description && (
            <div className="text-[8px] font-mono text-slate-500 mt-0.5">
              {description}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!active)}
        className={cn(
          "relative w-10 h-5 rounded-full transition-all duration-200",
          active
            ? "bg-cyan-500/30 border border-cyan-400/50"
            : "bg-slate-700/30 border border-slate-600/30",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200",
            active
              ? "left-5.5 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
              : "left-0.5 bg-slate-500",
          )}
        />
        <span
          className={cn(
            "absolute text-[7px] font-mono top-0.5 font-bold",
            active
              ? "left-1 text-cyan-300"
              : "left-4 text-slate-500",
          )}
        >
          {active ? activeLabel : inactiveLabel}
        </span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function WhatIfTab({
  isOpen,
  onClose,
  allCountries,
  initialIsoCode,
}: WhatIfTabProps) {
  // ─── State ──────────────────────────────────────────────────────────
  const [selectedIso, setSelectedIso] = useState<string>(
    initialIsoCode ?? "USA",
  );
  const [params, setParams] = useState<ScenarioParams>({
    ...DEFAULT_SCENARIO_PARAMS,
  });
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeView, setActiveView] = useState<"radar" | "table" | "summary">(
    "radar",
  );
  const [copiedURL, setCopiedURL] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Close dropdown on outside click ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Load scenario from URL on mount ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const decoded = decodeScenarioFromURL(window.location.search);
    if (!decoded) return;
    const timer = window.setTimeout(() => {
      setSelectedIso(decoded.isoCode);
      setParams(decoded.params);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // ─── Selected country data ──────────────────────────────────────────
  const selectedCountry: CountryCompareData | undefined = useMemo(
    () => allCountries.find((c) => c.isoCode === selectedIso),
    [allCountries, selectedIso],
  );

  // ─── Convert CountryCompareData → CountryRawData for engine ──────────
  const selectedRawData: CountryRawData | undefined = useMemo(() => {
    if (!selectedCountry) return undefined;
    return {
      isoCode: selectedCountry.isoCode,
      name: selectedCountry.name,
      nameRu: selectedCountry.nameRu,
      side: selectedCountry.side as CountryRawData["side"],
      coalition: selectedCountry.coalition as CountryRawData["coalition"],
      areaKm2: selectedCountry.areaKm2,
      coastlineKm: selectedCountry.coastlineKm,
      climateZone: "temperate",
      gdpPppBn: selectedCountry.gdpPppBn,
      militaryBudgetBn: selectedCountry.militaryBudgetBn,
      defensePctGdp: selectedCountry.defensePctGdp,
      populationM: selectedCountry.populationM,
      activePersonnel: selectedCountry.activePersonnel,
      reservePersonnel: selectedCountry.reservePersonnel,
      fitForServiceM: selectedCountry.fitForServiceM,
      totalTanks: selectedCountry.totalTanks,
      totalAfv: selectedCountry.totalAfv,
      totalArtillery: selectedCountry.totalArtillery,
      totalMlrs: selectedCountry.totalMlrs,
      totalAircraft: selectedCountry.totalAircraft,
      totalHelicopters: selectedCountry.totalHelicopters,
      totalNavy: selectedCountry.totalNavy,
      submarines: selectedCountry.submarines,
      aircraftCarriers: selectedCountry.aircraftCarriers,
      nuclearWarheads: selectedCountry.nuclearWarheads,
      ports: selectedCountry.ports,
      airfields: selectedCountry.airfields,
      oilProductionKbd: selectedCountry.oilProductionKbd,
      merchantFleet: selectedCountry.merchantFleet,
      techLevel: selectedCountry.techLevel,
      moraleIndex: selectedCountry.moraleIndex,
      combatExperience: selectedCountry.combatExperience,
      c2Capability: selectedCountry.c2Capability,
      ewCapability: selectedCountry.ewCapability,
      updatedAt: new Date().toISOString(),
    };
  }, [selectedCountry]);

  // ─── All countries as raw data ───────────────────────────────────────
  const allRawData: CountryRawData[] = useMemo(
    () =>
      allCountries.map((c): CountryRawData => ({
        isoCode: c.isoCode,
        name: c.name,
        nameRu: c.nameRu,
        side: c.side as CountryRawData["side"],
        coalition: c.coalition as CountryRawData["coalition"],
        areaKm2: c.areaKm2,
        coastlineKm: c.coastlineKm,
        climateZone: "temperate",
        gdpPppBn: c.gdpPppBn,
        militaryBudgetBn: c.militaryBudgetBn,
        defensePctGdp: c.defensePctGdp,
        populationM: c.populationM,
        activePersonnel: c.activePersonnel,
        reservePersonnel: c.reservePersonnel,
        fitForServiceM: c.fitForServiceM,
        totalTanks: c.totalTanks,
        totalAfv: c.totalAfv,
        totalArtillery: c.totalArtillery,
        totalMlrs: c.totalMlrs,
        totalAircraft: c.totalAircraft,
        totalHelicopters: c.totalHelicopters,
        totalNavy: c.totalNavy,
        submarines: c.submarines,
        aircraftCarriers: c.aircraftCarriers,
        nuclearWarheads: c.nuclearWarheads,
        ports: c.ports,
        airfields: c.airfields,
        oilProductionKbd: c.oilProductionKbd,
        merchantFleet: c.merchantFleet,
        techLevel: c.techLevel,
        moraleIndex: c.moraleIndex,
        combatExperience: c.combatExperience,
        c2Capability: c.c2Capability,
        ewCapability: c.ewCapability,
        updatedAt: new Date().toISOString(),
      })),
    [allCountries],
  );

  // ─── Recalculate on param change ────────────────────────────────────
  useEffect(() => {
    if (!selectedRawData || allRawData.length === 0) return;

    // Debounce heavy calculation
    const timer = setTimeout(() => {
      setIsCalculating(true);
      try {
        const scenarioResult: ScenarioResult = calculateWhatIf(
          selectedRawData,
          allRawData,
          params,
        );
        setResult(scenarioResult);
      } catch {
        setResult(null);
      }
      setIsCalculating(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedRawData, allRawData, params]);

  // ─── Param setters ──────────────────────────────────────────────────
  const updateParam = useCallback(
    <K extends keyof ScenarioParams>(
      key: K,
      value: ScenarioParams[K],
    ): void => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetParams = useCallback((): void => {
    setParams({ ...DEFAULT_SCENARIO_PARAMS });
  }, []);

  const applyPreset = useCallback((preset: ScenarioPreset): void => {
    setParams({ ...preset.params });
  }, []);

  // ─── Copy URL ────────────────────────────────────────────────────────
  const copyScenarioURL = useCallback((): void => {
    const url: string = encodeScenarioToURL(selectedIso, params);
    navigator.clipboard.writeText(`${window.location.origin}${url}`).then(
      () => {
        setCopiedURL(true);
        setTimeout(() => setCopiedURL(false), 2000);
      },
    );
  }, [selectedIso, params]);

  // ─── Radar chart data ────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (!result) return [];

    return COMPARISON_BP_COMPONENTS.map(
      (comp: ComparisonBPComponent) => {
        const bpKey: BPComponent = COMP_TO_BP[comp];
        const before: number = result.baseBP.components[bpKey].weightedScore;
        const after: number = result.scenarioBP.components[bpKey].weightedScore;

        return {
          component: COMPARISON_BP_SHORT_LABELS[comp],
          before: Number(before.toFixed(2)),
          after: Number(after.toFixed(2)),
        };
      },
    );
  }, [result]);

  // ─── Sorted countries for dropdown (by BP desc) ─────────────────────
  const sortedCountries = useMemo(
    () => [...allCountries].sort((a, b) => b.bpTotal - a.bpTotal),
    [allCountries],
  );

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-y-0 right-0 w-[860px] z-50
            bg-[#0e1520]/95 backdrop-blur-xl
            border-l border-cyan-400/10
            flex flex-col overflow-hidden"
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3
            border-b border-cyan-400/10
            bg-gradient-to-r from-cyan-900/20 to-transparent">
            <div className="flex items-center gap-2.5">
              <FlaskConical size={18} className="text-cyan-400" />
              <h2 className="text-sm font-mono font-bold text-cyan-300 tracking-wider uppercase">
                Анализ Сценариев «Что Если»
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-cyan-400/10
                text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* ── Left: Parameters Panel ────────────────────────────── */}
            <div className="w-[310px] flex-shrink-0 border-r border-cyan-400/10
              overflow-y-auto p-4 space-y-4">

              {/* Country selector */}
              <div className="space-y-1.5" ref={dropdownRef}>
                <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Базовая Страна
                </label>
                <div className="relative">
                  <button
                    onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2
                      bg-slate-800/50 border border-cyan-400/15 rounded-md
                      text-xs font-mono text-slate-200
                      hover:border-cyan-400/30 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>{isoToFlag(selectedIso)}</span>
                      <span>
                        {selectedCountry?.nameRu ?? selectedCountry?.name ?? selectedIso}
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn(
                        "text-slate-500 transition-transform",
                        countryDropdownOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {countryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1
                          bg-slate-900/95 border border-cyan-400/15 rounded-md
                          max-h-48 overflow-y-auto z-10"
                      >
                        {sortedCountries.map((c) => (
                          <button
                            key={c.isoCode}
                            onClick={() => {
                              setSelectedIso(c.isoCode);
                              setCountryDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-1.5",
                              "text-[11px] font-mono text-slate-300",
                              "hover:bg-cyan-400/10 transition-colors",
                              c.isoCode === selectedIso &&
                                "bg-cyan-400/10 text-cyan-300",
                            )}
                          >
                            <span>{isoToFlag(c.isoCode)}</span>
                            <span className="flex-1 text-left">
                              {c.nameRu ?? c.name}
                            </span>
                            <span className="text-slate-500 text-[9px]">
                              БП {c.bpTotal.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-cyan-400/10" />

              {/* Sliders */}
              <div className="space-y-3">
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Параметры Сценария
                </div>

                <SliderControl
                  label="Воен. Бюджет"
                  icon={<Landmark size={14} />}
                  value={params.budgetChange}
                  min={-0.5}
                  max={1.0}
                  step={0.05}
                  unit="%"
                  onChange={(v) => updateParam("budgetChange", v)}
                />

                <SliderControl
                  label="Личный Состав"
                  icon={<UsersRound size={14} />}
                  value={params.personnelChange}
                  min={-0.5}
                  max={1.0}
                  step={0.05}
                  unit="%"
                  onChange={(v) => updateParam("personnelChange", v)}
                />

                <SliderControl
                  label="Танки"
                  icon={<Shield size={14} />}
                  value={params.tankChange}
                  min={-0.5}
                  max={1.0}
                  step={0.05}
                  unit="%"
                  onChange={(v) => updateParam("tankChange", v)}
                  color="red"
                />

                <SliderControl
                  label="Авиация"
                  icon={<Swords size={14} />}
                  value={params.aircraftChange}
                  min={-0.5}
                  max={1.0}
                  step={0.05}
                  unit="%"
                  onChange={(v) => updateParam("aircraftChange", v)}
                  color="red"
                />

                <SliderControl
                  label="Флот"
                  icon={<Fuel size={14} />}
                  value={params.navyChange}
                  min={-0.5}
                  max={1.0}
                  step={0.05}
                  unit="%"
                  onChange={(v) => updateParam("navyChange", v)}
                  color="red"
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-cyan-400/10" />

              {/* Alliance dropdown */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Альянс
                </label>
                <select
                  value={params.allianceSwitch ?? ""}
                  onChange={(e) =>
                    updateParam(
                      "allianceSwitch",
                      (e.target.value || null) as AllianceOption | null,
                    )
                  }
                  className="w-full px-3 py-1.5 rounded-md
                    bg-slate-800/50 border border-cyan-400/15
                    text-[11px] font-mono text-slate-200
                    focus:border-cyan-400/40 focus:outline-none
                    transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Без изменений</option>
                  {ALLIANCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {ALLIANCE_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-1">
                <ToggleControl
                  label="Ядерный Статус"
                  icon={<Atom size={14} />}
                  active={params.nuclearGain}
                  onChange={(v) => updateParam("nuclearGain", v)}
                  activeLabel="ЕСТЬ"
                  inactiveLabel="НЕТ"
                  description="Получить ядерное оружие"
                />

                <ToggleControl
                  label="Конфликт"
                  icon={<Swords size={14} />}
                  active={params.atWar}
                  onChange={(v) => updateParam("atWar", v)}
                  activeLabel="ВОЙНА"
                  inactiveLabel="МИР"
                  description="Мораль +2, экономика -10%"
                />

                <ToggleControl
                  label="Санкции"
                  icon={<Ban size={14} />}
                  active={params.sanctionsActive}
                  onChange={(v) => updateParam("sanctionsActive", v)}
                  activeLabel="ВВЕД"
                  inactiveLabel="НЕТ"
                  description="-30% экономика, -20% логистика"
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-cyan-400/10" />

              {/* Presets */}
              <div className="space-y-2">
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  Пресеты Сценариев
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {SCENARIO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md
                        bg-slate-800/40 border border-cyan-400/10
                        text-left hover:border-cyan-400/25
                        hover:bg-cyan-400/5 transition-all group"
                    >
                      <Zap
                        size={12}
                        className="text-cyan-400/50 group-hover:text-cyan-400
                          transition-colors flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-slate-300 group-hover:text-cyan-300 transition-colors">
                          {preset.nameRu}
                        </div>
                        <div className="text-[8px] font-mono text-slate-500">
                          {preset.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset + Copy */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={resetParams}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                    rounded-md border border-slate-600/30
                    text-[10px] font-mono text-slate-400 uppercase
                    hover:border-slate-500/50 hover:text-slate-300
                    transition-colors"
                >
                  <RotateCcw size={12} />
                  Сброс
                </button>
                <button
                  onClick={copyScenarioURL}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                    rounded-md border border-cyan-400/20
                    text-[10px] font-mono text-cyan-400/70 uppercase
                    hover:border-cyan-400/40 hover:text-cyan-400
                    transition-colors"
                >
                  {copiedURL ? <Check size={12} /> : <Copy size={12} />}
                  {copiedURL ? "Скопировано" : "Ссылка"}
                </button>
              </div>
            </div>

            {/* ── Right: Results Panel ────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isCalculating && (
                <div className="absolute inset-0 flex items-center justify-center
                  bg-[#0e1520]/50 z-10 pointer-events-none">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs">
                    <div className="w-4 h-4 border-2 border-cyan-400/30
                      border-t-cyan-400 rounded-full animate-spin" />
                    Пересчёт...
                  </div>
                </div>
              )}

              {result && selectedCountry ? (
                <>
                  {/* ── Summary banner ────────────────────────────────── */}
                  <div className="glass-panel rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {isoToFlag(selectedIso)}
                        </span>
                        <div>
                          <div className="text-sm font-mono font-bold text-slate-200">
                            {selectedCountry.nameRu ?? selectedCountry.name}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                            Результат Сценария
                          </div>
                        </div>
                      </div>

                      {/* Rank change */}
                      <div className="text-right">
                        <div className="text-lg font-mono font-bold">
                          <span
                            className={cn(
                              getDeltaColor(result.rankChange),
                              result.rankChange > 0
                                ? "text-cyan-400"
                                : result.rankChange < 0
                                  ? "text-red-400"
                                  : "text-slate-400",
                            )}
                          >
                            {formatRankChange(
                              result.baseRank,
                              result.scenarioRank,
                            )}
                          </span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-500 uppercase">
                          Изменение Ранга
                        </div>
                      </div>
                    </div>

                    {/* Total BP before/after */}
                    <div className="flex items-center justify-center gap-6 mt-3 pt-3
                      border-t border-cyan-400/10">
                      <div className="text-center">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                          Базовый БП
                        </div>
                        <div className="text-2xl font-mono font-bold text-slate-300">
                          {result.baseBP.totalBP.toFixed(2)}
                        </div>
                        <div
                          className={cn(
                            "text-[9px] font-mono",
                            getBPTierColor(result.baseBP.totalBP),
                          )}
                        >
                          {getBPTierLabel(result.baseBP.totalBP)}
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-cyan-400/40">→</span>
                        <span
                          className={cn(
                            "text-lg font-mono font-bold",
                            getDeltaColor(result.totalDelta),
                          )}
                        >
                          {formatDelta(result.totalDelta)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            getDeltaColor(result.totalDelta),
                          )}
                        >
                          {formatDeltaPercent(
                            result.baseBP.totalBP !== 0
                              ? (result.totalDelta / result.baseBP.totalBP) * 100
                              : 0,
                          )}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                          Сценарный БП
                        </div>
                        <div
                          className={cn(
                            "text-2xl font-mono font-bold",
                            getDeltaColor(result.totalDelta),
                          )}
                        >
                          {result.scenarioBP.totalBP.toFixed(2)}
                        </div>
                        <div
                          className={cn(
                            "text-[9px] font-mono",
                            getBPTierColor(result.scenarioBP.totalBP),
                          )}
                        >
                          {getBPTierLabel(result.scenarioBP.totalBP)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── View tabs ─────────────────────────────────────── */}
                  <div className="flex gap-1">
                    {(
                      [
                        { key: "radar", label: "Радар", icon: <Zap size={12} /> },
                        { key: "table", label: "Таблица", icon: <Swords size={12} /> },
                        { key: "summary", label: "Сводка", icon: <AlertCircle size={12} /> },
                      ] as const
                    ).map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => setActiveView(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md",
                          "text-[10px] font-mono uppercase tracking-wider",
                          "transition-all",
                          activeView === key
                            ? "bg-cyan-400/15 text-cyan-400 border border-cyan-400/30"
                            : "text-slate-500 border border-transparent hover:text-slate-300",
                        )}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Radar view ─────────────────────────────────────── */}
                  {activeView === "radar" && radarData.length > 0 && (
                    <div className="glass-panel rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Before radar */}
                        <div className="space-y-2">
                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-center">
                            Базовый Профиль
                          </div>
                          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1}>
                            <RadarChart
                              data={radarData}
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                            >
                              <PolarGrid
                                stroke="rgba(34,211,238,0.08)"
                                strokeDasharray="2 4"
                              />
                              <PolarAngleAxis
                                dataKey="component"
                                tick={{
                                  fill: "#94a3b8",
                                  fontSize: 9,
                                  fontFamily: "monospace",
                                }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, "auto"]}
                                tick={false}
                                axisLine={false}
                              />
                              <Radar
                                name="Базовый"
                                dataKey="before"
                                stroke="rgba(148,163,184,0.6)"
                                fill="rgba(148,163,184,0.15)"
                                strokeWidth={1.5}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* After radar */}
                        <div className="space-y-2">
                          <div className="text-[9px] font-mono text-cyan-400/70 uppercase tracking-widest text-center">
                            Сценарный Профиль
                          </div>
                          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1}>
                            <RadarChart
                              data={radarData}
                              cx="50%"
                              cy="50%"
                              outerRadius="70%"
                            >
                              <PolarGrid
                                stroke="rgba(34,211,238,0.08)"
                                strokeDasharray="2 4"
                              />
                              <PolarAngleAxis
                                dataKey="component"
                                tick={{
                                  fill: "#94a3b8",
                                  fontSize: 9,
                                  fontFamily: "monospace",
                                }}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, "auto"]}
                                tick={false}
                                axisLine={false}
                              />
                              <Radar
                                name="Сценарный"
                                dataKey="after"
                                stroke="rgba(34,211,238,0.7)"
                                fill="rgba(34,211,238,0.15)"
                                strokeWidth={1.5}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Overlay comparison */}
                      <div className="mt-2 pt-2 border-t border-cyan-400/10">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-center mb-2">
                          Наложение
                        </div>
                        <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={1}>
                          <RadarChart
                            data={radarData}
                            cx="50%"
                            cy="50%"
                            outerRadius="70%"
                          >
                            <PolarGrid
                              stroke="rgba(34,211,238,0.08)"
                              strokeDasharray="2 4"
                            />
                            <PolarAngleAxis
                              dataKey="component"
                              tick={{
                                fill: "#94a3b8",
                                fontSize: 9,
                                fontFamily: "monospace",
                              }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, "auto"]}
                              tick={false}
                              axisLine={false}
                            />
                            <Radar
                              name="Базовый"
                              dataKey="before"
                              stroke="rgba(148,163,184,0.4)"
                              fill="rgba(148,163,184,0.08)"
                              strokeWidth={1}
                              strokeDasharray="4 2"
                            />
                            <Radar
                              name="Сценарный"
                              dataKey="after"
                              stroke="rgba(34,211,238,0.7)"
                              fill="rgba(34,211,238,0.12)"
                              strokeWidth={2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* ── Table view ─────────────────────────────────────── */}
                  {activeView === "table" && (
                    <div className="glass-panel rounded-lg overflow-hidden">
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-cyan-400/10">
                            <th className="px-3 py-2 text-left text-[9px]
                              text-slate-500 uppercase tracking-widest">
                              Компонент
                            </th>
                            <th className="px-3 py-2 text-right text-[9px]
                              text-slate-500 uppercase tracking-widest">
                              Базовый
                            </th>
                            <th className="px-3 py-2 text-right text-[9px]
                              text-slate-500 uppercase tracking-widest">
                              Сценарный
                            </th>
                            <th className="px-3 py-2 text-right text-[9px]
                              text-slate-500 uppercase tracking-widest">
                              Δ
                            </th>
                            <th className="px-3 py-2 text-right text-[9px]
                              text-slate-500 uppercase tracking-widest">
                              Δ%
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.componentDeltas.map(
                            (delta: ComponentDelta) => (
                              <tr
                                key={delta.component}
                                className="border-b border-slate-700/30
                                  hover:bg-cyan-400/5 transition-colors"
                              >
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-cyan-400/50">
                                      {BP_ICONS[delta.component]}
                                    </span>
                                    <span className="text-slate-300">
                                      {delta.label}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right text-slate-400">
                                  {delta.before.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-300">
                                  {delta.after.toFixed(2)}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 text-right font-bold",
                                    getDeltaColor(delta.delta),
                                  )}
                                >
                                  <span className="flex items-center justify-end gap-1">
                                    {delta.delta > 0.01 ? (
                                      <TrendingUp size={10} />
                                    ) : delta.delta < -0.01 ? (
                                      <TrendingDown size={10} />
                                    ) : (
                                      <Minus size={10} />
                                    )}
                                    {formatDelta(delta.delta)}
                                  </span>
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 text-right",
                                    getDeltaColor(delta.delta),
                                  )}
                                >
                                  {formatDeltaPercent(delta.deltaPercent)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-cyan-400/20 bg-cyan-400/5">
                            <td className="px-3 py-2.5 font-bold text-slate-200">
                              ИТОГО БП
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-300">
                              {result.baseBP.totalBP.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-200 font-bold">
                              {result.scenarioBP.totalBP.toFixed(2)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2.5 text-right font-bold text-base",
                                getDeltaColor(result.totalDelta),
                              )}
                            >
                              {formatDelta(result.totalDelta)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2.5 text-right",
                                getDeltaColor(result.totalDelta),
                              )}
                            >
                              {formatDeltaPercent(
                                result.baseBP.totalBP !== 0
                                  ? (result.totalDelta / result.baseBP.totalBP) * 100
                                  : 0,
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* ── Summary view ───────────────────────────────────── */}
                  {activeView === "summary" && (
                    <div className="space-y-3">
                      {/* Active effects */}
                      <div className="glass-panel rounded-lg p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-3">
                          Активные Эффекты
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {params.budgetChange !== 0 && (
                            <EffectCard
                              icon={<Landmark size={14} />}
                              label="Бюджет"
                              value={`${params.budgetChange > 0 ? "+" : ""}${Math.round(params.budgetChange * 100)}%`}
                              impact={
                                params.budgetChange > 0
                                  ? "Экономика ↑ Оружие ↑"
                                  : "Экономика ↓ Оружие ↓"
                              }
                              positive={params.budgetChange > 0}
                            />
                          )}
                          {params.personnelChange !== 0 && (
                            <EffectCard
                              icon={<Users size={14} />}
                              label="Личный Состав"
                              value={`${params.personnelChange > 0 ? "+" : ""}${Math.round(params.personnelChange * 100)}%`}
                              impact={
                                params.personnelChange > 0
                                  ? "Л/С ↑ Готовность ↑"
                                  : "Л/С ↓ Готовность ↓"
                              }
                              positive={params.personnelChange > 0}
                            />
                          )}
                          {params.allianceSwitch !== null && (
                            <EffectCard
                              icon={<Shield size={14} />}
                              label={`Альянс: ${ALLIANCE_LABELS[params.allianceSwitch]}`}
                              value={params.allianceSwitch}
                              impact="Доктрина ↑ ЦУР ↑ Логистика ↑"
                              positive={true}
                            />
                          )}
                          {params.nuclearGain && (
                            <EffectCard
                              icon={<Atom size={14} />}
                              label="Ядерный Статус"
                              value={`+${params.nuclearWarheadsGained} БГ`}
                              impact="Оружие ↑↑ Технология ↑"
                              positive={true}
                            />
                          )}
                          {params.atWar && (
                            <EffectCard
                              icon={<Swords size={14} />}
                              label="Конфликт"
                              value="Активен"
                              impact="Мораль ↑2 Экономика ↓10%"
                              positive={false}
                            />
                          )}
                          {params.sanctionsActive && (
                            <EffectCard
                              icon={<Ban size={14} />}
                              label="Санкции"
                              value="Введены"
                              impact="Экономика ↓30% Логистика ↓20%"
                              positive={false}
                            />
                          )}
                          {params.tankChange !== 0 && (
                            <EffectCard
                              icon={<Shield size={14} />}
                              label="Танки"
                              value={`${params.tankChange > 0 ? "+" : ""}${Math.round(params.tankChange * 100)}%`}
                              impact={
                                params.tankChange > 0
                                  ? "Оружие ↑"
                                  : "Оружие ↓"
                              }
                              positive={params.tankChange > 0}
                            />
                          )}
                          {params.aircraftChange !== 0 && (
                            <EffectCard
                              icon={<AlertCircle size={14} />}
                              label="Авиация"
                              value={`${params.aircraftChange > 0 ? "+" : ""}${Math.round(params.aircraftChange * 100)}%`}
                              impact={
                                params.aircraftChange > 0
                                  ? "Оружие ↑"
                                  : "Оружие ↓"
                              }
                              positive={params.aircraftChange > 0}
                            />
                          )}
                          {params.navyChange !== 0 && (
                            <EffectCard
                              icon={<Fuel size={14} />}
                              label="Флот"
                              value={`${params.navyChange > 0 ? "+" : ""}${Math.round(params.navyChange * 100)}%`}
                              impact={
                                params.navyChange > 0
                                  ? "Оружие ↑"
                                  : "Оружие ↓"
                              }
                              positive={params.navyChange > 0}
                            />
                          )}
                          {params.budgetChange === 0 &&
                            params.personnelChange === 0 &&
                            params.allianceSwitch === null &&
                            !params.nuclearGain &&
                            !params.atWar &&
                            !params.sanctionsActive &&
                            params.tankChange === 0 &&
                            params.aircraftChange === 0 &&
                            params.navyChange === 0 && (
                              <div className="col-span-2 text-center py-6">
                                <AlertTriangle
                                  size={24}
                                  className="text-slate-600 mx-auto mb-2"
                                />
                                <div className="text-[10px] font-mono text-slate-500">
                                  Параметры не изменены — переместите слайдеры
                                  или выберите пресет
                                </div>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Key changes */}
                      <div className="glass-panel rounded-lg p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-3">
                          Ключевые Изменения
                        </div>
                        <div className="space-y-2">
                          {/* Top 3 deltas */}
                          {result.componentDeltas
                            .filter((d) => Math.abs(d.delta) > 0.01)
                            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                            .slice(0, 4)
                            .map((delta) => (
                              <div
                                key={delta.component}
                                className="flex items-center justify-between
                                  px-3 py-2 rounded-md bg-slate-800/30"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-cyan-400/50">
                                    {BP_ICONS[delta.component]}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-300">
                                    {delta.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {delta.before.toFixed(2)}
                                  </span>
                                  <span className="text-slate-600">→</span>
                                  <span
                                    className={cn(
                                      "text-[11px] font-mono font-bold",
                                      getDeltaColor(delta.delta),
                                    )}
                                  >
                                    {delta.after.toFixed(2)}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-mono",
                                      getDeltaColor(delta.delta),
                                    )}
                                  >
                                    {formatDelta(delta.delta)}
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Scenario URL share */}
                      <div className="glass-panel rounded-lg p-4">
                        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                          Экспорт Сценария
                        </div>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}${encodeScenarioToURL(selectedIso, params)}`}
                            className="flex-1 px-3 py-1.5 rounded-md bg-slate-900/50
                              border border-slate-700/30
                              text-[10px] font-mono text-slate-500
                              focus:outline-none"
                          />
                          <button
                            onClick={copyScenarioURL}
                            className={cn(
                              "px-4 py-1.5 rounded-md border",
                              "text-[10px] font-mono uppercase",
                              "transition-colors",
                              copiedURL
                                ? "bg-green-400/10 border-green-400/30 text-green-400"
                                : "bg-cyan-400/10 border-cyan-400/20 text-cyan-400/70 hover:text-cyan-400",
                            )}
                          >
                            {copiedURL ? "✓" : "Копировать"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* No result yet */
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <FlaskConical size={32} className="text-slate-700" />
                  <div className="text-xs font-mono text-slate-500 text-center">
                    Выберите страну и настройте параметры
                    <br />
                    для анализа сценария
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect card sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface EffectCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  impact: string;
  positive: boolean;
}

function EffectCard({
  icon,
  label,
  value,
  impact,
  positive,
}: EffectCardProps) {
  return (
    <div
      className={cn(
        "px-3 py-2.5 rounded-md border transition-colors",
        positive
          ? "bg-cyan-400/5 border-cyan-400/15"
          : "bg-red-400/5 border-red-400/15",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className={cn(
            positive ? "text-cyan-400/70" : "text-red-400/70",
          )}
        >
          {icon}
        </span>
        <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "text-sm font-mono font-bold",
          positive ? "text-cyan-400" : "text-red-400",
        )}
      >
        {value}
      </div>
      <div className="text-[8px] font-mono text-slate-500 mt-0.5">
        {impact}
      </div>
    </div>
  );
}
