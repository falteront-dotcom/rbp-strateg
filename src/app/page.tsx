"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Radio,
  Map as MapIcon,
  Crosshair,
  Search,
  X,
  ChevronRight,
  Users,
  GitCompareArrows,
} from "lucide-react";
import { exportCountryCSV, exportCountryJSON } from "@/lib/export";
import { Flag } from "@/components/Flag";
import { ActiveCompareWindow } from "@/components/ActiveCompareWindow";

import TacticalHUD from "@/components/TacticalHUD";
import dynamic from "next/dynamic";

const StrategicMap = dynamic(
  () => import("@/components/map/StrategicMap").then((m) => m.StrategicMap),
  { ssr: false }
);
import type { CountryBPData } from "@/components/map/ChoroplethLayer";
import type { AnalyticsLayerKey, CountryMapData } from "@/components/map";
import { LayerSelector } from "@/components/map/LayerSelector";
import CountryCard from "@/components/CountryCard";
import { CoalitionBuilder } from "@/components/CoalitionBuilder";
import CountryComparison from "@/components/CountryComparison";
import type { CountryCompareData } from "@/lib/comparison";
import { pickScoreFields } from "@/lib/country-detail-mapper";
import {
  BPDetailTab,
  EconomicsTab,
  MilitaryHardwareTab,
  CoalitionTab,
  ComparisonTab,
  AnalyticsTab,
  WhatIfTab,
  DoctrineTab,
  GeographyTab,
} from "@/components/strategic";
import { FacilitiesTab } from "@/components/strategic/FacilitiesTab";
import { HistoryTab } from "@/components/strategic/HistoryTab";
import { IndustryTab } from "@/components/strategic/IndustryTab";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AppMode = "strategic" | "tactical";
type StrategicTab = "summary" | "bp" | "economics" | "military" | "coalition" | "comparison" | "analytics" | "whatif" | "doctrine" | "geography" | "facilities" | "history" | "industry";

const STRATEGIC_TABS: { key: StrategicTab; label: string }[] = [
  { key: "summary", label: "Сводка" },
  { key: "bp", label: "Модель БП" },
  { key: "economics", label: "Экономика" },
  { key: "military", label: "Вооружение" },
  { key: "coalition", label: "Коалиции" },
  { key: "comparison", label: "Сравнение" },
  { key: "analytics", label: "Аналитика" },
  { key: "whatif", label: "Сценарий" },
  { key: "doctrine", label: "Доктрина" },
  { key: "geography", label: "География" },
  { key: "facilities", label: "Объекты" },
  { key: "history", label: "История" },
  { key: "industry", label: "ОПК" },
];

function StrategicDetailPanel({
  country,
  allCountries,
  onClose,
  onCompare,
  onLocateFacility,
}: {
  country: CountryData;
  allCountries: CountryCompareData[];
  onClose: () => void;
  onCompare: (iso: string) => void;
  onLocateFacility: (lat: number, lng: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<StrategicTab>("summary");
  const [showActiveCompare, setShowActiveCompare] = useState(false);
  const compareData = country as unknown as CountryCompareData;

  return (
    <div className="flex h-full flex-col" data-testid="country-detail-panel">
      <div className="border-b border-[#294138] bg-[#0a1712] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span data-testid="country-code" className="grid h-9 min-w-11 place-items-center border border-[#355146] bg-[#102621] px-2 font-mono text-xs font-semibold text-[#d8e4e7]">
              {country.isoCode}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[#eef3f4]">{country.nameRu || country.name}</h2>
              <p className="mt-0.5 font-mono text-[10px] text-[#7c9687]">{country.side} · {country.region}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onCompare(country.isoCode)} className="h-8 border border-[#355146] px-2.5 text-[10px] font-medium text-[#afc2c8] hover:border-[#5b7b87] hover:text-white">
              Сравнить
            </button>
            <button onClick={() => setShowActiveCompare(true)} aria-label="Активное сравнение" title="Активное сравнение — Δ факторы" className="grid h-8 w-8 place-items-center border border-[#355146] font-mono text-[11px] text-[#86a091] hover:border-[#5b7b87] hover:text-white">
              Δ
            </button>
            <button onClick={() => exportCountryCSV(compareData)} aria-label="Экспорт CSV" title="Экспорт CSV" className="grid h-8 w-8 place-items-center border border-[#355146] text-[#86a091] hover:border-[#5b7b87] hover:text-white">
              CSV
            </button>
            <button onClick={() => exportCountryJSON(compareData)} aria-label="Экспорт JSON" title="Экспорт JSON" className="grid h-8 w-8 place-items-center border border-[#355146] text-[#86a091] hover:border-[#5b7b87] hover:text-white">
              JSON
            </button>
            <button onClick={onClose} aria-label="Закрыть анализ страны" title="Закрыть" className="grid h-8 w-8 place-items-center text-[#86a091] hover:bg-[#172b35] hover:text-white">
              <X size={15} />
            </button>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Разделы анализа" className="sticky top-0 z-10 grid shrink-0 grid-cols-5 border-b border-[#294138] bg-[#0d2019]">
        {STRATEGIC_TABS.map((tab) => (
          <button
            role="tab"
            aria-selected={activeTab === tab.key}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-9 border-r border-b border-[#1e332a] px-1.5 py-1.5 text-[10px] leading-tight ${
              activeTab === tab.key
                ? "bg-[#173127] font-semibold text-[#5fc398]"
                : "text-[#86a091] hover:bg-[#132620] hover:text-[#d3dfe2]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4">
        {activeTab === "summary" && (
          <CountryCard country={country as any} onClose={onClose} onCompare={(iso: string) => onCompare(iso)} embedded />
        )}
        {activeTab === "bp" && (
          <BPDetailTab country={compareData as any} />
        )}
        {activeTab === "economics" && (
          <EconomicsTab country={compareData as any} />
        )}
        {activeTab === "military" && (
          <MilitaryHardwareTab country={compareData as any} />
        )}
        {activeTab === "coalition" && (
          <CoalitionTab country={compareData as any} allCountries={allCountries as any} />
        )}
        {activeTab === "comparison" && (
          <ComparisonTab
            countries={[compareData]}
            onRemoveCountry={() => {}}
            onAddCountry={() => {}}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab countries={allCountries} selectedISO={country.isoCode} />
        )}
        {activeTab === "whatif" && (
          <WhatIfTab isOpen={true} onClose={() => {}} allCountries={allCountries} initialIsoCode={country.isoCode} embedded />
        )}
        {activeTab === "doctrine" && (
          <DoctrineTab country={compareData as any} />
        )}
        {activeTab === "geography" && (
          <GeographyTab country={compareData as any} allCountries={allCountries} />
        )}
        {activeTab === "facilities" && (
          <FacilitiesTab isoCode={country.isoCode} onLocate={onLocateFacility} />
        )}
        {activeTab === "history" && (
          <HistoryTab isoCode={country.isoCode} />
        )}
        {activeTab === "industry" && (
          <IndustryTab isoCode={country.isoCode} />
        )}
        {showActiveCompare && (
          <ActiveCompareWindow
            a={compareData}
            allCountries={allCountries}
            onClose={() => setShowActiveCompare(false)}
          />
        )}
      </div>
    </div>
  );
}

/** Shape of the /api/countries response */
interface CountryData {
  isoCode: string;
  name: string;
  nameRu: string;
  side: string;
  coalition: string | null;
  region: string;

  areaKm2: number;
  coastlineKm: number;

  gdpPppBn: number;
  militaryBudgetBn: number;
  defensePctGdp: number;

  populationM: number;
  activePersonnel: number;
  reservePersonnel: number;

  totalTanks: number;
  totalAfv: number;
  totalArtillery: number;
  totalMlrs?: number;
  totalAircraft: number;
  totalHelicopters: number;
  totalNavy: number;
  aircraftCarriers?: number;
  submarines: number;
  nuclearWarheads: number;

  ports: number;
  airfields: number;
  oilProductionKbd: number;
  merchantFleet: number;

  fitForServiceM?: number;
  techLevel: number;
  moraleIndex: number;
  combatExperience: number;
  c2Capability: number;
  ewCapability: number;

  bpTotal: number;
  bpWeapon: number;
  bpManpower: number;
  bpLogistics: number;
  bpC2: number;
  bpEconomy: number;
  bpDoctrine: number;
  bpReadiness: number;
  bpTerrain: number;
  bpRank: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Side badge color map
// ─────────────────────────────────────────────────────────────────────────────

const SIDE_COLORS: Record<string, string> = {
  NATO: "text-tactical-nato",
  RUS: "text-tactical-rus",
  CHINA: "text-tactical-china",
  NEUTRAL: "text-slate-400",
};

const SIDE_DOT_COLORS: Record<string, string> = {
  NATO: "bg-tactical-nato",
  RUS: "bg-tactical-rus",
  CHINA: "bg-tactical-china",
  UKR: "bg-tactical-ukr",
  NEUTRAL: "bg-slate-400",
};

const SIDE_BAR_COLORS: Record<string, string> = {
  NATO: "side-bar-nato",
  RUS: "side-bar-rus",
  CHINA: "side-bar-china",
  UKR: "side-bar-ukr",
  NEUTRAL: "side-bar-neutral",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  // ─── State ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<AppMode>("strategic");
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── New integration state ─────────────────────────────────────────────
  const [coalitionBuilderOpen, setCoalitionBuilderOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [compareInitialIsos, setCompareInitialIsos] = useState<string[]>([]);
  const [activeLayer, setActiveLayer] = useState<AnalyticsLayerKey>("bp");
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; seq: number } | null>(null);

  // ─── Clock tick — mount-only to avoid hydration mismatch ───────────────
  useEffect(() => {
    setClock(new Date()); // set on mount (client-only)
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Fetch countries from API ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchData(): Promise<void> {
      try {
        const res = await fetch("/api/countries");
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data: CountryData[] = await res.json();
        if (!cancelled) {
          setCountries(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error("[page] Failed to fetch countries:", err);
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Adapt CountryData[] → CountryBPData[] for StrategicMap ────────────
  const mapBPData = useMemo<CountryBPData[]>(
    () =>
      countries.map((c) => ({
        iso: c.isoCode,
        name: c.nameRu,
        bpScore: c.bpTotal,
        bpRank: c.bpRank,
        region: c.region,
        alliance: c.coalition,
      })),
    [countries],
  );

  // ─── Adapt CountryData[] → CountryMapData[] for analytics layers ──────
  const countriesMapData = useMemo<CountryMapData[]>(
    () =>
      countries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        nameRu: c.nameRu,
        militaryBudgetBn: c.militaryBudgetBn,
        totalTanks: c.totalTanks,
        totalAircraft: c.totalAircraft,
        totalNavy: c.totalNavy,
        nuclearWarheads: c.nuclearWarheads,
        bpTotal: c.bpTotal,
      })),
    [countries],
  );

  // ─── Adapt CountryData[] → CountryCompareData[] for CountryComparison ─
  const countriesCompareData = useMemo<CountryCompareData[]>(
    () =>
      countries.map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        nameRu: c.nameRu,
        side: c.side,
        coalition: c.coalition,
        areaKm2: c.areaKm2,
        coastlineKm: c.coastlineKm,
        gdpPppBn: c.gdpPppBn,
        militaryBudgetBn: c.militaryBudgetBn,
        defensePctGdp: c.defensePctGdp,
        populationM: c.populationM,
        activePersonnel: c.activePersonnel,
        reservePersonnel: c.reservePersonnel,
        totalTanks: c.totalTanks,
        totalAfv: c.totalAfv,
        totalArtillery: c.totalArtillery,
        totalMlrs: c.totalMlrs ?? 0,
        totalAircraft: c.totalAircraft,
        totalHelicopters: c.totalHelicopters,
        totalNavy: c.totalNavy,
        aircraftCarriers: c.aircraftCarriers ?? 0,
        submarines: c.submarines,
        nuclearWarheads: c.nuclearWarheads,
        ports: c.ports,
        airfields: c.airfields,
        oilProductionKbd: c.oilProductionKbd,
        merchantFleet: c.merchantFleet,
        fitForServiceM: c.fitForServiceM ?? Math.round(c.populationM * 0.3),
        techLevel: c.techLevel,
        moraleIndex: c.moraleIndex,
        combatExperience: c.combatExperience,
        c2Capability: c.c2Capability,
        ewCapability: c.ewCapability,
        bpTotal: c.bpTotal,
        bpWeapon: c.bpWeapon,
        bpManpower: c.bpManpower,
        bpLogistics: c.bpLogistics,
        bpC2: c.bpC2,
        bpEconomy: c.bpEconomy,
        bpDoctrine: c.bpDoctrine,
        bpReadiness: c.bpReadiness,
        bpTerrain: c.bpTerrain,
      })),
    [countries],
  );

  // ─── Selected country ──────────────────────────────────────────────────
  const selectedCountry = useMemo<CountryData | null>(() => {
    const raw = countries.find((c) => c.isoCode === selectedISO);
    if (!raw) return null;
    return { ...raw, ...pickScoreFields(raw as unknown as Record<string, unknown>) } as CountryData;
  }, [countries, selectedISO]);

  // ─── Filtered country list for sidebar ─────────────────────────────────
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.nameRu.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q),
    );
  }, [countries, searchQuery]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleCountryClick = useCallback((iso: string) => {
    setSelectedISO(iso);
  }, []);

  const handleModeToggle = useCallback(() => {
    setMode((prev) => (prev === "strategic" ? "tactical" : "strategic"));
  }, []);

  const handleCloseCountryCard = useCallback(() => {
    setSelectedISO(null);
  }, []);

  const handleCompare = useCallback((iso: string) => {
    setCompareInitialIsos([iso]);
    setComparisonOpen(true);
  }, []);

  const handleCloseComparison = useCallback(() => {
    setComparisonOpen(false);
  }, []);

  const handleOpenCoalitionBuilder = useCallback(() => {
    setCoalitionBuilderOpen(true);
  }, []);

  const handleCloseCoalitionBuilder = useCallback(() => {
    setCoalitionBuilderOpen(false);
  }, []);

  const handleLayerChange = useCallback((layer: AnalyticsLayerKey) => {
    setActiveLayer(layer);
  }, []);

  // ─── Tactical Mode ─────────────────────────────────────────────────────
  if (mode === "tactical") {
    return (
      <main className="min-h-screen bg-tactical-bg">
        {/* Mode toggle overlay for tactical */}
        <div className="absolute top-4 left-4 z-[60]">
          <button
            onClick={handleModeToggle}
            className="glass-panel rounded-md px-4 py-2 font-mono text-[10px] tracking-widest uppercase text-tactical-primary hover:text-white hover:bg-tactical-primary/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <MapIcon size={14} />
            Стратегический Режим
          </button>
        </div>
        <TacticalHUD />
      </main>
    );
  }

  // ─── Strategic Mode (DEFAULT) ───────────────────────────────────────────
  return (
    <main className="h-screen w-screen bg-tactical-bg flex flex-col overflow-hidden font-sans text-slate-100">
      {/* ═══ TOP BAR ═══ */}
      <header className="glass-panel z-50 flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3 py-2 md:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-tactical-primary/10 rounded-sm">
              <Radio className="h-3.5 w-3.5 text-tactical-primary" />
            </div>
            <span className="text-sm font-semibold text-[#e5edef]">
              РБП Центр
            </span>
          </div>
          <div className="h-5 w-px bg-white/10" />
          <span className="hidden xl:inline text-[10px] font-mono text-tactical-primary/60 tracking-widest uppercase">
            Стратегический Режим
          </span>
          <span className="hidden xl:inline text-[10px] font-mono text-slate-400">АНАЛИТИЧЕСКАЯ МОДЕЛЬ</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-4">
          {/* ─── Layer Selector ─── */}
          <LayerSelector
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
          />

          <div className="hidden h-6 w-px bg-white/10 lg:block" />

          {/* Mode Toggle */}
          <button
            onClick={handleModeToggle}
            className="hidden lg:flex glass-panel rounded-md px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase text-tactical-accent/80 hover:text-tactical-accent hover:border-tactical-accent/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Crosshair size={12} />
            Тактический
          </button>

          <div className="hidden h-6 w-px bg-white/10 xl:block" />

          {/* Clock */}
          <div className="hidden xl:block text-right font-mono">
            <div className="text-[10px] text-slate-500">
              {clock ? clock.toLocaleDateString("ru-RU") : "\u2014"}
            </div>
            <div className="text-sm font-black text-white tabular-nums tracking-tight">
              {clock ? clock.toLocaleTimeString("ru-RU", { hour12: false }) : "--:--:--"}
            </div>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* ─── LEFT SIDEBAR: Country List ─── */}
        <nav className="hidden md:flex w-56 xl:w-64 glass-panel border-r border-white/5 flex flex-col shrink-0 z-30">
          {/* Search */}
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tactical-secondary/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск страны..."
                className="w-full bg-slate-950/80 border border-white/10 text-[11px] p-2 pl-8 rounded-md outline-none focus:border-tactical-primary/50 transition-all text-slate-200 placeholder:text-slate-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-tactical-primary cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-tactical-secondary/40 tracking-widest uppercase">
              <span>Стран: {filteredCountries.length}</span>
              <span>Рейтинг БП</span>
            </div>
          </div>

          {/* Country List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[10px] font-mono text-tactical-primary/50 tracking-widest uppercase animate-pulse">
                  Загрузка данных...
                </span>
              </div>
            ) : (
              <div className="py-1">
                {filteredCountries.map((country) => {
                  const isSelected = country.isoCode === selectedISO;
                  return (
                    <button
                      key={country.isoCode}
                      onClick={() => handleCountryClick(country.isoCode)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all cursor-pointer
                        border-l-2 hover:bg-white/5
                        ${
                          isSelected
                            ? "bg-tactical-primary/10 border-tactical-primary"
                            : SIDE_BAR_COLORS[country.side] ?? "side-bar-neutral"
                        }
                      `}
                    >
                      {/* BP Rank */}
                      <span className="text-[10px] font-bold tabular-nums text-tactical-secondary/40 w-5 shrink-0">
                        {country.bpRank}
                      </span>

                      {/* Side dot */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          SIDE_DOT_COLORS[country.side] ?? SIDE_DOT_COLORS.NEUTRAL
                        }`}
                      />

                      {/* Флаг государства */}
                      <Flag iso={country.isoCode} className="ml-0.5" />

                      {/* Country name */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-slate-200 truncate">
                          {country.nameRu}
                        </div>
                        <div className="text-[10px] text-tactical-secondary/40 tracking-wider">
                          {country.isoCode} · {country.region}
                        </div>
                      </div>

                      {/* BP score */}
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[11px] font-bold tabular-nums ${
                            SIDE_COLORS[country.side] ?? SIDE_COLORS.NEUTRAL
                          }`}
                        >
                          {country.bpTotal.toFixed(1)}
                        </span>
                      </div>

                      {/* Chevron if selected */}
                      {isSelected && (
                        <ChevronRight
                          size={10}
                          className="text-tactical-primary shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Footer: Coalition summary + action buttons */}
          <div className="p-3 border-t border-white/5 space-y-2">
            {/* Coalition summary grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {(["NATO", "RUS", "CHINA"] as const).map((side) => {
                const sideCountries = countries.filter(
                  (c) => c.side === side,
                );
                const avgBP =
                  sideCountries.length > 0
                    ? sideCountries.reduce((s, c) => s + c.bpTotal, 0) /
                      sideCountries.length
                    : 0;
                return (
                  <div
                    key={side}
                    className="flex flex-col items-center bg-white/5 rounded p-1.5 border border-white/5"
                  >
                    <span
                      className={`text-[10px] font-bold ${SIDE_COLORS[side]}`}
                    >
                      {side}
                    </span>
                    <span className="text-[10px] font-bold tabular-nums text-white/70">
                      {avgBP.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-tactical-secondary/30">
                      {sideCountries.length} стран
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action buttons row */}
            <div className="flex gap-1.5">
              <button
                onClick={handleOpenCoalitionBuilder}
                aria-label="Открыть анализ коалиций"
                className="flex-1 py-2 bg-tactical-accent/5 hover:bg-tactical-accent/15 border border-tactical-accent/20 hover:border-tactical-accent/40 text-tactical-accent/70 hover:text-tactical-accent font-bold tracking-widest text-[10px] rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase"
              >
                <Users size={11} />
                Коалиции
              </button>
              <button
                aria-label="Открыть сравнение стран"
                onClick={() => {
                  if (selectedISO) {
                    setCompareInitialIsos([selectedISO]);
                  }
                  setComparisonOpen(true);
                }}
                className={`flex-1 py-2 border font-bold tracking-widest text-[10px] rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase ${
                  selectedISO
                    ? "bg-tactical-primary/5 hover:bg-tactical-primary/15 border-tactical-primary/20 hover:border-tactical-primary/40 text-tactical-primary/70 hover:text-tactical-primary"
                    : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                <GitCompareArrows size={11} />
                Сравнить{selectedISO ? "" : "*"}
              </button>
            </div>
          </div>
        </nav>

        {/* ─── CENTER: Strategic Map ─── */}
        <div className="flex-1 relative min-w-0">
          {/* Scanline overlay (CSS only) */}
          <div className="map-scanline-overlay" />

          <StrategicMap
            countryBPData={mapBPData}
            selectedISO={selectedISO}
            onCountryClick={handleCountryClick}
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
            showInspector={!selectedCountry}
            countriesRaw={countriesMapData}
            focusPoint={mapFocus}
            className="absolute inset-0"
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-tactical-bg/80">
              <div className="glass-panel rounded-md px-6 py-3 font-mono text-xs text-tactical-primary tracking-widest uppercase">
                <span className="animate-pulse">Загрузка геоданных...</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT SIDEBAR: Country Detail Panel with Tabs ─── */}
        <aside className={`${selectedCountry ? "block" : "hidden"} absolute bottom-0 left-0 right-0 h-[46dvh] lg:static lg:h-auto lg:w-96 xl:w-[26rem] bg-[#0d2019] border-l border-[#294138] shrink-0 z-30 overflow-hidden country-panel-enter`}>
          {selectedCountry ? (
            <StrategicDetailPanel
              country={selectedCountry}
              allCountries={countriesCompareData}
              onClose={handleCloseCountryCard}
              onCompare={handleCompare}
              onLocateFacility={(lat, lng) => setMapFocus((prev) => ({ lat, lng, seq: (prev?.seq ?? 0) + 1 }))}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="p-4 rounded-full bg-tactical-primary/5 border border-tactical-primary/10 mb-4">
                <MapIcon size={28} className="text-tactical-primary/30" />
              </div>
              <h3 className="text-[11px] font-bold text-tactical-secondary/50 tracking-widest uppercase">
                Выберите Страну
              </h3>
              <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                Нажмите на страну на карте или выберите из списка слева для
                отображения детальной аналитики боевого потенциала
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Coalition Builder Modal */}
      <CoalitionBuilder
        isOpen={coalitionBuilderOpen}
        onClose={handleCloseCoalitionBuilder}
        countries={countries}
      />

      {/* Country Comparison Modal */}
      <CountryComparison
        isOpen={comparisonOpen}
        onClose={handleCloseComparison}
        allCountries={countriesCompareData}
        initialIsoCodes={compareInitialIsos}
      />
    </main>
  );
}
